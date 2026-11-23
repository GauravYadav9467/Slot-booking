const { randomUUID } = require("node:crypto");
const Booking = require("../models/Booking");
const Station = require("../models/Station");
const StationReservationLock = require("../models/StationReservationLock");
const walletService = require("./walletService");

const activeStatuses = ["pending", "confirmed"];
const stationFields = "name code type status";
const userFields = "name email phone";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function lockDurationMs() {
  const raw = process.env.BOOKING_LOCK_TTL_MS;
  const value = raw === undefined || raw === "" ? 120000 : Number(raw);
  if (!/^\d+$/.test(String(raw ?? "120000")) || !Number.isSafeInteger(value) || value < 10000 || value > 600000) {
    throw createError("Booking lock configuration is invalid.", 500);
  }
  return value;
}

function calculatePrice(hourlyRateMinor, durationMinutes) {
  const numerator = hourlyRateMinor * durationMinutes;
  if (!Number.isSafeInteger(numerator)) {
    throw createError("The requested booking price exceeds supported limits.", 422);
  }

  const subtotalMinor = Math.ceil(numerator / 60);
  if (!Number.isSafeInteger(subtotalMinor)) {
    throw createError("The requested booking price exceeds supported limits.", 422);
  }

  return {
    hourlyRateMinor,
    subtotalMinor,
    discountMinor: 0,
    totalMinor: subtotalMinor,
  };
}

function relationId(value) {
  if (value === null || value === undefined) return null;
  if (value._id) return value._id.toString();
  return value.toString();
}

function safeBooking(booking, { includeUser = false } = {}) {
  const station = booking.stationId && booking.stationId.name
    ? {
        id: booking.stationId._id.toString(),
        name: booking.stationId.name,
        code: booking.stationId.code,
        type: booking.stationId.type,
        status: booking.stationId.status,
      }
    : undefined;
  const user = includeUser && booking.userId && booking.userId.name
    ? {
        id: booking.userId._id.toString(),
        name: booking.userId.name,
        email: booking.userId.email,
        phone: booking.userId.phone,
      }
    : undefined;

  const result = {
    id: booking._id.toString(),
    userId: relationId(booking.userId),
    stationId: relationId(booking.stationId),
    startAt: new Date(booking.startAt).toISOString(),
    endAt: new Date(booking.endAt).toISOString(),
    durationMinutes: booking.durationMinutes,
    status: booking.status,
    paymentStatus: booking.paymentStatus || "unpaid",
    priceSnapshot: {
      hourlyRateMinor: booking.priceSnapshot.hourlyRateMinor,
      subtotalMinor: booking.priceSnapshot.subtotalMinor,
      discountMinor: booking.priceSnapshot.discountMinor,
      totalMinor: booking.priceSnapshot.totalMinor,
    },
    currency: booking.currency,
    transactionId: relationId(booking.transactionId),
    refundTransactionId: relationId(booking.refundTransactionId),
    cancellationReason: booking.cancellationReason,
    createdAt: new Date(booking.createdAt).toISOString(),
    updatedAt: new Date(booking.updatedAt).toISOString(),
  };

  if (station) result.station = station;
  if (user) result.user = user;
  return result;
}

async function acquireStationLock(stationId) {
  const leaseMs = lockDurationMs();
  await StationReservationLock.init();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const now = new Date();
    const token = randomUUID();
    const expiresAt = new Date(now.getTime() + leaseMs);

    try {
      await StationReservationLock.create({ stationId, token, expiresAt });
      return token;
    } catch (error) {
      if (error.code !== 11000) throw error;
    }

    const reclaimed = await StationReservationLock.findOneAndUpdate(
      { stationId, expiresAt: { $lte: now } },
      { $set: { token, expiresAt } },
      { returnDocument: "after", runValidators: true }
    ).select("_id").lean();
    if (reclaimed) return token;

    if (!(await StationReservationLock.exists({ stationId }))) continue;
    throw createError("A reservation for this station is already being processed. Retry shortly.", 409);
  }

  throw createError("A reservation for this station is already being processed. Retry shortly.", 409);
}

async function assertStationLock(stationId, token) {
  const held = await StationReservationLock.exists({
    stationId,
    token,
    expiresAt: { $gt: new Date() },
  });
  if (!held) throw createError("The station reservation lock expired. Please retry.", 409);
}

async function releaseStationLock(stationId, token) {
  try {
    await StationReservationLock.deleteOne({ stationId, token });
  } catch (error) {
    console.error("Station reservation lock release deferred until expiry:", error.name || "Error");
  }
}

async function findOverlap(stationId, startAt, endAt) {
  return Booking.findOne({
    stationId,
    status: { $in: activeStatuses },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  }).select("_id").lean();
}

async function checkAvailability({ stationId, startAt, endAt, durationMinutes }) {
  const station = await Station.findById(stationId).select("name code type status hourlyRateMinor currency").lean();
  if (!station) throw createError("Station not found.", 404);

  const quote = calculatePrice(station.hourlyRateMinor, durationMinutes);
  const response = {
    stationId: station._id.toString(),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    durationMinutes,
    hourlyRateMinor: quote.hourlyRateMinor,
    estimatedTotalMinor: quote.totalMinor,
    currency: "INR",
    available: false,
  };

  if (station.status !== "active") {
    return { ...response, reason: "station_unavailable", message: "This station is not active." };
  }

  const lock = await StationReservationLock.exists({ stationId, expiresAt: { $gt: new Date() } });
  if (lock) {
    return { ...response, reason: "reservation_in_progress", message: "A reservation for this station is being processed." };
  }

  if (await findOverlap(stationId, startAt, endAt)) {
    return { ...response, reason: "time_conflict", message: "The station is already booked for part of this time." };
  }

  return { ...response, available: true, reason: null, message: "The station is available for this time." };
}

async function createBooking({ stationId, startAt, endAt, durationMinutes, userId }) {
  if (startAt <= new Date()) throw createError("startAt must be in the future.", 400);

  const token = await acquireStationLock(stationId);
  try {
    const station = await Station.findById(stationId).select("hourlyRateMinor status currency");
    if (!station) throw createError("Station not found.", 404);
    if (station.status !== "active") {
      throw createError("Bookings are only available for active stations.", 409);
    }

    if (await findOverlap(stationId, startAt, endAt)) {
      throw createError("The station is already booked for part of this time.", 409);
    }

    await assertStationLock(stationId, token);
    const priceSnapshot = calculatePrice(station.hourlyRateMinor, durationMinutes);
    const booking = await Booking.create({
      userId,
      stationId,
      startAt,
      endAt,
      durationMinutes,
      status: "pending",
      priceSnapshot,
      currency: "INR",
    });
    return safeBooking(booking);
  } finally {
    await releaseStationLock(stationId, token);
  }
}

function paginationResult(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

async function getMyBookings(userId, { status, page, limit }) {
  const filter = { userId };
  if (status) filter.status = status;
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("stationId", stationFields)
      .sort({ startAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings: bookings.map((booking) => safeBooking(booking)),
    pagination: paginationResult(page, limit, total),
  };
}

async function getBookingById(id, viewer) {
  const booking = await Booking.findById(id)
    .populate("stationId", stationFields)
    .populate("userId", userFields)
    .lean();
  if (!booking) throw createError("Booking not found.", 404);

  const isAdmin = viewer.role === "admin";
  if (!isAdmin && relationId(booking.userId) !== viewer.userId) {
    throw createError("Booking not found.", 404);
  }
  return safeBooking(booking, { includeUser: isAdmin });
}

async function cancelBooking(id, viewer, reason) {
  return walletService.cancelBooking(id, viewer, reason);
}

function adminBookingFilter({ status, stationId, from, to }) {
  const filter = {};
  if (status) filter.status = status;
  if (stationId) filter.stationId = stationId;
  if (from || to) {
    filter.startAt = {};
    if (from) filter.startAt.$gte = from;
    if (to) filter.startAt.$lt = to;
  }
  return filter;
}

async function getAdminBookings(query) {
  const filter = adminBookingFilter(query);
  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("stationId", stationFields)
      .populate("userId", userFields)
      .sort({ startAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings: bookings.map((booking) => safeBooking(booking, { includeUser: true })),
    pagination: paginationResult(query.page, query.limit, total),
  };
}

module.exports = {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAdminBookings,
};
