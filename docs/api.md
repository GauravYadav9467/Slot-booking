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

Creation returns HTTP 201 with the station record. Public listing returns `{ "items": [...], "pagination": { "page", "limit", "total", "pages" } }` and only includes active stations.

## Implemented: bookings

| Method | Endpoint | Authentication | Role |
|---|---|---|---|
| GET | `/bookings/availability` | None | Public availability check |
| POST | `/bookings` | Bearer token | Any active user |
| GET | `/bookings/my` | Bearer token | Own booking history |
| GET | `/bookings/:id` | Bearer token | Owner or admin |
| PATCH | `/bookings/:id/cancel` | Bearer token | Owner or admin |
| GET | `/bookings/admin` | Bearer token | Admin |

Availability query parameters: `stationId`, `startAt`, `endAt`. Timestamps must be ISO 8601 with an explicit offset, for example:

```text
GET /api/v1/bookings/availability?stationId=665f00000000000000000001&startAt=2027-01-10T18%3A00%3A00%2B05%3A30&endAt=2027-01-10T19%3A00%3A00%2B05%3A30
```

The response includes `available`, `reason`, `durationMinutes`, `hourlyRateMinor`, `estimatedTotalMinor`, and `currency`. A non-active station returns `available: false`; a missing station returns 404.

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

`GET /bookings/my` accepts `status`, `page`, and `limit`. `GET /bookings/admin` accepts `status`, `stationId`, `from`, `to`, `page`, and `limit`; `from` is inclusive and `to` is exclusive. Both lists sort by session start descending and return `{ "items": [...], "pagination": { "page", "limit", "total", "pages" } }`. Booking details are available to the owner or an admin; a non-owner receives 404.

Cancellation accepts an optional reason:

```json
{ "reason": "Plans changed" }
```

Only pending or confirmed bookings that have not started can be cancelled. Missing reasons are recorded as `Cancelled by user.` or `Cancelled by admin.`. No wallet refund is performed in this milestone.

## Error responses

| HTTP status | Meaning |
|---|---|
| 400 | Invalid fields, IDs, timestamp, duration, or pagination |
| 401 | Missing or invalid authentication |
| 403 | Role or account does not permit the operation |
| 404 | Station or booking does not exist; a user does not own the booking |
| 409 | Duplicate/conflicting booking, unavailable station, active reservation lease, or ineligible cancellation |
| 422 | Price exceeds supported integer limits |
| 500 | Unexpected server error; internal database details are not returned |

## Planned APIs

Wallet balance, top-up, transaction, refund, and notification APIs are not implemented. Frontend API integration is also planned.
