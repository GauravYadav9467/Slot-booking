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
- Record wallet activity atomically and preserve a transaction ledger for simulated top-ups, booking charges, refunds, and admin adjustments.

## Scope

The current implementation includes a React/Vite client integrated with REST APIs for authentication, station discovery, bookings, wallet transactions, and in-app notifications. The home page keeps its established visual design, while new user/admin pages follow its color and component conventions. Financial endpoints require MongoDB multi-document transactions on replica set `rs0`.

Wallet ledger operations are implemented as local simulations. Simulated top-ups do not integrate with a payment provider and do not claim real money was received. Notifications are delivered inside the application only; email, SMS and WhatsApp delivery are not implemented. Tournaments and real payment-provider integration are outside the current scope.

## Main features

### Implemented backend features

- User registration and login with bcrypt password hashes and JWT authentication.
- Safe current-user profile responses and admin role middleware.
- Station creation, updates, status changes, public listing, search, filtering, and pagination.
- Booking availability checks, future reservations, server-calculated prices, booking history, details, cancellation, and admin listing.
- Per-station expiring reservation leases to serialize concurrent booking API writes.
- Session-backed simulated wallet top-ups, booking payment deductions, eligible cancellation refunds, and administrator adjustments.
- Idempotency references and transaction-backed balance changes to prevent duplicate credits, charges, and refunds.
- User-scoped notification history and unread state for booking, payment, top-up and refund events; booking and financial notifications commit atomically with their associated operations.

### Current client

The client provides registration, login, profile, station detail, booking checkout/history/details, wallet, transaction history, notification history and a navbar notification panel, an admin dashboard, all-status station management, and admin booking views. It uses live backend data and includes loading, empty, success, and error feedback. Top-ups are clearly labeled simulations. Admin station listing includes active, maintenance, and inactive records, while public discovery remains limited to active stations.

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
8. Users can view their own wallet and transaction history, make simulated top-ups, and pay for their own eligible bookings.
9. Successfully paid future bookings are refunded when cancelled before start; unpaid cancellations do not create refunds.
10. Administrators can make reasoned wallet adjustments, recorded as ledger entries.
11. The system retains cancelled bookings and transaction records for history.
12. Users can review, filter, and mark their in-app notifications as read; administrators can review booking operations.

Broader frontend automated tests and deployment work remain for Milestone 9.

## Non-functional requirements

- Validate request data and return consistent HTTP errors.
- Do not expose password hashes or trust client-supplied user IDs or prices.
- Keep secrets in ignored environment files, not in source control.
- Store timestamps as UTC dates; accept explicit ISO 8601 offsets at the API boundary.
- Commit wallet balance changes, ledger entries, and booking payment/refund state in MongoDB sessions and transactions.
- Require unique idempotency references and conditional balance updates to prevent duplicate processing and negative balances.
- Use indexes for ownership, station time conflicts, unique identifiers, and reservation locks.
- Keep API modules small and separated into routes, controllers, services, models, and validators.
