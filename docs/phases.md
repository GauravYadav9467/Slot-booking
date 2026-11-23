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

## Milestone 7: Frontend and backend integration — COMPLETED

**Objective:** Connect the NEXUS ARENA client to the existing authenticated REST APIs while retaining the established home-page design.

**Implemented:** Central API client, environment-based API URL, persistent login and protected routes, registration/login/profile/logout, live station search and type filtering, availability and server quotes, booking creation/payment/history/cancellation, wallet and simulated top-ups, transaction history, and admin booking and all-status station management screens. New pages use the home page's dark teal, cyan and charcoal visual system. Backend booking validation limits reservations to today and the next two Asia/Kolkata calendar days.

Notifications are tracked separately in Milestone 8.

## Milestone 8: In-app notifications and operational improvements — COMPLETED

**Objective:** Provide private in-app booking and wallet notifications and show administrators current operational activity.

**Implemented:** Authenticated, user-scoped notification listing, unread count, mark-one-read and mark-all-read APIs; unread/read filters and pagination; unique per-recipient event references; in-app notifications for booking creation, confirmation, payment, cancellation, wallet top-up and refund; a responsive navbar bell and history page; and an admin overview for station totals, booking status counts, recent bookings and operational notifications. Booking creation notifications and financial notifications are saved atomically with their related booking or wallet transaction. Notification writes are included in financial transactions so a failure rolls the complete operation back.

**Limitations:** Notifications are in-app only and are not pushed in real time; the client refreshes counts on navigation, focus, panel open and successful account actions. External messaging channels are not integrated.

## Milestone 9: Testing and deployment — PLANNED

**Objective:** Prepare the application for demonstration and repeatable deployment.

**Deliverables:** Broader automated tests, validation of operational setup, deployment configuration, backup and security review, and final project documentation.
