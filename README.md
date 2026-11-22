# NEXUS ARENA — Gaming Lounge & Station Booking System

NEXUS ARENA is an academic gaming lounge project for station discovery, user authentication, and time-based gaming station reservations. The React client currently presents a static home-page prototype; the REST backend implements authentication, station management, and booking APIs.

## Implemented features

- User registration and login with bcrypt password hashing and JWT authentication.
- Admin-only station management and public station search, filtering, and pagination.
- Availability checks, future bookings, server-calculated integer-paise pricing, booking history, cancellation, and admin booking views.
- MongoDB-backed reservation leases to coordinate concurrent booking API requests on the local standalone MongoDB setup.

Wallet and transaction flows, notifications, and frontend API integration are planned milestones. Booking cancellation does not issue a wallet refund.

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

Configure `server/.env` using [the environment guide](docs/development.md). Start a local MongoDB server, then run the API and client in separate terminals:

```powershell
cd server
npm run dev
```

```powershell
cd client
npm run dev
```

Run backend integration checks from `server/` with `npm test`. These tests require the configured MongoDB database.

## Documentation

- [Project requirements and scope](docs/project.md)
- [Milestones and progress](docs/phases.md)
- [System architecture](docs/architecture.md)
- [Database models](docs/database.md)
- [REST API reference](docs/api.md)
- [Development setup and troubleshooting](docs/development.md)
