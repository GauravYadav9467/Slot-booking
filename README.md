# NEXUS ARENA — Gaming Lounge & Station Booking System

NEXUS ARENA is an academic gaming lounge project for station discovery, user authentication, station reservations, and simulated wallet payments. The React client integrates with the REST backend for authentication, station discovery, bookings and wallets. The existing home page design is retained and the connected account pages follow its dark teal and cyan visual style.

## Implemented features

- User registration and login with bcrypt password hashing and JWT authentication.
- Admin-only station management and public station search, filtering, and pagination.
- Availability checks, future bookings, server-calculated integer-paise pricing, booking history, cancellation, and admin booking views.
- MongoDB-backed reservation leases to coordinate concurrent booking API requests.
- Transaction-backed simulated wallet top-ups, booking charges, cancellation refunds, transaction history, and admin adjustments.
- User-scoped in-app notifications for booking and wallet events, plus an operational admin dashboard.

Top-ups are a local simulation and do not charge a payment method or represent funds received. Booking creation and wallet/booking financial updates use MongoDB replica-set transactions so their notifications stay atomic with the related records. Notifications are in-app only; email, SMS, WhatsApp and payment-provider delivery are not implemented. Eligible future booking cancellations refund successful wallet charges; unpaid cancellations do not issue refunds. Admins can list and manage stations across active, maintenance, and inactive statuses; public station discovery remains active-only.

## Technology stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router.
- **Backend:** Node.js, Express.js, CommonJS JavaScript.
- **Database:** MongoDB and Mongoose.
- **Authentication:** bcryptjs and JSON Web Tokens.

## Repository structure

```text
client/                  React and Vite client
server/src/config/        MongoDB connection
server/src/controllers/   HTTP controllers
server/src/middleware/    Authentication, role checks, and errors
server/src/models/        Mongoose models
server/src/routes/        Versioned API routes
server/src/services/      Application and booking rules
server/src/validators/    Request validation
server/tests/             MongoDB-backed integration tests
docs/                     Project, architecture, data, API, and setup guides
```

## Installation and startup

Install frontend and backend dependencies separately:

```powershell
cd server
npm ci

cd ..\client
npm ci
```

Configure `server/.env` using [the environment guide](docs/development.md). Booking creation and financial APIs require a local MongoDB replica set named `rs0`; configure and verify it before starting the backend or running tests. Then run the API and client in separate terminals:

```powershell
cd server
npm run dev
```

```powershell
cd client
npm run dev
```

Run backend integration checks from `server/` with `npm test`. These tests require the configured `rs0` MongoDB replica set.

## Documentation

- [Project requirements and scope](docs/project.md)
- [Milestones and progress](docs/phases.md)
- [System architecture](docs/architecture.md)
- [Database models](docs/database.md)
- [REST API reference](docs/api.md)
- [Development setup and troubleshooting](docs/development.md)
