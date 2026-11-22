# NEXUS ARENA

## Project introduction

NEXUS ARENA is a gaming lounge and station booking system. It is designed to let lounge customers find available gaming stations and reserve a session, while administrators manage stations and review bookings.

## Problem statement

Station availability, session times, and booking records are difficult to coordinate when they are handled manually. A shared application can present station information, validate reservations centrally, and retain a consistent booking history.

## Objectives

- Provide public station discovery with type filters, search, and pagination.
- Authenticate customers and restrict administrative operations by role.
- Check station availability and prevent overlapping reservations.
- Keep booking prices and statuses on the server as authoritative records.
- Provide a foundation for later wallet, notification, and frontend integration work.

## Scope

The current implementation includes a React/Vite client prototype and a REST backend for health checks, authentication, station management, and bookings. The client currently displays a static station and checkout concept; it is not connected to these APIs.

Wallet funding, refunds, transaction processing, notifications, tournaments, and payment-provider integration are outside the completed scope. They are planned for later milestones.

## Main features

### Implemented backend features

- User registration and login with bcrypt password hashes and JWT authentication.
- Safe current-user profile responses and admin role middleware.
- Station creation, updates, status changes, public listing, search, filtering, and pagination.
- Booking availability checks, future reservations, server-calculated prices, booking history, details, cancellation, and admin listing.
- Per-station expiring reservation leases to serialize booking API writes on standalone MongoDB.

### Current client

The React client renders a NEXUS ARENA home page with a station-card and checkout layout. Its values are static; login, station browsing, and booking are not yet wired to the backend.

## User roles

- **User:** register, log in, view stations, create bookings, view their own bookings, and cancel eligible bookings.
- **Admin:** use the user capabilities and manage stations or view and manage all bookings.

Public registration always assigns the `user` role. There is no public admin-registration route.

## Technology stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Backend: Node.js, Express.js, CommonJS JavaScript.
- Database and ODM: MongoDB, Mongoose.
- Authentication: bcryptjs and JSON Web Tokens.
- Backend middleware: dotenv, CORS, Helmet, request validation, and centralized error handling.

## Functional requirements

1. Users can register with a name, email, phone, and password; email is normalized and passwords are hashed.
2. Users can authenticate with a JWT and retrieve a safe profile.
3. Administrators can maintain gaming station details and operational status.
4. Public users can view active stations and check time-specific availability.
5. Authenticated users can book an active station for a valid future interval.
6. The server calculates the booking price in integer paise and preserves the rate snapshot.
7. Users can view and cancel their own eligible bookings; administrators can view all bookings.
8. The system retains cancelled and deactivated records for history.

Wallet balances, transaction processing, notifications, and a connected client booking flow remain planned work.

## Non-functional requirements

- Validate request data and return consistent HTTP errors.
- Do not expose password hashes or trust client-supplied user IDs or prices.
- Keep secrets in ignored environment files, not in source control.
- Store timestamps as UTC dates; accept explicit ISO 8601 offsets at the API boundary.
- Use indexes for ownership, station time conflicts, unique identifiers, and reservation locks.
- Keep API modules small and separated into routes, controllers, services, models, and validators.
