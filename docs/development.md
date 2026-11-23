# Development setup

## Required software

- Node.js and npm compatible with the checked-in lockfiles. The current backend was verified with Node.js 24.
- A local MongoDB server configured as a single-node replica set named `rs0`; database name `nexus_arena`.
- Git.

## Install dependencies

Install the two applications independently because the repository does not use npm workspaces:

```powershell
cd server
npm ci

cd ..\client
npm ci
```

## Configure the backend

Copy `server/.env.example` to `server/.env` only if a local `.env` does not already exist. Preserve existing local connection settings. Set `MONGODB_URI` to the local database and create a private JWT secret of at least 32 bytes:

```powershell
node -e "console.log(require('node:crypto').randomBytes(64).toString('hex'))"
```

Put the generated value in the ignored `server/.env` file. Do not commit `.env`.

| Variable | Default/example | Purpose |
|---|---|---|
| `PORT` | `5000` | Express listen port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/nexus_arena?replicaSet=rs0` | MongoDB replica-set connection |
| `JWT_SECRET` | Set locally; no example secret is supplied | JWT signing key, minimum 32 bytes |
| `JWT_EXPIRES_IN` | `1h` | JWT lifetime accepted by jsonwebtoken |
| `BOOKING_MIN_DURATION_MINUTES` | `30` | Minimum session length |
| `BOOKING_MAX_DURATION_MINUTES` | `720` | Maximum session length |
| `BOOKING_DURATION_STEP_MINUTES` | `30` | Allowed duration increment |
| `BOOKING_LOCK_TTL_MS` | `120000` | Station reservation lease duration; allowed range 10,000–600,000 ms |
| `WALLET_TOPUP_MIN_MINOR` | `100` | Minimum simulated top-up, in paise |
| `WALLET_TOPUP_MAX_MINOR` | `1000000` | Maximum simulated top-up, in paise |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated browser origins allowed by CORS; set the exact client origin(s) in production |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Login and registration rate-limit window in milliseconds |
| `AUTH_RATE_LIMIT_MAX` | `10` | Maximum requests per IP for each login and registration route per window |
| `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | unset | Optional create-only local demo admin; password must be 12–72 UTF-8 bytes |
| `DEMO_USER_NAME`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` | unset | Optional create-only local demo user |

## Configure the frontend

The optional `client/.env` file can set `VITE_API_BASE_URL`. Copy `client/.env.example` to `client/.env` for local development; the default is `http://localhost:5000/api/v1`. The backend CORS configuration must permit the Vite development origin if it differs from the existing local setup. Frontend environment values are public build-time settings and must not contain credentials or secrets.

Start MongoDB before starting the backend. The connection string may include credentials in a local `.env` when authentication is enabled; never put them in tracked files.

### Configure a local single-node replica set on Windows

Booking creation and wallet balance changes use multi-document MongoDB transactions so their notifications commit atomically. Do not run booking creation, financial APIs, or their integration tests against a standalone MongoDB server. If MongoDB is currently standalone, configure it manually; this project does not change Windows services or MongoDB configuration.

1. Open **Services** and stop the MongoDB service. Locate its existing configuration file (the MSI installation commonly places `mongod.cfg` under `C:\Program Files\MongoDB\Server\<version>\bin`). Preserve existing storage, network, and security settings.
2. Add the following YAML section to that file:

   ```yaml
   replication:
     replSetName: rs0
   ```

3. Start the MongoDB service again. Connect with `mongosh` to the local instance and initialize the set once:

   ```javascript
   rs.initiate()
   rs.status()
   ```

   Wait until the local member is `PRIMARY`. If this instance is already part of a replica set, do not run `rs.initiate()` again.
4. Configure `MONGODB_URI` in the ignored `server/.env` to include the set name, for example `mongodb://127.0.0.1:27017/nexus_arena?replicaSet=rs0`. Preserve any local authentication options if enabled.
5. Verify `hello` reports `setName: "rs0"` and `isWritablePrimary: true` before using booking creation or financial endpoints.

## Start the applications

Start the backend in one terminal:

```powershell
cd server
npm run dev
```

Start the frontend in another terminal:

```powershell
cd client
npm run dev
```

The API listens at `http://localhost:5000` by default. The Vite development server prints its local URL. The client uses the backend for account, station, booking, wallet, and in-app notification flows. Notification counts refresh on route changes, when the browser regains focus, when the panel opens, and after relevant account actions; no WebSocket or polling service is required.

## Demo stations and access

With the local `nexus_arena` database connected as a writable `rs0` primary, run:

```powershell
cd server
npm run seed:demo
```

The repeatable seed adds 16 records using the existing `Station` schema: eight active PC stations (including a racing simulator categorized as PC), three active Console stations, one active VR station, one maintenance Console station, one maintenance VR station, one inactive PC station, and one inactive Console station. It uses `$setOnInsert` keyed by station code. Existing records are not updated or removed. The script refuses production, remote MongoDB hosts, a database other than `nexus_arena`, and a replica-set connection that is not `rs0` with a writable primary. No image URLs are seeded; station images remain optional.

Default local access points:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Public active station API: `http://localhost:5000/api/v1/stations`
- Backend health: `http://localhost:5000/api/v1/health`
- Admin station management page: `http://localhost:5173/admin/stations` (requires an authenticated admin)

To create local presentation accounts, add a new email and private values for `DEMO_ADMIN_NAME`, `DEMO_ADMIN_EMAIL`, and `DEMO_ADMIN_PASSWORD` to ignored `server/.env`, then rerun `npm run seed:demo`. Optional user values use `DEMO_USER_NAME`, `DEMO_USER_EMAIL`, and `DEMO_USER_PASSWORD`. The seed creates a wallet with each new account. It leaves any existing account with the same email unchanged and does not provide public admin registration. Log into the site using the configured admin email and password, then visit `/admin/stations`. The seeder never prints account credentials. Do not use presentation credentials outside the local demo.

In MongoDB Compass, connect to the same local MongoDB endpoint configured in `server/.env` (for a default unauthenticated instance, `mongodb://127.0.0.1:27017`). Select the `nexus_arena` database and its `stations` collection. Filter documents with `{ status: "active" }`, `{ status: "maintenance" }`, or `{ status: "inactive" }` to inspect the three states. The public API returns active stations only; admins can see all states through the authenticated `GET /api/v1/stations/admin` endpoint and the admin page. A normal user cannot access that endpoint.

To start a Windows MongoDB service, open **Services**, locate the installed MongoDB Server service, and select **Start**. Confirm the instance is primary in replica set `rs0` with the `mongosh` checks in the previous section before testing booking and wallet workflows. The seed command does not start or reconfigure MongoDB.

## Local workflow and checks

- Backend syntax: `Get-ChildItem src -Recurse -Filter '*.js' | ForEach-Object { node --check $_.FullName }` from `server/`.
- Backend integration tests: `npm test` from `server/`. MongoDB must be running as replica set `rs0` and `MONGODB_URI` configured. Tests assert the replica-set name, use unique temporary records, and clean them up.
- Database index audit: `npm run verify:indexes` from `server/`. This is read-only and reports schema-declared indexes that are missing from MongoDB.
- Dependency vulnerability check: `npm audit` from `server/` and `client/`. The backend pins nodemon's vulnerable minimatch range to a patched compatible release; verify the lockfile audit after dependency updates.
- Notification and admin overview integration tests are included in the backend suite and run against the same local replica-set database.
- Frontend production build: `npm run build` from `client/`.
- Frontend lint: `npm run lint` from `client/`.
- API health check: `GET http://localhost:5000/api/v1/health`.

## Production preparation

## Owner control panel demonstration

Sign in with an administrator account created through the local demo seed or provisioned by an administrator. Open `/admin` for the overview. The owner sidebar links to station inventory, the daily slot schedule, booking management, walk-in booking, customer and wallet review, transaction history and notifications. All owner APIs require the admin role; public station discovery still returns active stations only.

To create a walk-in reservation, choose an active existing customer, active station, date and time. The page shows the server's availability and price quote, then the API verifies both again at submission. A successful walk-in is pending and unpaid. No wallet funds are debited and no cash is recorded by the system; treat payment collection outside the application's ledger accordingly. A displayed free slot is not a reservation until the create request succeeds.

Run the backend integration suite with `npm test` in `server/`; owner schedule and walk-in cases are in `tests/admin-control.integration.test.js`. These booking operations require the configured writable replica set `rs0`.

## Production preparation

The repository does not include a deployment workflow or hosting configuration. For a future deployment, build the client with `npm ci` and `npm run build` in `client/`, then serve the generated `client/dist` through a static host. On a Node.js host, install backend dependencies with `npm ci` in `server/` and run `npm start`. Configure production environment variables through the hosting provider's secret manager: a TLS-enabled MongoDB replica-set URI, a unique JWT secret of at least 32 bytes, `JWT_EXPIRES_IN`, `PORT`, and `CLIENT_ORIGIN` set to the exact HTTPS client origin(s). Set `NODE_ENV=production`; demo seeding is disabled in that mode. Never use demo account credentials in production.

Keep MongoDB transactions available on the production database because booking creation and wallet operations require them. Restrict database network access to the API host, use least-privilege database credentials, terminate HTTPS at the host or reverse proxy, and retain Helmet and the configured CORS policy. Configure regular encrypted database backups, restrict backup access, and periodically test restoration in a separate environment. The login/registration limiter currently stores counters in process memory; a multi-instance deployment should configure a shared rate-limit store. No deployment, external service change, backup or restore has been performed as part of this project milestone.

## Troubleshooting

- **MongoDB connection fails:** confirm the MongoDB service is running and that the local URI and database permissions are correct.
- **Wallet transaction says replica-set support is unavailable:** confirm `mongod.cfg` includes `replication.replSetName: rs0`, the service was restarted, `rs.status()` shows a primary, and `MONGODB_URI` includes `?replicaSet=rs0`. Financial operations do not fall back to non-atomic writes.
- **JWT configuration error:** set `JWT_SECRET` to a unique value of at least 32 bytes and set `JWT_EXPIRES_IN` in `server/.env`.
- **Booking lease conflict:** retry after the current reservation finishes; abandoned leases become reclaimable after `BOOKING_LOCK_TTL_MS`.
- **Booking duration rejected:** use a duration within the configured minimum/maximum and aligned to the configured step.
- **Timestamp rejected:** send a valid ISO 8601 timestamp with `Z` or an explicit offset such as `+05:30`.
- **Integration tests fail to connect:** ensure the test database is local, available, and not being reset while the suite runs.
