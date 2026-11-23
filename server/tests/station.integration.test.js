require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { after, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../src/app");
const Station = require("../src/models/Station");
const User = require("../src/models/User");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
const fixtureStationIds = [];
let fixtureUserIds = [];
let server;
let baseUrl;
let adminToken;
let memberToken;

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

test("station administration lists and manages all station statuses safely", { timeout: 30000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local test database");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await Promise.all([Station.init(), User.init()]);

  const admin = await User.create({
    name: "Station test admin",
    email: `station-admin-${fixtureKey.toLowerCase()}@nexusarena.test`,
    passwordHash: "test-only-hash",
    role: "admin",
    status: "active",
  });
  const member = await User.create({
    name: "Station test member",
    email: `station-user-${fixtureKey.toLowerCase()}@nexusarena.test`,
    passwordHash: "test-only-hash",
    role: "user",
    status: "active",
  });
  fixtureUserIds = [admin._id, member._id];
  adminToken = generateToken(admin);
  memberToken = generateToken(member);

  const stations = await Station.create([
    { name: `Active ${fixtureKey}`, code: `A${fixtureKey}`, type: "PC", hourlyRateMinor: 12000, status: "active" },
    { name: `Maintenance ${fixtureKey}`, code: `M${fixtureKey}`, type: "Console", hourlyRateMinor: 9000, status: "maintenance" },
    { name: `Inactive ${fixtureKey}`, code: `I${fixtureKey}`, type: "VR", hourlyRateMinor: 15000, status: "inactive" },
  ]);
  fixtureStationIds.push(...stations.map((station) => station._id));

  server = await listen(app);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  const [active, maintenance, inactive] = stations;

  await t.test("admin can list all station statuses; regular users are denied", async () => {
    const result = await request(`/api/v1/stations/admin?search=${fixtureKey}`, { token: adminToken });
    assert.equal(result.status, 200);
    assert.deepEqual(new Set(result.body.data.stations.map((station) => station.status)), new Set(["active", "maintenance", "inactive"]));
    assert.equal(result.body.data.pagination.total, 3);

    const denied = await request("/api/v1/stations/admin", { token: memberToken });
    assert.equal(denied.status, 403);
    const anonymous = await request("/api/v1/stations/admin");
    assert.equal(anonymous.status, 401);
  });

  await t.test("public listing continues to hide maintenance and inactive stations", async () => {
    const result = await request(`/api/v1/stations?search=${fixtureKey}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.data.stations.map((station) => station.id), [active.id]);
  });

  await t.test("invalid station status changes are rejected", async () => {
    const result = await request(`/api/v1/stations/${inactive.id}/status`, {
      method: "PATCH", token: adminToken, body: { status: "retired" },
    });
    assert.equal(result.status, 400);
  });

  await t.test("admin can reactivate an inactive station", async () => {
    const result = await request(`/api/v1/stations/${inactive.id}/status`, {
      method: "PATCH", token: adminToken, body: { status: "active" },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.station.status, "active");
    const publicList = await request(`/api/v1/stations?search=${fixtureKey}`);
    assert.ok(publicList.body.data.stations.some((station) => station.id === inactive.id));
  });

  await t.test("admin can deactivate an active station while retaining it in admin inventory", async () => {
    const result = await request(`/api/v1/stations/${active.id}`, { method: "DELETE", token: adminToken });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.station.status, "inactive");
    const publicList = await request(`/api/v1/stations?search=${fixtureKey}`);
    assert.ok(!publicList.body.data.stations.some((station) => station.id === active.id));
    const adminList = await request(`/api/v1/stations/admin?search=${fixtureKey}`, { token: adminToken });
    assert.ok(adminList.body.data.stations.some((station) => station.id === active.id && station.status === "inactive"));
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    if (fixtureStationIds.length) await Station.deleteMany({ _id: { $in: fixtureStationIds } });
    if (fixtureUserIds.length) await User.deleteMany({ _id: { $in: fixtureUserIds } });
    await mongoose.disconnect();
  }
});
