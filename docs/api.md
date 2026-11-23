# REST API reference

Base URL: `http://localhost:5000/api/v1`. JSON endpoints use `{ "status": "success", "data": ... }` responses. Protected endpoints require `Authorization: Bearer <token>`.

## Implemented: health

| Method | Endpoint | Authentication | Description |
|---|---|---|---|
| GET | `/health` | None | API and MongoDB connection status |

## Implemented: authentication

| Method | Endpoint | Authentication | Role |
|---|---|---|---|
| POST | `/auth/register` | None | Public user registration |
| POST | `/auth/login` | None | User login |
| GET | `/auth/me` | Bearer token | Any active user |
| POST | `/auth/logout` | Bearer token | Expiry-based client logout response |

Register request:

```json
{
  "name": "Aarav Mehta",
  "email": "aarav@example.test",
  "phone": "+919876543210",
  "password": "Example-only-password"
}
```

Registration returns HTTP 201 and a safe user profile and creates a wallet. A `role` field is not accepted. Login requires `email` and `password`, and returns HTTP 200 with `{ "user": { "id", "name", "email", "phone", "role", "status" }, "token": "..." }`; the password hash is not returned. `/auth/me` returns the same safe profile shape. `/auth/logout` tells the client to discard its token; it does not revoke an already-issued JWT.

Example safe profile:

```json
{
  "id": "665f00000000000000000002",
  "name": "Aarav Mehta",
  "email": "aarav@example.test",
  "phone": "+919876543210",
  "role": "user",
  "status": "active"
}
```

## Implemented: stations

| Method | Endpoint | Authentication | Role |
|---|---|---|---|
| GET | `/stations` | None | Public; active stations only |
| GET | `/stations/:id` | None | Public station details |
| POST | `/stations` | Bearer token | Admin |
| PATCH | `/stations/:id` | Bearer token | Admin |
| PATCH | `/stations/:id/status` | Bearer token | Admin |
| DELETE | `/stations/:id` | Bearer token | Admin; deactivates, does not delete |

`GET /stations` accepts `type` (`PC`, `Console`, `VR`), `search`, `page`, and `limit` (maximum 100). Admin creation accepts station fields including `name`, `code`, `type`, `hourlyRateMinor`, `specifications`, and `installedGames`. Status updates accept `{ "status": "maintenance" }`.

Example create request:

```json
{
  "name": "Arena PC 01",
  "code": "PC-01",
  "type": "PC",
  "hourlyRateMinor": 12000,
  "specifications": { "gpu": "RTX 4070" },
  "installedGames": ["Valorant", "Counter-Strike 2"]
}
```

Creation returns HTTP 201 with the station record. Public listing returns `{ "stations": [...], "pagination": { "page", "limit", "total", "totalPages" } }` and only includes active stations.

## Implemented: bookings

| Method | Endpoint | Authentication | Role |
|---|---|---|---|
| GET | `/bookings/availability` | None | Public availability check |
| POST | `/bookings` | Bearer token | Any active user |
| POST | `/bookings/:id/pay` | Bearer token | Booking owner |
| GET | `/bookings/my` | Bearer token | Own booking history |
| GET | `/bookings/:id` | Bearer token | Owner or admin |
| PATCH | `/bookings/:id/cancel` | Bearer token | Owner or admin |
| GET | `/bookings/admin` | Bearer token | Admin |

Availability query parameters: `stationId`, `startAt`, `endAt`. Timestamps must be ISO 8601 with an explicit offset, for example:

```text
GET /api/v1/bookings/availability?stationId=665f00000000000000000001&startAt=2027-01-10T18%3A00%3A00%2B05%3A30&endAt=2027-01-10T19%3A00%3A00%2B05%3A30
```

The response includes `available`, `reason`, `durationMinutes`, `hourlyRateMinor`, `estimatedTotalMinor`, and `currency`. A non-active station returns `available: false`; a missing station returns 404.

Booking start dates are limited to today and the next two calendar days in `Asia/Kolkata`. This restriction is checked by the backend for both availability and creation; the client date controls are only a convenience.

Example available response:

```json
{
  "available": true,
  "reason": null,
  "durationMinutes": 60,
  "hourlyRateMinor": 12000,
  "estimatedTotalMinor": 12000,
  "currency": "INR"
}
```

Booking creation accepts only station and time fields; user ID, status, and price fields are server-controlled:

```json
{
  "stationId": "665f00000000000000000001",
  "startAt": "2027-01-10T18:00:00+05:30",
  "endAt": "2027-01-10T19:00:00+05:30"
}
```

The response is HTTP 201 with a booking containing `userId` from the verified JWT, UTC ISO timestamps, `pending` status, and a paise `priceSnapshot`. For a one-hour session at 12,000 paise per hour, the price snapshot is:

```json
{
  "hourlyRateMinor": 12000,
  "subtotalMinor": 12000,
  "discountMinor": 0,
  "totalMinor": 12000
}
```

`GET /bookings/my` accepts `status`, `page`, and `limit`. `GET /bookings/admin` accepts `status`, `stationId`, `from`, `to`, `page`, and `limit`; `from` is inclusive and `to` is exclusive. Both lists sort by session start descending and return `{ "bookings": [...], "pagination": { "page", "limit", "total", "totalPages" } }`. Booking details are available to the owner or an admin; a non-owner receives 404.

Cancellation accepts an optional reason:

```json
{ "reason": "Plans changed" }
```

Only pending or confirmed bookings that have not started can be cancelled. Missing reasons are recorded as `Cancelled by user.` or `Cancelled by admin.`. Cancellation refunds a successful wallet payment in the same MongoDB transaction; unpaid bookings are cancelled without a refund. Refund ledger entries are unique per booking.

Pay for an eligible booking with `POST /bookings/:id/pay`. The request has no body; client-supplied amounts are rejected. The server charges `priceSnapshot.totalMinor`, deducts the owner's wallet, writes a `booking_charge` transaction, and changes the booking to `confirmed` / `paid` atomically. Repeating payment returns the original charge without deducting again. A zero-price booking is confirmed with `paymentStatus: "not_required"` and creates no financial ledger record. Example response shape:

```json
{
  "status": "success",
  "data": {
    "booking": { "id": "665f00000000000000000003", "status": "confirmed", "paymentStatus": "paid" },
    "transaction": { "type": "booking_charge", "direction": "debit", "amountMinor": 12000, "currency": "INR", "status": "success" },
    "wallet": { "balanceMinor": 38000, "currency": "INR", "status": "active" },
    "idempotent": false
  }
}
```

## Implemented: wallets and transactions

| Method | Endpoint | Authentication | Role |
|---|---|---|---|
| GET | `/wallet` | Bearer token | Current user's wallet only |
| GET | `/wallet/transactions` | Bearer token | Current user's history only |
| POST | `/wallet/top-up` | Bearer token + `Idempotency-Key` | Current user; simulated only |
| POST | `/wallet/admin/adjustments` | Bearer token + `Idempotency-Key` | Admin |

`GET /wallet` accepts no query parameters and returns `{ "wallet": { "id", "balanceMinor", "currency", "status", "updatedAt" } }`. The user ID comes from the authenticated token.

`GET /wallet/transactions` accepts `type` (`top_up`, `booking_charge`, `refund`, `adjustment`), `status` (`pending`, `success`, `failed`), `page`, and `limit` (maximum 100). It returns the current user's transactions newest first with pagination. Other user, wallet, and credential fields are not returned.

Top-up accepts a positive integer `amountMinor` in paise. The default configurable limits are 100 to 1,000,000 paise (₹1 to ₹10,000), set by `WALLET_TOPUP_MIN_MINOR` and `WALLET_TOPUP_MAX_MINOR`. Example:

```http
POST /api/v1/wallet/top-up
Authorization: Bearer <token>
Idempotency-Key: terminal-session-2026-0001
Content-Type: application/json
```

```json
{ "amountMinor": 50000 }
```

The service labels the ledger entry as a simulated top-up. It does not call a payment provider or imply money was received. A new operation returns HTTP 201; replaying the same key and same amount returns HTTP 200 without a second credit. Reusing a key with different details returns 409.

Admins may adjust a user's wallet with a required reason, direction, positive integer paise amount, and target `userId`. Example body:

```json
{ "userId": "665f00000000000000000002", "direction": "credit", "amountMinor": 500, "reason": "Till reconciliation correction" }
```

The request also requires an `Idempotency-Key`. Adjustments are recorded as `adjustment` transactions; no direct balance-only operation is exposed.

Financial operations use MongoDB sessions and multi-document transactions on replica set `rs0`. Unique transaction references make top-ups, adjustments, booking charges, and refunds idempotent. Conditional balance updates prevent negative balances. Balance changes, ledger records, and booking payment/refund state commit or roll back together. There is no standalone-server fallback.

## Error responses

| HTTP status | Meaning |
|---|---|
| 400 | Invalid fields, IDs, timestamp, duration, or pagination |
| 401 | Missing or invalid authentication |
| 403 | Role or account does not permit the operation |
| 404 | Station or booking does not exist; a user does not own the booking |
| 409 | Duplicate/conflicting booking or idempotency key, unavailable station, active reservation lease, insufficient balance, or ineligible payment/cancellation |
| 422 | Price exceeds supported integer limits |
| 500 | Unexpected server error; internal database details are not returned |

## Client integration

The client uses the endpoints above for registration, login, profile, public stations, availability, booking creation/payment/history/cancellation, wallet history/top-ups, and admin booking/station changes. The admin station screen can only list active stations because `GET /stations` intentionally filters to active records; no all-status admin listing endpoint currently exists. Notification APIs and client notifications are not implemented. Top-ups are simulated; real payment-provider integration is not implemented.
