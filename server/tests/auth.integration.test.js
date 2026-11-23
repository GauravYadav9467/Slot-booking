require("dotenv").config({ quiet: true });

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { after, test } = require("node:test");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const { generateToken } = require("../src/utils/generateToken");

const fixtureKey = randomUUID().replace(/-/g, "").slice(0, 12).toLowerCase();
const email = `milestone9-${fixtureKey}@nexusarena.test`;
let server;
let baseUrl;
let token;
let createdUserId;

test("authentication journey, role checks, safe profiles, and password handling", { timeout: 30000 }, async (t) => {
  assert.ok(process.env.MONGODB_URI, "MONGODB_URI must point to the local replica-set database");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.equal(hello.setName, "rs0");
  assert.equal(hello.isWritablePrimary, true);
  await Promise.all([User.init(), Wallet.init()]);

  server = await new Promise((resolve, reject) => {
    const httpServer = app.listen(0, "127.0.0.1", () => resolve(httpServer));
    httpServer.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function request(path, { method = "GET", body, bearer, origin } = {}) {
    const headers = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (bearer) headers.authorization = `Bearer ${bearer}`;
    if (origin) headers.origin = origin;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      body: await response.json(),
      allowOrigin: response.headers.get("access-control-allow-origin"),
    };
  }

  const registration = {
    name: "Milestone Nine Member",
    email: ` ${email.toUpperCase()} `,
    phone: "+919876543210",
    password: "NexusArena-M9-Test-Only",
  };

  await t.test("registers a normalized user and creates a wallet without exposing the hash", async () => {
    const result = await request("/api/v1/auth/register", { method: "POST", body: registration });
    assert.equal(result.status, 201);
    assert.equal(result.body.data.user.email, email);
    assert.equal(result.body.data.user.role, "user");
    assert.equal(Object.hasOwn(result.body.data.user, "passwordHash"), false);
    const user = await User.findOne({ email }).select("+passwordHash");
    assert.ok(user);
    createdUserId = user._id;
    assert.notEqual(user.passwordHash, registration.password);
    assert.match(user.passwordHash, /^\$2[aby]\$/);
    assert.ok(await Wallet.exists({ userId: user._id }));
  });

  await t.test("rejects duplicate registration and incorrect login", async () => {
    const duplicate = await request("/api/v1/auth/register", { method: "POST", body: registration });
    assert.equal(duplicate.status, 409);
    const invalidLogin = await request("/api/v1/auth/login", {
      method: "POST", body: { email, password: "Incorrect-password" },
    });
    assert.equal(invalidLogin.status, 401);
  });

  await t.test("logs in, protects the profile, and logout does not revoke the JWT", async () => {
    const login = await request("/api/v1/auth/login", {
      method: "POST", body: { email, password: registration.password },
    });
    assert.equal(login.status, 200);
    token = login.body.data.token;
    assert.equal(Object.hasOwn(login.body.data.user, "passwordHash"), false);

    const profile = await request("/api/v1/auth/me", { bearer: token });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.user.email, email);
    assert.equal(Object.hasOwn(profile.body.data.user, "passwordHash"), false);

    assert.equal((await request("/api/v1/auth/me")).status, 401);
    assert.equal((await request("/api/v1/auth/me", { bearer: "not-a-jwt" })).status, 401);
    assert.equal((await request("/api/v1/admin/overview", { bearer: token })).status, 403);

    const logout = await request("/api/v1/auth/logout", { method: "POST", bearer: token });
    assert.equal(logout.status, 200);
    assert.match(logout.body.message, /remains valid until its configured expiry/i);
    assert.equal((await request("/api/v1/auth/me", { bearer: token })).status, 200);
  });

  await t.test("rejects blocked accounts and stale admin role claims", async () => {
    await User.updateOne({ _id: createdUserId }, { $set: { status: "blocked" } });
    assert.equal((await request("/api/v1/auth/me", { bearer: token })).status, 403);
    assert.equal((await request("/api/v1/auth/login", {
      method: "POST", body: { email, password: registration.password },
    })).status, 403);

    const admin = await User.create({
      name: "Milestone Nine Role Check",
      email: `admin-role-${fixtureKey}@nexusarena.test`,
      passwordHash: "test-only-hash",
      role: "admin",
      status: "active",
    });
    const adminToken = generateToken(admin);
    await User.updateOne({ _id: admin._id }, { $set: { role: "user" } });
    assert.equal((await request("/api/v1/admin/overview", { bearer: adminToken })).status, 401);
    await User.deleteOne({ _id: admin._id });
  });

  await t.test("applies the configured CORS policy and limits repeated login attempts", async () => {
    const allowed = await request("/api/v1/health", { origin: "http://localhost:5173" });
    assert.equal(allowed.allowOrigin, "http://localhost:5173");
    const unlisted = await request("/api/v1/health", { origin: "https://unlisted.example" });
    assert.equal(unlisted.allowOrigin, null);

    let lastAttempt;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      lastAttempt = await request("/api/v1/auth/login", {
        method: "POST",
        body: { email: `unknown-${fixtureKey}@nexusarena.test`, password: "Incorrect-password" },
      });
    }
    assert.equal(lastAttempt.status, 429);
    assert.match(lastAttempt.body.message, /too many authentication attempts/i);
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    if (createdUserId) {
      await Wallet.deleteOne({ userId: createdUserId });
      await User.deleteOne({ _id: createdUserId });
    }
    await mongoose.disconnect();
  }
});
