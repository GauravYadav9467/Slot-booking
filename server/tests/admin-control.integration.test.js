require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { test } = require("node:test");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const app = require("../src/app");
const Booking = require("../src/models/Booking");
const Notification = require("../src/models/Notification");
const Station = require("../src/models/Station");
const StationReservationLock = require("../src/models/StationReservationLock");
const Transaction = require("../src/models/Transaction");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
const userIds = [];
const stationIds = [];
let server;
let baseUrl;
let admin;
let customer;
let otherCustomer;
let blockedCustomer;
let adminToken;
let customerToken;

function listen(application) {
  return new Promise((resolve, reject) => {
    const httpServer = application.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.once("error", reject);
  });
}

async function request(path, { method = "GET", body, token, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders["content-type"] = "application/json";
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers: requestHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

async function addUser(role, label, status = "active") {
  const user = await User.create({
    name: `Admin control ${label} ${fixtureKey}`,
    email: `${label.toLowerCase()}-${fixtureKey}@nexusarena.test`,
    phone: `98${fixtureKey.slice(0, 8)}`,
    passwordHash: await bcrypt.hash(`NexusTest-${fixtureKey}-Only`, 4),
    role,
    status,
  });
  userIds.push(user._id);
  await Wallet.create({ userId: user._id, balanceMinor: 0, currency: "INR", status: "active" });
  return user;
}

async function addStation(status, label, hourlyRateMinor = 10000) {
  const station = await Station.create({ name: `${label} ${fixtureKey}`, code: `${label.slice(0, 4).toUpperCase()}${fixtureKey}`, type: "PC", hourlyRateMinor, currency: "INR", status });
  stationIds.push(station._id);
  return station;
}

function futureDateOffset(days) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function slot(date, time, duration = 60) {
  const startAt = new Date(`${date}T${time}:00+05:30`);
  return { startAt, endAt: new Date(startAt.getTime() + duration * 60000), durationMinutes: duration };
}

async function addBooking(userId, stationId, time, status = "confirmed") {
  const window = slot(futureDateOffset(1), time);
  return Booking.create({
    userId, stationId, ...window, status,
    paymentStatus: status === "cancelled" ? "refunded" : "paid",
    priceSnapshot: { hourlyRateMinor: 10000, subtotalMinor: 10000, discountMinor: 0, totalMinor: 10000 },
    currency: "INR",
    ...(status === "cancelled" ? { cancellationReason: "Customer schedule change" } : {}),
  });
}

test("owner APIs, station schedule, and registered-customer walk-in bookings", { timeout: 90000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local test database");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Booking.init(), Notification.init(), Station.init(), StationReservationLock.init(), Transaction.init(), User.init(), Wallet.init()]);
  admin = await addUser("admin", "admin");
  customer = await addUser("user", "customer");
  otherCustomer = await addUser("user", "other");
  blockedCustomer = await addUser("user", "blocked", "blocked");
  adminToken = generateToken(admin);
  customerToken = generateToken(customer);
  const active = await addStation("active", "Active");
  const maintenance = await addStation("maintenance", "Maintain");
  const inactive = await addStation("inactive", "Inactive");
  const concurrency = await addStation("active", "Concurrent");
  const booked = await addBooking(customer._id, active._id, "12:00");
  const cancelled = await addBooking(customer._id, active._id, "14:00", "cancelled");
  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await t.test("admin dashboard stats are database-backed and customer lookup is safe", async () => {
      const overview = await request("/api/v1/admin/overview", { token: adminToken });
      assert.equal(overview.status, 200);
      assert.ok(overview.body.data.overview.stations.total >= 4);
      assert.ok(overview.body.data.overview.bookings.total >= 2);
      assert.equal(typeof overview.body.data.overview.bookings.today, "number");
      assert.equal(typeof overview.body.data.overview.bookings.upcoming, "number");
      assert.ok(overview.body.data.overview.bookings.cancelled >= 1);

      const listing = await request(`/api/v1/admin/customers?search=${encodeURIComponent(customer.email)}`, { token: adminToken });
      assert.equal(listing.status, 200);
      assert.equal(listing.body.data.customers.length, 1);
      assert.equal(listing.body.data.customers[0].email, customer.email);
      assert.equal(Object.hasOwn(listing.body.data.customers[0], "passwordHash"), false);
      const wallet = await request(`/api/v1/admin/customers/${customer.id}/wallet`, { token: adminToken });
      assert.equal(wallet.status, 200);
      assert.equal(wallet.body.data.wallet.balanceMinor, 0);
      const invalidId = await request("/api/v1/admin/customers/not-an-object-id/wallet", { token: adminToken });
      assert.equal(invalidId.status, 400);
    });

    await t.test("admin calendar separates available, booked, maintenance and cancelled sessions", async () => {
      const query = new URLSearchParams({ date: futureDateOffset(1), durationMinutes: "60" });
      assert.equal((await request(`/api/v1/bookings/admin/availability?${query}`)).status, 401);
      assert.equal((await request(`/api/v1/bookings/admin/availability?${query}`, { token: customerToken })).status, 403);
      const result = await request(`/api/v1/bookings/admin/availability?${query}`, { token: adminToken });
      assert.equal(result.status, 200);
      const data = result.body.data;
      assert.equal(data.timeZone, "Asia/Kolkata");
      const activeSchedule = data.stations.find((station) => station.id === active.id);
      assert.equal(activeSchedule.slots.find((item) => item.time === "10:00").available, true);
      const bookedSlot = activeSchedule.slots.find((item) => item.time === "12:00");
      assert.equal(bookedSlot.available, false);
      assert.equal(bookedSlot.booking.id, booked.id);
      const maintenanceSchedule = data.stations.find((station) => station.id === maintenance.id);
      assert.equal(maintenanceSchedule.slots.find((item) => item.time === "10:00").reason, "station_unavailable");
      assert.ok(data.cancelledBookings.some((item) => item.id === cancelled.id));
      const invalid = await request(`/api/v1/bookings/admin/availability?date=${futureDateOffset(3)}`, { token: adminToken });
      assert.equal(invalid.status, 400);
    });

    await t.test("walk-in booking uses an active registered customer and stays unpaid", async () => {
      const window = slot(futureDateOffset(1), "10:00");
      const body = { userId: customer.id, stationId: active.id, startAt: window.startAt.toISOString(), endAt: window.endAt.toISOString() };
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", body, token: customerToken })).status, 403);
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", body })).status, 401);
      const created = await request("/api/v1/bookings/admin/walk-in", { method: "POST", body, token: adminToken });
      assert.equal(created.status, 201);
      const booking = created.body.data.booking;
      assert.equal(booking.userId, customer.id);
      assert.equal(booking.status, "pending");
      assert.equal(booking.paymentStatus, "unpaid");
      assert.equal(booking.priceSnapshot.totalMinor, 10000);
      assert.equal((await Wallet.findOne({ userId: customer._id })).balanceMinor, 0);
      assert.ok(await Notification.exists({ userId: customer._id, type: "booking_pending", relatedBookingId: booking.id }));
      assert.ok(await Notification.exists({ userId: admin._id, type: "admin_booking_created", relatedBookingId: booking.id }));
    });

    await t.test("walk-in validates customer, station, and overlapping slot without duplicate bookings", async () => {
      const overlap = slot(futureDateOffset(1), "12:00");
      const payload = (userId, stationId, window = overlap) => ({ userId, stationId, startAt: window.startAt.toISOString(), endAt: window.endAt.toISOString() });
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: payload(new mongoose.Types.ObjectId().toString(), active.id) })).status, 404);
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: payload(customer.id, new mongoose.Types.ObjectId().toString()) })).status, 404);
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: payload(customer.id, maintenance.id) })).status, 409);
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: { ...payload(customer.id, active.id), extra: true } })).status, 400);
      assert.equal((await request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: payload(otherCustomer.id, active.id) })).status, 409);

      const openWindow = slot(futureDateOffset(1), "16:00");
      const concurrentBody = payload(customer.id, concurrency.id, openWindow);
      const attempts = await Promise.all([
        request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: concurrentBody }),
        request("/api/v1/bookings/admin/walk-in", { method: "POST", token: adminToken, body: { ...concurrentBody, userId: otherCustomer.id } }),
      ]);
      assert.equal(attempts.filter((result) => result.status === 201).length, 1);
      assert.equal(attempts.filter((result) => result.status === 409).length, 1);
      assert.equal(await Booking.countDocuments({ stationId: concurrency._id, startAt: openWindow.startAt, status: { $in: ["pending", "confirmed"] } }), 1);
      assert.equal((await request("/api/v1/bookings/admin/availability?date=bad&durationMinutes=61", { token: adminToken })).status, 400);
    });

    await t.test("owner transaction listing is admin-only and returns safe customer fields", async () => {
      const key = randomUUID();
      const topup = await request("/api/v1/wallet/top-up", { method: "POST", token: customerToken, headers: { "Idempotency-Key": key }, body: { amountMinor: 2500 } });
      assert.equal(topup.status, 201);
      assert.equal((await request("/api/v1/wallet/admin/transactions", { token: customerToken })).status, 403);
      const listing = await request(`/api/v1/wallet/admin/transactions?search=${encodeURIComponent(customer.email)}`, { token: adminToken });
      assert.equal(listing.status, 200);
      assert.ok(listing.body.data.transactions.some((item) => item.customer?.email === customer.email && item.amountMinor === 2500));
      assert.equal(Object.hasOwn(listing.body.data.transactions[0].customer || {}, "passwordHash"), false);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
      await Booking.deleteMany({ $or: [{ userId: { $in: userIds } }, { stationId: { $in: stationIds } }] });
      const related = await Booking.find({ stationId: { $in: stationIds } }).distinct("_id");
      await Notification.deleteMany({ $or: [{ userId: { $in: userIds } }, { relatedBookingId: { $in: related } }] });
      await Transaction.deleteMany({ userId: { $in: userIds } });
      await Wallet.deleteMany({ userId: { $in: userIds } });
      await StationReservationLock.deleteMany({ stationId: { $in: stationIds } });
      await Station.deleteMany({ _id: { $in: stationIds } });
      await User.deleteMany({ _id: { $in: userIds } });
      await mongoose.disconnect();
    }
  }
});
