require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { after, test } = require("node:test");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const app = require("../src/app");
const Booking = require("../src/models/Booking");
const Notification = require("../src/models/Notification");
const Station = require("../src/models/Station");
const StationReservationLock = require("../src/models/StationReservationLock");
const User = require("../src/models/User");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
const fixtureUserIds = [];
const fixtureStationIds = [];
let server;
let baseUrl;
let adminToken;
let userToken;
let otherUserToken;
let adminUser;
let memberUser;
let otherUser;
let activeStation;
let maintenanceStation;
let inactiveStation;
let concurrencyStation;
let recoveryStation;
let sessionMinutes;

function listen(application) {
  return new Promise((resolve, reject) => {
    const httpServer = application.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.once("error", reject);
  });
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

function timeSlot(offsetHours = 30, duration = sessionMinutes) {
  const minuteMs = 60 * 1000;
  const startMs = Math.ceil((Date.now() + offsetHours * 60 * minuteMs) / minuteMs) * minuteMs;
  const startAt = new Date(startMs);
  const endAt = new Date(startMs + duration * minuteMs);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

function dateAfterKolkataDays(days) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + days));
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const startAt = `${yyyy}-${mm}-${dd}T18:00:00+05:30`;
  const endAt = new Date(Date.parse(startAt) + sessionMinutes * 60000).toISOString();
  return { startAt, endAt };
}

function sameDaySlot() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(new Date());
  const minuteMs = 60 * 1000;
  const startMs = Math.ceil((Date.now() + 30 * minuteMs) / minuteMs) * minuteMs;
  const endMs = startMs + sessionMinutes * minuteMs;
  const startAt = new Date(startMs);
  const endAt = new Date(endMs);
  if (formatter.format(startAt) !== today || formatter.format(endAt) !== today) return null;
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

async function addUser(role, suffix) {
  const user = await User.create({
    name: `Booking test ${role}`,
    email: `booking-${role}-${fixtureKey}-${suffix.toLowerCase()}@nexusarena.test`,
    passwordHash: await bcrypt.hash(`NexusTest-${fixtureKey}-Only`, 4),
    role,
    status: "active",
  });
  fixtureUserIds.push(user._id);
  return user;
}

async function addStation(status, name, hourlyRateMinor = 85001) {
  const station = await Station.create({
    name: `${name} ${fixtureKey}`,
    code: `${name.slice(0, 3).toUpperCase()}${fixtureKey}`,
    type: "PC",
    hourlyRateMinor,
    currency: "INR",
    status,
  });
  fixtureStationIds.push(station._id);
  return station;
}

async function createRequest(stationId, slot, token = userToken, extras = {}) {
  return request("/api/v1/bookings", {
    method: "POST",
    token,
    body: { stationId: stationId.toString(), ...slot, ...extras },
  });
}

test("booking APIs enforce schedule, ownership, price, status and concurrency rules", { timeout: 90000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local test database");
  sessionMinutes = Number(process.env.BOOKING_MIN_DURATION_MINUTES || 30);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([
    Booking.init(),
    Notification.init(),
    Station.init(),
    StationReservationLock.init(),
    User.init(),
  ]);

  adminUser = await addUser("admin", "admin");
  memberUser = await addUser("user", "member");
  otherUser = await addUser("user", "other");
  adminToken = generateToken(adminUser);
  userToken = generateToken(memberUser);
  otherUserToken = generateToken(otherUser);

  activeStation = await addStation("active", "ActiveRig");
  maintenanceStation = await addStation("maintenance", "MaintenanceRig");
  inactiveStation = await addStation("inactive", "InactiveRig");
  concurrencyStation = await addStation("active", "ConcurrentRig");
  recoveryStation = await addStation("active", "RecoveryRig");

  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const future = timeSlot();
  const availabilityQuery = new URLSearchParams({
    stationId: activeStation._id.toString(),
    startAt: future.startAt,
    endAt: future.endAt,
  });

  await t.test("availability supports future UTC timestamps and same-day local dates", async () => {
    const available = await request(`/api/v1/bookings/availability?${availabilityQuery}`);
    assert.equal(available.status, 200);
    assert.equal(available.body.data.available, true);
    assert.equal(available.body.data.currency, "INR");
    assert.equal(available.body.data.estimatedTotalMinor, Math.ceil(85001 * sessionMinutes / 60));

    const sameDay = sameDaySlot();
    if (sameDay) {
      const query = new URLSearchParams({
        stationId: activeStation._id.toString(),
        startAt: sameDay.startAt,
        endAt: sameDay.endAt,
      });
      const sameDayResult = await request(`/api/v1/bookings/availability?${query}`);
      assert.equal(sameDayResult.status, 200);
      assert.equal(sameDayResult.body.data.available, true);
    } else {
      t.diagnostic("Same-day future availability was not time-feasible at test runtime; future-date availability was verified.");
    }
  });

  await t.test("availability rejects invalid times and unavailable stations", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${activeStation.id}&startAt=${encodeURIComponent(past)}&endAt=${encodeURIComponent(future.endAt)}`)).status, 400);
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${activeStation.id}&startAt=${encodeURIComponent(future.endAt)}&endAt=${encodeURIComponent(future.startAt)}`)).status, 400);
    const invalidDurationEnd = new Date(new Date(future.startAt).getTime() + (sessionMinutes + 1) * 60000).toISOString();
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${activeStation.id}&startAt=${encodeURIComponent(future.startAt)}&endAt=${encodeURIComponent(invalidDurationEnd)}`)).status, 400);
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${activeStation.id}&startAt=${encodeURIComponent(future.startAt.slice(0, -1))}&endAt=${encodeURIComponent(future.endAt)}`)).status, 400);
    const fractionalStart = new Date(new Date(future.startAt).getTime() + 100).toISOString();
    const fractionalEnd = new Date(new Date(future.endAt).getTime() + 100).toISOString();
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${activeStation.id}&startAt=${encodeURIComponent(fractionalStart)}&endAt=${encodeURIComponent(fractionalEnd)}`)).status, 400);
    assert.equal((await request(`/api/v1/bookings/availability?stationId=${new mongoose.Types.ObjectId()}&startAt=${encodeURIComponent(future.startAt)}&endAt=${encodeURIComponent(future.endAt)}`)).status, 404);

    for (const station of [maintenanceStation, inactiveStation]) {
      const query = new URLSearchParams({
        stationId: station._id.toString(),
        startAt: future.startAt,
        endAt: future.endAt,
      });
      const result = await request(`/api/v1/bookings/availability?${query}`);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.available, false);
      assert.equal(result.body.data.reason, "station_unavailable");
    }
    assert.equal((await request(`/api/v1/bookings/availability?stationId=not-an-id&startAt=${encodeURIComponent(future.startAt)}&endAt=${encodeURIComponent(future.endAt)}`)).status, 400);
  });

  await t.test("booking dates are limited to today and the next two Kolkata calendar days", async () => {
    const outsideWindow = dateAfterKolkataDays(3);
    const query = new URLSearchParams({ stationId: activeStation.id, ...outsideWindow });
    assert.equal((await request(`/api/v1/bookings/availability?${query}`)).status, 400);
    assert.equal((await createRequest(activeStation.id, outsideWindow)).status, 400);
  });

  let firstBooking;
  await t.test("booking creation uses the authenticated user and server-side paise price", async () => {
    assert.equal((await request("/api/v1/bookings", {
      method: "POST",
      body: { stationId: activeStation._id.toString(), ...future },
    })).status, 401);
    assert.equal((await createRequest(activeStation._id, future, "invalid-token")).status, 401);

    const manipulated = await createRequest(activeStation._id, future, userToken, {
      userId: adminUser._id.toString(),
      totalMinor: 1,
    });
    assert.equal(manipulated.status, 400);

    for (const station of [maintenanceStation, inactiveStation]) {
      assert.equal((await createRequest(station._id, future)).status, 409);
    }

    const created = await createRequest(activeStation._id, future);
    assert.equal(created.status, 201);
    firstBooking = created.body.data.booking;
    assert.equal(firstBooking.userId, memberUser._id.toString());
    assert.equal(firstBooking.status, "pending");
    assert.equal(firstBooking.currency, "INR");
    assert.equal(firstBooking.durationMinutes, sessionMinutes);
    assert.equal(firstBooking.priceSnapshot.hourlyRateMinor, 85001);
    assert.equal(firstBooking.priceSnapshot.discountMinor, 0);
    assert.equal(firstBooking.priceSnapshot.totalMinor, Math.ceil(85001 * sessionMinutes / 60));
    assert.equal(firstBooking.startAt, new Date(future.startAt).toISOString());
    assert.equal("passwordHash" in firstBooking, false);
    assert.ok(await Notification.exists({ relatedBookingId: firstBooking.id, type: "admin_booking_created", userId: adminUser._id }));
  });

  await t.test("overlap is rejected while adjacent half-open intervals are accepted", async () => {
    const available = await request(`/api/v1/bookings/availability?${availabilityQuery}`);
    assert.equal(available.body.data.available, false);
    assert.equal(available.body.data.reason, "time_conflict");
    assert.equal((await createRequest(activeStation._id, future, otherUserToken)).status, 409);

    const adjacent = {
      startAt: future.endAt,
      endAt: new Date(new Date(future.endAt).getTime() + sessionMinutes * 60000).toISOString(),
    };
    const result = await createRequest(activeStation._id, adjacent, otherUserToken);
    assert.equal(result.status, 201);
    assert.equal(result.body.data.booking.startAt, new Date(future.endAt).toISOString());
  });

  await t.test("same-station simultaneous booking requests cannot both succeed", async () => {
    const slot = timeSlot(42);
    const results = await Promise.all([
      createRequest(concurrencyStation._id, slot, userToken),
      createRequest(concurrencyStation._id, slot, otherUserToken),
    ]);
    assert.equal(results.filter((result) => result.status === 201).length, 1);
    assert.equal(results.filter((result) => result.status === 409).length, 1);
    assert.equal(await Booking.countDocuments({ stationId: concurrencyStation._id, startAt: new Date(slot.startAt) }), 1);
    assert.equal(await StationReservationLock.exists({ stationId: concurrencyStation._id }), null);
  });

  await t.test("expired station leases are reclaimed after abandoned requests", async () => {
    const slot = timeSlot(43);
    const activeToken = `active-${fixtureKey}`;
    await StationReservationLock.create({
      stationId: recoveryStation._id,
      token: activeToken,
      expiresAt: new Date(Date.now() + 60000),
    });
    const busyQuery = new URLSearchParams({
      stationId: recoveryStation._id.toString(),
      startAt: slot.startAt,
      endAt: slot.endAt,
    });
    const busyAvailability = await request(`/api/v1/bookings/availability?${busyQuery}`);
    assert.equal(busyAvailability.body.data.available, false);
    assert.equal(busyAvailability.body.data.reason, "reservation_in_progress");
    assert.equal((await createRequest(recoveryStation._id, slot)).status, 409);
    await StationReservationLock.deleteOne({ stationId: recoveryStation._id, token: activeToken });

    await StationReservationLock.create({
      stationId: recoveryStation._id,
      token: `abandoned-${fixtureKey}`,
      expiresAt: new Date(Date.now() - 1000),
    });
    const result = await createRequest(recoveryStation._id, slot);
    assert.equal(result.status, 201);
    assert.equal(await StationReservationLock.exists({ stationId: recoveryStation._id }), null);
  });

  await t.test("user history, pagination, ownership, and admin access are enforced", async () => {
    assert.equal((await request("/api/v1/bookings/my")).status, 401);
    const history = await request("/api/v1/bookings/my?status=pending&page=1&limit=1", { token: userToken });
    assert.equal(history.status, 200);
    assert.equal(history.body.data.pagination.limit, 1);
    assert.ok(history.body.data.pagination.total >= 1);
    assert.ok(history.body.data.bookings.every((booking) => booking.userId === memberUser._id.toString()));
    assert.equal((await request(`/api/v1/bookings/${firstBooking.id}`, { token: otherUserToken })).status, 404);
    assert.equal((await request("/api/v1/bookings/admin", { token: userToken })).status, 403);
    assert.equal((await request(`/api/v1/bookings/not-an-id`, { token: userToken })).status, 400);
    assert.equal((await request(`/api/v1/bookings/${new mongoose.Types.ObjectId()}`, { token: userToken })).status, 404);

    const adminDetail = await request(`/api/v1/bookings/${firstBooking.id}`, { token: adminToken });
    assert.equal(adminDetail.status, 200);
    assert.equal(adminDetail.body.data.booking.user.id, memberUser._id.toString());
    assert.equal("passwordHash" in adminDetail.body.data.booking.user, false);

    const from = new Date(new Date(future.startAt).getTime() - 60000).toISOString();
    const to = new Date(new Date(future.endAt).getTime() + 60000).toISOString();
    const adminList = await request(
      `/api/v1/bookings/admin?status=pending&stationId=${activeStation._id}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&limit=5`,
      { token: adminToken }
    );
    assert.equal(adminList.status, 200);
    assert.ok(adminList.body.data.bookings.some((booking) => booking.id === firstBooking.id));
    assert.equal((await request("/api/v1/bookings/admin?from=invalid", { token: adminToken })).status, 400);
  });

  await t.test("cancellation preserves history, enforces ownership, and rejects repeats", async () => {
    assert.equal((await request(`/api/v1/bookings/${firstBooking.id}/cancel`, {
      method: "PATCH",
      token: otherUserToken,
      body: { reason: "Wrong account" },
    })).status, 404);

    const cancelled = await request(`/api/v1/bookings/${firstBooking.id}/cancel`, {
      method: "PATCH",
      token: userToken,
      body: { reason: "Plans changed" },
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.booking.status, "cancelled");
    assert.equal(cancelled.body.data.booking.cancellationReason, "Plans changed");
    assert.equal((await request(`/api/v1/bookings/${firstBooking.id}/cancel`, {
      method: "PATCH",
      token: userToken,
      body: { reason: "Repeat" },
    })).status, 409);
    assert.equal(await Booking.countDocuments({ _id: firstBooking.id }), 1);

    const completedSlot = timeSlot(168);
    const completed = await Booking.create({
      userId: memberUser._id,
      stationId: activeStation._id,
      startAt: new Date(completedSlot.startAt),
      endAt: new Date(completedSlot.endAt),
      durationMinutes: sessionMinutes,
      status: "completed",
      priceSnapshot: { hourlyRateMinor: 85001, subtotalMinor: 42501, discountMinor: 0, totalMinor: 42501 },
      currency: "INR",
    });
    assert.equal((await request(`/api/v1/bookings/${completed.id}/cancel`, {
      method: "PATCH",
      token: adminToken,
      body: { reason: "Not permitted" },
    })).status, 409);

    const adminCancellable = await createRequest(activeStation._id, timeSlot(44), userToken);
    assert.equal(adminCancellable.status, 201);
    const adminCancelled = await request(`/api/v1/bookings/${adminCancellable.body.data.booking.id}/cancel`, {
      method: "PATCH",
      token: adminToken,
      body: { reason: "Lounge schedule adjustment" },
    });
    assert.equal(adminCancelled.status, 200);
    assert.equal(adminCancelled.body.data.booking.status, "cancelled");
  });

  await t.test("same-day future availability works when the test runs before local midnight", async (context) => {
    const slot = sameDaySlot();
    if (!slot) {
      context.skip("No remaining same-day future interval in Asia/Kolkata at test runtime.");
      return;
    }
    const station = await addStation("active", "SameDayRig");
    const query = new URLSearchParams({ stationId: station._id.toString(), ...slot });
    const result = await request(`/api/v1/bookings/availability?${query}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.available, true);
    const created = await createRequest(station._id, slot);
    assert.equal(created.status, 201);
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    if (fixtureUserIds.length || fixtureStationIds.length) {
      await Booking.deleteMany({
        $or: [
          { userId: { $in: fixtureUserIds } },
          { stationId: { $in: fixtureStationIds } },
        ],
      });
    }
    if (fixtureStationIds.length) {
      const relatedBookingIds = await Booking.find({ stationId: { $in: fixtureStationIds } }).distinct("_id");
      await Notification.deleteMany({ relatedBookingId: { $in: relatedBookingIds } });
      await StationReservationLock.deleteMany({ stationId: { $in: fixtureStationIds } });
      await Station.deleteMany({ _id: { $in: fixtureStationIds } });
    }
    if (fixtureUserIds.length) await User.deleteMany({ _id: { $in: fixtureUserIds } });
    await mongoose.disconnect();
  }
});
