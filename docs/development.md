# Development setup

## Required software

- Node.js and npm compatible with the checked-in lockfiles. The current backend was verified with Node.js 24.
- A local MongoDB server. The current development database is a standalone server named `nexus_arena`.
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
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/nexus_arena` | MongoDB connection |
| `JWT_SECRET` | Set locally; no example secret is supplied | JWT signing key, minimum 32 bytes |
| `JWT_EXPIRES_IN` | `1h` | JWT lifetime accepted by jsonwebtoken |
| `BOOKING_MIN_DURATION_MINUTES` | `30` | Minimum session length |
| `BOOKING_MAX_DURATION_MINUTES` | `720` | Maximum session length |
| `BOOKING_DURATION_STEP_MINUTES` | `30` | Allowed duration increment |
| `BOOKING_LOCK_TTL_MS` | `120000` | Station reservation lease duration; allowed range 10,000–600,000 ms |

Start MongoDB before starting the backend. The connection string may include credentials in a local `.env` when authentication is enabled; never put them in tracked files.

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

The API listens at `http://localhost:5000` by default. The Vite development server prints its local URL. The current home page is a static prototype and does not yet call these APIs.

## Local workflow and checks

- Backend syntax: `Get-ChildItem src -Recurse -Filter '*.js' | ForEach-Object { node --check $_.FullName }` from `server/`.
- Backend integration tests: `npm test` from `server/`. MongoDB must be running and `MONGODB_URI` configured. Tests use unique temporary records and clean them up.
- Frontend production build: `npm run build` from `client/`.
- Frontend lint: `npm run lint` from `client/`.
- API health check: `GET http://localhost:5000/api/v1/health`.

## Troubleshooting

- **MongoDB connection fails:** confirm the MongoDB service is running and that the local URI and database permissions are correct.
- **JWT configuration error:** set `JWT_SECRET` to a unique value of at least 32 bytes and set `JWT_EXPIRES_IN` in `server/.env`.
- **Booking lease conflict:** retry after the current reservation finishes; abandoned leases become reclaimable after `BOOKING_LOCK_TTL_MS`.
- **Booking duration rejected:** use a duration within the configured minimum/maximum and aligned to the configured step.
- **Timestamp rejected:** send a valid ISO 8601 timestamp with `Z` or an explicit offset such as `+05:30`.
- **Integration tests fail to connect:** ensure the test database is local, available, and not being reset while the suite runs.
