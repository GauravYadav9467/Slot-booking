const { createHash } = require("node:crypto");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const MAX_MINOR = Number.MAX_SAFE_INTEGER;

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function topUpLimits() {
  const read = (name, fallback) => {
    const raw = process.env[name];
    if (raw === undefined || raw === "") return fallback;
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      throw createError("Wallet top-up configuration is invalid.", 500);
    }
    return Number(raw);
  };
  const min = read("WALLET_TOPUP_MIN_MINOR", 100);
  const max = read("WALLET_TOPUP_MAX_MINOR", 1000000);
  if (min < 1 || max < min) throw createError("Wallet top-up configuration is invalid.", 500);
  return { min, max };
}

async function inFinancialTransaction(work) {
  await Promise.all([Wallet.init(), Transaction.init(), Booking.init()]);
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      result = await work(session);
    }, {
      readPreference: "primary",
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function makeReference(scope, value) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${scope}:${digest}`;
}

function safeWallet(wallet) {
  return {
    id: wallet._id.toString(),
    balanceMinor: wallet.balanceMinor,
    currency: wallet.currency,
    status: wallet.status,
    updatedAt: new Date(wallet.updatedAt).toISOString(),
  };
}

function safeTransaction(transaction) {
  return {
    id: transaction._id.toString(),
    type: transaction.type,
    direction: transaction.direction,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    status: transaction.status,
    reference: transaction.reference,
    description: transaction.description,
    bookingId: transaction.bookingId ? transaction.bookingId.toString() : null,
    createdAt: new Date(transaction.createdAt).toISOString(),
  };
}

function safeBooking(booking) {
  return {
    id: booking._id.toString(),
    userId: booking.userId.toString(),
    stationId: booking.stationId.toString(),
    startAt: new Date(booking.startAt).toISOString(),
    endAt: new Date(booking.endAt).toISOString(),
    status: booking.status,
    paymentStatus: booking.paymentStatus || "unpaid",
    transactionId: booking.transactionId ? booking.transactionId.toString() : null,
    refundTransactionId: booking.refundTransactionId ? booking.refundTransactionId.toString() : null,
    cancellationReason: booking.cancellationReason,
    priceSnapshot: {
      hourlyRateMinor: booking.priceSnapshot.hourlyRateMinor,
      subtotalMinor: booking.priceSnapshot.subtotalMinor,
      discountMinor: booking.priceSnapshot.discountMinor,
      totalMinor: booking.priceSnapshot.totalMinor,
    },
    currency: booking.currency,
  };
}

async function requireActiveWallet(userId, session) {
  const wallet = await Wallet.findOne({ userId }).session(session);
  if (!wallet) throw createError("Wallet not found.", 404);
  if (wallet.status !== "active") throw createError("This wallet is blocked.", 403);
  if (wallet.currency !== "INR" || !Number.isSafeInteger(wallet.balanceMinor) || wallet.balanceMinor < 0) {
    throw createError("Wallet financial data is inconsistent. Contact lounge staff.", 409);
  }
  return wallet;
}

function assertReplayMatches(transaction, { userId, type, amountMinor, bookingId, direction, description }) {
  const same = transaction.userId.toString() === userId.toString()
    && transaction.type === type
    && transaction.amountMinor === amountMinor
    && transaction.direction === direction
    && (transaction.bookingId ? transaction.bookingId.toString() : null) === (bookingId ? bookingId.toString() : null)
    && (description === undefined || transaction.description === description)
    && transaction.status === "success";
  if (!same) throw createError("This idempotency key has already been used for a different operation.", 409);
}

async function saveTransaction(data, session) {
  const transaction = new Transaction(data);
  await transaction.save({ session });
  return transaction;
}

async function getWallet(userId) {
  const wallet = await Wallet.findOne({ userId }).select("balanceMinor currency status updatedAt").lean();
  if (!wallet) throw createError("Wallet not found.", 404);
  return safeWallet(wallet);
}

async function getTransactions(userId, { type, status, page, limit }) {
  const filter = { userId };
  if (type) filter.type = type;
  if (status) filter.status = status;
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);
  return {
    transactions: items.map(safeTransaction),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function topUp(userId, amountMinor, idempotencyKey) {
  const { min, max } = topUpLimits();
  if (amountMinor < min || amountMinor > max) {
    throw createError(`Top-up amount must be between ${min} and ${max} paise.`, 400);
  }
  const reference = makeReference("topup", `${userId}:${idempotencyKey}`);
  const execute = () => inFinancialTransaction(async (session) => {
    const prior = await Transaction.findOne({ reference }).session(session);
    if (prior) {
      assertReplayMatches(prior, { userId, type: "top_up", amountMinor, direction: "credit", description: "Simulated wallet top-up" });
      const currentWallet = await requireActiveWallet(userId, session);
      return { transaction: safeTransaction(prior), wallet: safeWallet(currentWallet), idempotent: true };
    }

    const wallet = await requireActiveWallet(userId, session);
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, status: "active", balanceMinor: { $lte: MAX_MINOR - amountMinor } },
      { $inc: { balanceMinor: amountMinor } },
      { session, returnDocument: "after", runValidators: true }
    );
    if (!updatedWallet) throw createError("Wallet balance would exceed the supported integer limit.", 422);

    const transaction = await saveTransaction({
      walletId: wallet._id,
      userId,
      type: "top_up",
      direction: "credit",
      amountMinor,
      currency: wallet.currency,
      status: "success",
      reference,
      description: "Simulated wallet top-up",
    }, session);
    return { transaction: safeTransaction(transaction), wallet: safeWallet(updatedWallet), idempotent: false };
  });

  try {
    return await execute();
  } catch (error) {
    if (error.code !== 11000) throw error;
    const prior = await Transaction.findOne({ reference });
    if (!prior) throw error;
    assertReplayMatches(prior, { userId, type: "top_up", amountMinor, direction: "credit", description: "Simulated wallet top-up" });
    return { transaction: safeTransaction(prior), wallet: await getWallet(userId), idempotent: true };
  }
}

async function payBooking(bookingId, userId) {
  const reference = `booking-charge:${bookingId}`;
  return inFinancialTransaction(async (session) => {
    const prior = await Transaction.findOne({ reference }).session(session);
    if (prior) {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking || booking.userId.toString() !== userId) throw createError("Booking not found.", 404);
      assertReplayMatches(prior, {
        userId,
        type: "booking_charge",
        amountMinor: booking.priceSnapshot.totalMinor,
        direction: "debit",
        bookingId,
        description: "Wallet payment for booking",
      });
      if (booking.paymentStatus !== "paid" || booking.transactionId?.toString() !== prior._id.toString()) {
        throw createError("Booking payment state is inconsistent. Contact lounge staff.", 409);
      }
      return { booking: safeBooking(booking), transaction: safeTransaction(prior), wallet: safeWallet(await requireActiveWallet(userId, session)), idempotent: true };
    }

    const booking = await Booking.findOne({ _id: bookingId, userId }).session(session);
    if (!booking) throw createError("Booking not found.", 404);
    if (booking.status !== "pending" || (booking.paymentStatus || "unpaid") !== "unpaid") {
      throw createError("This booking is not eligible for payment.", 409);
    }
    if (booking.startAt <= new Date()) throw createError("A booking can only be paid before its start time.", 409);
    const amountMinor = booking.priceSnapshot.totalMinor;
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw createError("Booking price is not a valid paise amount.", 409);
    if (booking.currency !== "INR") throw createError("Booking currency is not supported for wallet payment.", 409);

    if (amountMinor === 0) {
      const freeBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, userId, status: "pending", paymentStatus: { $in: ["unpaid", null] } },
        { $set: { status: "confirmed", paymentStatus: "not_required" } },
        { session, returnDocument: "after", runValidators: true }
      );
      if (!freeBooking) throw createError("Booking is no longer eligible for confirmation.", 409);
      return { booking: safeBooking(freeBooking), transaction: null, wallet: null, idempotent: false };
    }

    const wallet = await requireActiveWallet(userId, session);
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, status: "active", balanceMinor: { $gte: amountMinor } },
      { $inc: { balanceMinor: -amountMinor } },
      { session, returnDocument: "after", runValidators: true }
    );
    if (!updatedWallet) throw createError("Wallet balance is insufficient for this booking.", 409);

    const transaction = await saveTransaction({
      walletId: wallet._id,
      userId,
      bookingId: booking._id,
      type: "booking_charge",
      direction: "debit",
      amountMinor,
      currency: wallet.currency,
      status: "success",
      reference,
      description: "Wallet payment for booking",
    }, session);

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, userId, status: "pending", paymentStatus: { $in: ["unpaid", null] } },
      { $set: { status: "confirmed", paymentStatus: "paid", transactionId: transaction._id } },
      { session, returnDocument: "after", runValidators: true }
    );
    if (!updatedBooking) throw createError("Booking is no longer eligible for payment.", 409);
    return { booking: safeBooking(updatedBooking), transaction: safeTransaction(transaction), wallet: safeWallet(updatedWallet), idempotent: false };
  });
}

async function cancelBooking(bookingId, viewer, reason) {
  return inFinancialTransaction(async (session) => {
    const ownerFilter = viewer.role === "admin" ? {} : { userId: viewer.userId };
    const booking = await Booking.findOne({ _id: bookingId, ...ownerFilter }).session(session);
    if (!booking) throw createError("Booking not found.", 404);
    if (!["pending", "confirmed"].includes(booking.status)) throw createError("Only pending or confirmed bookings can be cancelled.", 409);
    if (booking.startAt <= new Date()) throw createError("A booking cannot be cancelled after its start time.", 409);

    const cancellationReason = reason || `Cancelled by ${viewer.role}.`;
    const paid = booking.paymentStatus === "paid";
    let refundTransaction;
    let updatedWallet;
    if (paid) {
      if (!booking.transactionId) throw createError("Paid booking is missing its charge reference. Contact lounge staff.", 409);
      const charge = await Transaction.findOne({
        _id: booking.transactionId,
        bookingId: booking._id,
        userId: booking.userId,
        type: "booking_charge",
        direction: "debit",
        status: "success",
      }).session(session);
      if (!charge || charge.amountMinor !== booking.priceSnapshot.totalMinor) {
        throw createError("Booking charge record is inconsistent. Contact lounge staff.", 409);
      }
      const refundReference = `booking-refund:${booking._id}`;
      const priorRefund = await Transaction.findOne({ reference: refundReference }).session(session);
      if (priorRefund) throw createError("A refund has already been recorded for this booking.", 409);
      const wallet = await requireActiveWallet(booking.userId, session);
      if (wallet._id.toString() !== charge.walletId.toString()) throw createError("Booking wallet ownership is inconsistent. Contact lounge staff.", 409);
      updatedWallet = await Wallet.findOneAndUpdate(
        { _id: wallet._id, status: "active", balanceMinor: { $lte: MAX_MINOR - charge.amountMinor } },
        { $inc: { balanceMinor: charge.amountMinor } },
        { session, returnDocument: "after", runValidators: true }
      );
      if (!updatedWallet) throw createError("Refund would exceed the supported wallet balance limit.", 422);
      refundTransaction = await saveTransaction({
        walletId: wallet._id,
        userId: booking.userId,
        bookingId: booking._id,
        type: "refund",
        direction: "credit",
        amountMinor: charge.amountMinor,
        currency: wallet.currency,
        status: "success",
        reference: refundReference,
        description: "Wallet refund for cancelled booking",
      }, session);
    }

    const update = {
      status: "cancelled",
      cancellationReason,
      ...(paid ? { paymentStatus: "refunded", refundTransactionId: refundTransaction._id } : {}),
    };
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id, status: { $in: ["pending", "confirmed"] }, startAt: { $gt: new Date() }, ...ownerFilter },
      { $set: update },
      { session, returnDocument: "after", runValidators: true }
    );
    if (!updatedBooking) throw createError("This booking is no longer eligible for cancellation.", 409);
    return {
      booking: safeBooking(updatedBooking),
      ...(refundTransaction ? { refund: safeTransaction(refundTransaction), wallet: safeWallet(updatedWallet) } : {}),
    };
  });
}

async function adjustWallet({ userId, direction, amountMinor, reason }, idempotencyKey) {
  const reference = makeReference("adjustment", `${userId}:${idempotencyKey}`);
  return inFinancialTransaction(async (session) => {
    const prior = await Transaction.findOne({ reference }).session(session);
    if (prior) {
      assertReplayMatches(prior, { userId, type: "adjustment", amountMinor, direction, description: reason });
      return { transaction: safeTransaction(prior), wallet: safeWallet(await requireActiveWallet(userId, session)), idempotent: true };
    }
    if (!(await User.exists({ _id: userId }).session(session))) throw createError("User not found.", 404);
    const wallet = await requireActiveWallet(userId, session);
    const condition = direction === "credit"
      ? { balanceMinor: { $lte: MAX_MINOR - amountMinor } }
      : { balanceMinor: { $gte: amountMinor } };
    const delta = direction === "credit" ? amountMinor : -amountMinor;
    const updatedWallet = await Wallet.findOneAndUpdate(
      { _id: wallet._id, status: "active", ...condition },
      { $inc: { balanceMinor: delta } },
      { session, returnDocument: "after", runValidators: true }
    );
    if (!updatedWallet) throw createError(direction === "debit" ? "Wallet balance is insufficient for this adjustment." : "Wallet balance would exceed the supported integer limit.", direction === "debit" ? 409 : 422);
    const transaction = await saveTransaction({
      walletId: wallet._id,
      userId,
      type: "adjustment",
      direction,
      amountMinor,
      currency: wallet.currency,
      status: "success",
      reference,
      description: reason,
    }, session);
    return { transaction: safeTransaction(transaction), wallet: safeWallet(updatedWallet), idempotent: false };
  });
}

module.exports = {
  getWallet,
  getTransactions,
  topUp,
  payBooking,
  cancelBooking,
  adjustWallet,
};
