require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { after, test } = require("node:test");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const app = require("../src/app");
const Booking = require("../src/models/Booking");
const Station = require("../src/models/Station");
const Transaction = require("../src/models/Transaction");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 12).toLowerCase();
const fixtureUserIds = [];
const fixtureBookingIds = [];
const fixtureStationIds = [];
let server;
let baseUrl;
let user;
let otherUser;
let admin;
let userToken;
let otherToken;
let adminToken;
let station;

function listen(application) {
  return new Promise((resolve, reject) => {
    const httpServer = application.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.once("error", reject);
  });
}

async function request(path, { method = "GET", body, token, idempotencyKey } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function addUser(role, tag) {
  const created = await User.create({
    name: `Wallet test ${tag}`,
    email: `wallet-${tag}-${fixtureKey}@nexusarena.test`,
    passwordHash: await bcrypt.hash(`NexusTest-${fixtureKey}-Only`, 4),
    role,
    status: "active",
  });
  fixtureUserIds.push(created._id);
  await Wallet.create({ userId: created._id, balanceMinor: 0, currency: "INR", status: "active" });
  return created;
}

async function addBooking(owner, totalMinor) {
  const startAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  startAt.setSeconds(0, 0);
  const booking = await Booking.create({
    userId: owner._id,
    stationId: station._id,
    startAt,
    endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
    durationMinutes: 30,
    status: "pending",
    paymentStatus: "unpaid",
    priceSnapshot: {
      hourlyRateMinor: totalMinor * 2,
      subtotalMinor: totalMinor,
      discountMinor: 0,
      totalMinor,
    },
    currency: "INR",
  });
  fixtureBookingIds.push(booking._id);
  return booking;
}

test("wallet and financial APIs use replica-set transactions and idempotent ledger operations", { timeout: 120000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local replica-set database");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.setName, "rs0", "MongoDB must be configured as replica set rs0");
  assert.equal(hello.isWritablePrimary, true, "replica-set primary must accept transactions");
  await Promise.all([User.init(), Wallet.init(), Transaction.init(), Booking.init(), Station.init()]);

  admin = await addUser("admin", "admin");
  user = await addUser("user", "member");
  otherUser = await addUser("user", "other");
  adminToken = generateToken(admin);
  userToken = generateToken(user);
  otherToken = generateToken(otherUser);
  station = await Station.create({
    name: `Wallet Test Rig ${fixtureKey}`,
    code: `WLT${fixtureKey.toUpperCase()}`,
    type: "PC",
    hourlyRateMinor: 120000,
    currency: "INR",
    status: "active",
  });
  fixtureStationIds.push(station._id);
  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  await t.test("wallet retrieval, registration wallet, and authentication boundaries", async () => {
    assert.equal((await request("/api/v1/wallet")).status, 401);
    const initial = await request("/api/v1/wallet", { token: userToken });
    assert.equal(initial.status, 200);
    assert.equal(initial.body.data.wallet.balanceMinor, 0);
    assert.equal(initial.body.data.wallet.currency, "INR");
    assert.equal((await request("/api/v1/wallet?userId=" + otherUser.id, { token: userToken })).status, 400);
    assert.equal(initial.body.data.wallet.id, (await Wallet.findOne({ userId: user._id })).id);

    const email = `wallet-register-${fixtureKey}@nexusarena.test`;
    const registration = await request("/api/v1/auth/register", {
      method: "POST",
      body: { name: "Wallet Registration", email, phone: "+919876543210", password: `Register-${fixtureKey}` },
    });
    assert.equal(registration.status, 201);
    const registeredUser = await User.findOne({ email }).select("_id");
    assert.ok(registeredUser);
    fixtureUserIds.push(registeredUser._id);
    assert.ok(await Wallet.findOne({ userId: registeredUser._id }));
  });

  await t.test("simulated top-up validates amount and idempotency", async () => {
    assert.equal((await request("/api/v1/wallet/top-up", { method: "POST", token: userToken, body: { amountMinor: 1000 } })).status, 400);
    assert.equal((await request("/api/v1/wallet/top-up", { method: "POST", token: userToken, idempotencyKey: `invalid-${fixtureKey}`, body: { amountMinor: 0 } })).status, 400);
    assert.equal((await request("/api/v1/wallet/top-up", { method: "POST", token: userToken, idempotencyKey: `badamount-${fixtureKey}`, body: { amountMinor: 1.5 } })).status, 400);

    const first = await request("/api/v1/wallet/top-up", {
      method: "POST", token: userToken, idempotencyKey: `topup-${fixtureKey}-main`, body: { amountMinor: 100000 },
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.transaction.type, "top_up");
    assert.equal(first.body.data.transaction.status, "success");
    assert.equal(first.body.data.wallet.balanceMinor, 100000);
    const repeated = await request("/api/v1/wallet/top-up", {
      method: "POST", token: userToken, idempotencyKey: `topup-${fixtureKey}-main`, body: { amountMinor: 100000 },
    });
    assert.equal(repeated.status, 200);
    assert.equal(repeated.body.data.idempotent, true);
    assert.equal(repeated.body.data.wallet.balanceMinor, 100000);
    const altered = await request("/api/v1/wallet/top-up", {
      method: "POST", token: userToken, idempotencyKey: `topup-${fixtureKey}-main`, body: { amountMinor: 120000 },
    });
    assert.equal(altered.status, 409);
  });

  await t.test("booking charge is derived from snapshot and cannot be duplicated", async () => {
    const booking = await addBooking(user, 35000);
    assert.equal((await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST" })).status, 401);
    assert.equal((await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: userToken, body: { amountMinor: 1 } })).status, 400);
    const paid = await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: userToken });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.data.transaction.amountMinor, 35000);
    assert.equal(paid.body.data.booking.status, "confirmed");
    assert.equal(paid.body.data.booking.paymentStatus, "paid");
    assert.equal(paid.body.data.wallet.balanceMinor, 65000);
    const replay = await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: userToken });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data.idempotent, true);
    assert.equal(replay.body.data.wallet.balanceMinor, 65000);
    assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: "booking_charge" }), 1);
    assert.equal((await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: otherToken })).status, 404);

    const tooExpensive = await addBooking(user, 1000000);
    const before = await Wallet.findOne({ userId: user._id }).lean();
    assert.equal((await request(`/api/v1/bookings/${tooExpensive.id}/pay`, { method: "POST", token: userToken })).status, 409);
    assert.equal((await Wallet.findById(before._id).lean()).balanceMinor, before.balanceMinor);
  });

  await t.test("zero-price bookings confirm without creating a financial transaction", async () => {
    const booking = await addBooking(user, 0);
    const result = await request(`/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: userToken });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.booking.paymentStatus, "not_required");
    assert.equal(result.body.data.transaction, null);
    assert.equal(await Transaction.countDocuments({ bookingId: booking._id }), 0);
    assert.equal((await Wallet.findOne({ userId: user._id }).lean()).balanceMinor, 65000);
  });

  await t.test("paid cancellation refunds once in the same transaction", async () => {
    const booking = await Booking.findOne({ userId: user._id, paymentStatus: "paid" });
    const cancelled = await request(`/api/v1/bookings/${booking.id}/cancel`, {
      method: "PATCH", token: userToken, body: { reason: "Schedule changed" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.booking.paymentStatus, "refunded");
    assert.equal(cancelled.body.data.refund.amountMinor, 35000);
    assert.equal(cancelled.body.data.wallet.balanceMinor, 100000);
    assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: "booking_charge" }), 1);
    assert.equal(await Transaction.countDocuments({ bookingId: booking._id, type: "refund" }), 1);
    assert.equal((await request(`/api/v1/bookings/${booking.id}/cancel`, {
      method: "PATCH", token: userToken, body: { reason: "Repeat" },
    })).status, 409);
    assert.equal((await Booking.findById(booking._id).lean()).paymentStatus, "refunded");
  });

  await t.test("concurrent top-ups and charges serialize without duplicate credits or overspending", async () => {
    const key = `parallel-${fixtureKey}`;
    const concurrentTopUps = await Promise.all([1, 2].map(() => request("/api/v1/wallet/top-up", {
      method: "POST", token: otherToken, idempotencyKey: key, body: { amountMinor: 5000 },
    })));
    assert.ok(concurrentTopUps.every((result) => [200, 201].includes(result.status)));
    assert.equal((await Wallet.findOne({ userId: otherUser._id }).lean()).balanceMinor, 5000);
    assert.equal(await Transaction.countDocuments({ userId: otherUser._id, reference: { $regex: /^topup:/ } }), 1);

    const firstBooking = await addBooking(otherUser, 4000);
    const secondBooking = await addBooking(otherUser, 4000);
    const charges = await Promise.all([firstBooking, secondBooking].map((booking) => request(
      `/api/v1/bookings/${booking.id}/pay`, { method: "POST", token: otherToken }
    )));
    assert.equal(charges.filter((result) => result.status === 200).length, 1);
    assert.equal(charges.filter((result) => result.status === 409).length, 1);
    const finalWallet = await Wallet.findOne({ userId: otherUser._id }).lean();
    assert.equal(finalWallet.balanceMinor, 1000);
    assert.ok(finalWallet.balanceMinor >= 0);
    assert.equal(await Transaction.countDocuments({ userId: otherUser._id, type: "booking_charge" }), 1);
  });

  await t.test("transaction history is private, filtered, and paginated", async () => {
    assert.equal((await request("/api/v1/wallet/transactions?page=1", { token: otherToken })).status, 200);
    assert.equal((await request("/api/v1/wallet/transactions?userId=" + user.id, { token: otherToken })).status, 400);
    const history = await request("/api/v1/wallet/transactions?type=top_up&status=success&page=1&limit=1", { token: userToken });
    assert.equal(history.status, 200);
    assert.equal(history.body.data.pagination.limit, 1);
    assert.ok(history.body.data.pagination.total >= 1);
    assert.ok(history.body.data.transactions.every((item) => item.type === "top_up" && item.status === "success"));
    assert.equal("passwordHash" in history.body.data.transactions[0], false);
  });

  await t.test("admin adjustment is role-protected and reasoned", async () => {
    const body = { userId: otherUser._id.toString(), direction: "credit", amountMinor: 250, reason: `Test correction ${fixtureKey}` };
    const denied = await request("/api/v1/wallet/admin/adjustments", {
      method: "POST", token: userToken, idempotencyKey: `adjust-user-${fixtureKey}`, body,
    });
    assert.equal(denied.status, 403);
    const adjusted = await request("/api/v1/wallet/admin/adjustments", {
      method: "POST", token: adminToken, idempotencyKey: `adjust-admin-${fixtureKey}`, body,
    });
    assert.equal(adjusted.status, 201);
    assert.equal(adjusted.body.data.transaction.type, "adjustment");
    assert.equal(adjusted.body.data.transaction.description, body.reason);
    assert.equal(adjusted.body.data.wallet.balanceMinor, 1250);
    const replay = await request("/api/v1/wallet/admin/adjustments", {
      method: "POST", token: adminToken, idempotencyKey: `adjust-admin-${fixtureKey}`, body,
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.body.data.wallet.balanceMinor, 1250);
  });

  await t.test("failed ledger write rolls back the preceding wallet update", async () => {
    const wallet = await Wallet.findOne({ userId: user._id }).lean();
    const originalSave = Transaction.prototype.save;
    Transaction.prototype.save = async function failingLedgerSave(options) {
      if (this.type === "top_up" && this.amountMinor === 777) throw new Error("Injected ledger write failure");
      return originalSave.call(this, options);
    };
    try {
      const response = await request("/api/v1/wallet/top-up", {
        method: "POST", token: userToken, idempotencyKey: `rollback-${fixtureKey}`, body: { amountMinor: 777 },
      });
      assert.equal(response.status, 500);
    } finally {
      Transaction.prototype.save = originalSave;
    }
    assert.equal((await Wallet.findById(wallet._id).lean()).balanceMinor, wallet.balanceMinor);
    assert.equal(await Transaction.countDocuments({ userId: user._id, type: "top_up", amountMinor: 777 }), 0);
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    if (fixtureBookingIds.length) await Booking.deleteMany({ _id: { $in: fixtureBookingIds } });
    if (fixtureUserIds.length) {
      await Transaction.deleteMany({ userId: { $in: fixtureUserIds } });
      await Wallet.deleteMany({ userId: { $in: fixtureUserIds } });
      await User.deleteMany({ _id: { $in: fixtureUserIds } });
    }
    if (fixtureStationIds.length) await Station.deleteMany({ _id: { $in: fixtureStationIds } });
    await mongoose.disconnect();
  }
});
