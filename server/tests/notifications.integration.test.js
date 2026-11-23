require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { after, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../src/app");
const Notification = require("../src/models/Notification");
const User = require("../src/models/User");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 12).toLowerCase();
const fixtureUserIds = [];
let server;
let baseUrl;
let admin;
let member;
let otherMember;
let adminToken;
let memberToken;
let otherToken;

function listen(application) {
  return new Promise((resolve, reject) => {
    const httpServer = application.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.once("error", reject);
  });
}

async function request(path, { method = "GET", token, body } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

async function makeUser(role, suffix) {
  const user = await User.create({
    name: `Notification ${suffix}`,
    email: `notification-${suffix}-${fixtureKey}@nexusarena.test`,
    passwordHash: "test-only-hash",
    role,
    status: "active",
  });
  fixtureUserIds.push(user._id);
  return user;
}

async function makeNotification(userId, eventRef, values = {}) {
  return Notification.create({
    userId,
    eventRef,
    type: values.type || "wallet_top_up",
    title: values.title || "Wallet top-up recorded",
    message: values.message || "Your simulated wallet top-up was recorded successfully.",
    ...(values.readAt ? { readAt: values.readAt } : {}),
    ...(values.relatedBookingId ? { relatedBookingId: values.relatedBookingId } : {}),
    ...(values.relatedTransactionId ? { relatedTransactionId: values.relatedTransactionId } : {}),
  });
}

test("notification APIs enforce account ownership, filtering, pagination, and admin scope", { timeout: 30000 }, async () => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local test database");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([User.init(), Notification.init()]);
  admin = await makeUser("admin", "admin");
  member = await makeUser("user", "member");
  otherMember = await makeUser("user", "other");
  adminToken = generateToken(admin);
  memberToken = generateToken(member);
  otherToken = generateToken(otherMember);

  const unread = await makeNotification(member._id, `notification:${fixtureKey}:unread`);
  await makeNotification(member._id, `notification:${fixtureKey}:read`, { readAt: new Date(Date.now() - 1000) });
  await makeNotification(member._id, `notification:${fixtureKey}:unread-two`, { title: "Booking cancelled", type: "booking_cancelled" });
  const foreign = await makeNotification(otherMember._id, `notification:${fixtureKey}:foreign`);
  await makeNotification(admin._id, `notification:${fixtureKey}:admin`, { type: "admin_booking_created", title: "New station booking" });

  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  assert.equal((await request("/api/v1/notifications")).status, 401);
  const paged = await request("/api/v1/notifications?page=1&limit=1", { token: memberToken });
  assert.equal(paged.status, 200);
  assert.equal(paged.body.data.notifications.length, 1);
  assert.equal(paged.body.data.pagination.total, 3);
  assert.ok(paged.body.data.notifications[0].createdAt);
  assert.equal("eventRef" in paged.body.data.notifications[0], false);

  const unreadList = await request("/api/v1/notifications?status=unread&limit=10", { token: memberToken });
  assert.equal(unreadList.body.data.pagination.total, 2);
  assert.ok(unreadList.body.data.notifications.every((item) => item.readAt === null));
  assert.equal((await request("/api/v1/notifications/unread-count", { token: memberToken })).body.data.unreadCount, 2);
  assert.equal((await request("/api/v1/notifications/unread-count?userId=other", { token: memberToken })).status, 400);

  assert.equal((await request(`/api/v1/notifications/${foreign.id}/read`, { method: "PATCH", token: memberToken })).status, 404);
  assert.equal((await request("/api/v1/notifications/not-an-id/read", { method: "PATCH", token: memberToken })).status, 400);
  const marked = await request(`/api/v1/notifications/${unread.id}/read`, { method: "PATCH", token: memberToken });
  assert.equal(marked.status, 200);
  assert.ok(marked.body.data.notification.readAt);
  assert.equal((await request("/api/v1/notifications/unread-count", { token: memberToken })).body.data.unreadCount, 1);

  const allRead = await fetch(`${baseUrl}/api/v1/notifications/read-all`, {
    method: "PATCH", headers: { authorization: `Bearer ${memberToken}` },
  });
  assert.equal(allRead.status, 200);
  assert.equal((await allRead.json()).data.markedRead, 1);
  assert.equal((await request("/api/v1/notifications/unread-count", { token: memberToken })).body.data.unreadCount, 0);
  assert.equal((await request("/api/v1/notifications/read-all", { method: "PATCH", token: memberToken, body: { userId: otherMember.id } })).status, 400);

  assert.equal((await request("/api/v1/notifications?scope=operations", { token: memberToken })).status, 403);
  const adminOperations = await request("/api/v1/notifications?scope=operations", { token: adminToken });
  assert.equal(adminOperations.status, 200);
  assert.ok(adminOperations.body.data.notifications.every((item) => item.type.startsWith("admin_")));
  const overview = await request("/api/v1/admin/overview", { token: adminToken });
  assert.equal(overview.status, 200);
  assert.equal(typeof overview.body.data.overview.stations.active, "number");
  assert.equal(typeof overview.body.data.overview.bookings.pending, "number");
  assert.ok(overview.body.data.overview.recentNotifications.some((item) => item.type === "admin_booking_created"));
  assert.equal((await request("/api/v1/admin/overview?status=pending", { token: adminToken })).status, 400);
  assert.equal((await request("/api/v1/admin/overview", { token: memberToken })).status, 403);
  assert.equal((await request("/api/v1/admin/overview")).status, 401);
  assert.equal((await request("/api/v1/notifications?limit=0", { token: memberToken })).status, 400);
  assert.equal((await request("/api/v1/notifications?status=unknown", { token: memberToken })).status, 400);
  assert.equal((await request("/api/v1/notifications?scope=operations", { token: otherToken })).status, 403);
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    if (fixtureUserIds.length) {
      await Notification.deleteMany({ userId: { $in: fixtureUserIds } });
      await User.deleteMany({ _id: { $in: fixtureUserIds } });
    }
    await mongoose.disconnect();
  }
});
