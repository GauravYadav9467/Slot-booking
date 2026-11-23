# Database design

All models use Mongoose timestamps. ObjectId `ref` fields support application-level population; MongoDB does not enforce foreign keys. Money is stored as integer paise (`INR`), never floating-point rupees.

## User

| Field | Type | Rules |
|---|---|---|
| `name` | String | Required, trimmed |
| `email` | String | Required, unique, lowercase, trimmed |
| `passwordHash` | String | Required, excluded from queries by default |
| `phone` | String | Optional, trimmed |
| `role` | String | `user` or `admin`; defaults to `user` |
| `status` | String | `active` or `blocked`; defaults to `active` |

Unique index: `email`.

## Station

| Field | Type | Rules |
|---|---|---|
| `name` | String | Required, trimmed |
| `code` | String | Required, unique, uppercase, trimmed |
| `type` | String | `PC`, `Console`, or `VR` |
| `description` | String | Optional, trimmed |
| `specifications` | Mixed object | Defaults to an empty object |
| `installedGames` | Array of String | Defaults to an empty array |
| `hourlyRateMinor` | Number | Required, non-negative safe integer paise |
| `currency` | String | Defaults to `INR` |
| `status` | String | `active`, `maintenance`, or `inactive`; defaults to `active` |
| `image` | String | Optional, trimmed |

Unique index: `code`.

## Booking

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId → User | Required |
| `stationId` | ObjectId → Station | Required |
| `startAt`, `endAt` | Date | Required; end must be later than start |
| `durationMinutes` | Number | Required positive integer |
| `status` | String | `pending`, `confirmed`, `cancelled`, `completed`, `no_show`; defaults to `pending` |
| `paymentStatus` | String | `unpaid`, `paid`, `refunded`, or `not_required` for a zero-price booking; defaults to `unpaid` |
| `priceSnapshot.hourlyRateMinor` | Number | Required non-negative safe integer paise |
| `priceSnapshot.subtotalMinor` | Number | Required non-negative safe integer paise |
| `priceSnapshot.discountMinor` | Number | Non-negative safe integer paise; defaults to 0 |
| `priceSnapshot.totalMinor` | Number | Required non-negative safe integer paise |
| `currency` | String | Defaults to `INR` |
| `transactionId` | ObjectId → Transaction | Optional |
| `refundTransactionId` | ObjectId → Transaction | Optional refund ledger record |
| `cancellationReason` | String | Optional, trimmed |

Indexes support station/status/time overlap checks, user history sorted by session date, and admin status/date filtering. `pending` and `confirmed` bookings block overlap. `cancelled`, `completed`, and `no_show` bookings do not.

## Wallet

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId → User | Required, unique |
| `balanceMinor` | Number | Non-negative safe integer paise; defaults to 0 |
| `currency` | String | Defaults to `INR` |
| `status` | String | `active` or `blocked` |

Unique index: `userId`.

## Transaction

| Field | Type | Rules |
|---|---|---|
| `walletId` | ObjectId → Wallet | Required |
| `userId` | ObjectId → User | Required |
| `bookingId` | ObjectId → Booking | Optional |
| `type` | String | `top_up`, `booking_charge`, `refund`, or `adjustment` |
| `direction` | String | `credit` or `debit` |
| `amountMinor` | Number | Required positive safe integer paise |
| `currency` | String | Defaults to `INR` |
| `status` | String | `pending`, `success`, or `failed` |
| `reference` | String | Required, unique, trimmed |
| `description` | String | Optional, trimmed |

Indexes: unique `reference` for idempotency; `{ userId, createdAt }` for transaction history. Top-up and admin-adjustment references are hashed from the caller's idempotency key; booking charge and refund references are deterministic from the booking ID.

## Notification

| Field | Type | Rules |
|---|---|---|
| `userId` | ObjectId → User | Required |
| `type`, `title`, `message` | String | Required, trimmed |
| `relatedBookingId` | ObjectId → Booking | Optional |
| `relatedTransactionId` | ObjectId → Transaction | Optional |
| `readAt` | Date | Optional; unset means unread |

Indexes support per-user chronological and read-state queries.

## StationReservationLock (supporting model)

This seventh, internal model serializes concurrent booking API writes per station. It is separate from financial transaction handling, which uses MongoDB replica-set transactions.

| Field | Type | Rules |
|---|---|---|
| `stationId` | ObjectId → Station | Required, unique; one lease owner per station |
| `token` | String | Required random lease token |
| `expiresAt` | Date | Required lease expiry |

The unique `stationId` index makes acquisition atomic. A holder releases only its own token. If a process exits, a later request can atomically replace an expired lease. Expired records remain dormant until reclaimed; at most one record exists per station. This model is internal and is not exposed by the API.

## Financial integrity

All balance changes, transaction inserts, and booking payment/refund state changes run in one MongoDB session transaction on replica set `rs0`. The wallet update uses a conditional balance predicate to prevent negative balances and integer overflow. If the ledger insert or booking update fails, the transaction aborts. Unique transaction references and booking `paymentStatus` prevent duplicate charges and refunds. No financial fallback is performed when transactions are unavailable.
