# Development phases

## Milestone 1: Backend foundation — COMPLETED

**Objective:** Establish the Node.js and Express service and connect it to local MongoDB.

**Deliverables:** Express application and server entry point, Mongoose connection, environment example, CORS and Helmet configuration, health endpoint, centralized errors, and development/start scripts.

## Milestone 2: Database models — COMPLETED

**Objective:** Define the persistent records needed for users, stations, bookings, wallets, transactions, and notifications.

**Deliverables:** Six timestamped Mongoose models, relationship references, validation, unique constraints, and indexes.

## Milestone 3: Authentication — COMPLETED

**Objective:** Authenticate users and enforce user/admin permissions.

**Deliverables:** Validated registration and login, bcrypt password hashes, JWT generation and verification, safe profile endpoint, role middleware, wallet creation at registration, and expiry-based stateless logout behavior.

## Milestone 4: Station management — COMPLETED

**Objective:** Provide station inventory operations and public station discovery.

**Deliverables:** Admin create/update/status/deactivate APIs, public details and active listing, search, type filtering, and pagination.

## Milestone 5: Booking system — COMPLETED

**Objective:** Check availability and create, view, filter, and cancel future station reservations.

**Deliverables:** Timezone-explicit availability and booking APIs, overlap checks using half-open intervals, configurable session duration rules, backend paise pricing, user/admin booking access, cancellation rules, pagination, and expiring station reservation leases for concurrent booking API requests.

## Milestone 6: Wallet and transactions — COMPLETED

**Objective:** Add wallet history and atomic, auditable balance changes for simulated top-ups, booking charges, refunds, and administrator adjustments.

**Deliverables:** Authenticated wallet and transaction history APIs, configurable simulated top-ups, booking payment, refunds for successfully paid future bookings cancelled before start, and admin adjustments with mandatory reasons. Every balance and ledger operation uses a MongoDB session transaction on replica set `rs0`; unique references and conditional balance updates provide idempotency and prevent duplicate processing or negative balances. Top-ups are not real payments.

## Milestone 7: Notifications — PLANNED

**Objective:** Notify users of booking and account events.

**Deliverables:** Notification creation for wallet and booking events, unread/read state, user notification APIs, and a client notification view.

## Milestone 8: Frontend integration — PLANNED

**Objective:** Replace static prototype values with authenticated API-backed screens.

**Deliverables:** Registration/login, station filters, availability selection, booking flow/history, wallet and notification screens, loading/error states, and responsive behavior.

## Milestone 9: Testing and deployment — PLANNED

**Objective:** Prepare the application for demonstration and repeatable deployment.

**Deliverables:** Broader automated tests, validation of operational setup, deployment configuration, backup and security review, and final project documentation.
