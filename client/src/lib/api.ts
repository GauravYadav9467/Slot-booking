export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  status: "active" | "blocked";
};

export type Station = {
  id: string;
  name: string;
  code: string;
  type: "PC" | "Console" | "VR";
  description?: string;
  specifications?: Record<string, unknown>;
  installedGames?: string[];
  hourlyRateMinor: number;
  currency: string;
  status: "active" | "maintenance" | "inactive";
  image?: string;
};

export type Booking = {
  id: string;
  userId: string;
  stationId: string;
  station?: Pick<Station, "id" | "name" | "code" | "type" | "status">;
  user?: { id: string; name: string; email: string; phone?: string };
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  paymentStatus: "unpaid" | "paid" | "refunded" | "not_required";
  priceSnapshot: { hourlyRateMinor: number; subtotalMinor: number; discountMinor: number; totalMinor: number };
  currency: string;
  transactionId?: string | null;
  refundTransactionId?: string | null;
  cancellationReason?: string;
};

export type Wallet = { id: string; balanceMinor: number; currency: string; status: "active" | "blocked"; updatedAt: string };
export type Transaction = {
  id: string;
  type: "top_up" | "booking_charge" | "refund" | "adjustment";
  direction: "credit" | "debit";
  amountMinor: number;
  currency: string;
  status: "pending" | "success" | "failed";
  reference: string;
  description?: string;
  bookingId?: string | null;
  createdAt: string;
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedBookingId: string | null;
  relatedTransactionId: string | null;
  readAt: string | null;
  createdAt: string;
};
export type AdminOverview = {
  stations: { active: number; maintenance: number; inactive: number };
  bookings: { total: number; pending: number; confirmed: number; cancelled: number; completed: number; no_show: number };
  recentBookings: Array<{ id: string; user: string; station: string; startAt: string; status: Booking["status"]; paymentStatus: Booking["paymentStatus"] }>;
  recentNotifications: Notification[];
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Page<T> = { [key: string]: T[] | Pagination };
export type Availability = {
  stationId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  hourlyRateMinor: number;
  estimatedTotalMinor: number;
  currency: string;
  available: boolean;
  reason: string | null;
  message: string;
};

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  idempotencyKey?: string;
};

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown, fallback = "The request could not be completed.") {
  return error instanceof Error ? error.message : fallback;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Could not reach the NEXUS ARENA service. Check the API connection and try again.");
  }

  const payload = await response.json().catch(() => null) as {
    status?: string;
    message?: string;
    details?: string[];
    data?: T;
  } | null;

  if (!response.ok) {
    if (response.status === 401 && options.token) {
      localStorage.removeItem("nexusArenaToken");
      window.dispatchEvent(new Event("nexus-auth-expired"));
    }
    throw new ApiError(response.status, payload?.message || `Request failed (${response.status}).`, payload?.details);
  }
  if (!payload || !Object.hasOwn(payload, "data")) {
    throw new ApiError(502, "The service returned an unexpected response.");
  }
  return payload.data as T;
}

export function formatMinor(amountMinor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amountMinor / 100);
}

export function getLogin(email: string, password: string) {
  return apiRequest<{ user: User; token: string }>("/auth/login", { method: "POST", body: { email, password } });
}

export function registerUser(input: { name: string; email: string; phone: string; password: string }) {
  return apiRequest<{ user: User }>("/auth/register", { method: "POST", body: input });
}

export function getProfile(token: string) {
  return apiRequest<{ user: User }>("/auth/me", { token });
}

export function logoutRequest(token: string) {
  return apiRequest<unknown>("/auth/logout", { method: "POST", token });
}

export function getStations(params: { type?: string; search?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return apiRequest<{ stations: Station[]; pagination: Pagination }>(`/stations${query.size ? `?${query}` : ""}`);
}

export function getAdminStations(token: string, params: { type?: string; search?: string; status?: Station["status"]; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return apiRequest<{ stations: Station[]; pagination: Pagination }>(`/stations/admin${query.size ? `?${query}` : ""}`, { token });
}

export function getStation(id: string) {
  return apiRequest<{ station: Station }>(`/stations/${encodeURIComponent(id)}`);
}

export function createStation(token: string, body: Partial<Station> & Pick<Station, "name" | "code" | "type" | "hourlyRateMinor">) {
  return apiRequest<{ station: Station }>("/stations", { method: "POST", token, body });
}

export function updateStation(token: string, id: string, body: Partial<Station>) {
  return apiRequest<{ station: Station }>(`/stations/${encodeURIComponent(id)}`, { method: "PATCH", token, body });
}

export function updateStationStatus(token: string, id: string, status: Station["status"]) {
  return apiRequest<{ station: Station }>(`/stations/${encodeURIComponent(id)}/status`, { method: "PATCH", token, body: { status } });
}

export function deactivateStation(token: string, id: string) {
  return apiRequest<{ station: Station }>(`/stations/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export function getAvailability(params: { stationId: string; startAt: string; endAt: string }) {
  const query = new URLSearchParams(params);
  return apiRequest<Availability>(`/bookings/availability?${query}`);
}

export function createBooking(token: string, body: { stationId: string; startAt: string; endAt: string }) {
  return apiRequest<{ booking: Booking }>("/bookings", { method: "POST", token, body });
}

export function getMyBookings(token: string, params: { status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
  return apiRequest<{ bookings: Booking[]; pagination: Pagination }>(`/bookings/my${query.size ? `?${query}` : ""}`, { token });
}

export function getBooking(token: string, id: string) {
  return apiRequest<{ booking: Booking }>(`/bookings/${encodeURIComponent(id)}`, { token });
}

export function cancelBooking(token: string, id: string, reason?: string) {
  return apiRequest<{ booking: Booking; refund?: Transaction; wallet?: Wallet }>(`/bookings/${encodeURIComponent(id)}/cancel`, {
    method: "PATCH", token, body: reason ? { reason } : {},
  });
}

export function payBooking(token: string, id: string) {
  return apiRequest<{ booking: Booking; transaction: Transaction | null; wallet: Wallet | null; idempotent: boolean }>(
    `/bookings/${encodeURIComponent(id)}/pay`, { method: "POST", token },
  );
}

export function getAdminBookings(token: string, params: { status?: string; stationId?: string; from?: string; to?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
  return apiRequest<{ bookings: Booking[]; pagination: Pagination }>(`/bookings/admin${query.size ? `?${query}` : ""}`, { token });
}

export function getAdminOverview(token: string) {
  return apiRequest<{ overview: AdminOverview }>("/admin/overview", { token });
}

export function getNotifications(token: string, params: { status?: "unread" | "read"; scope?: "operations"; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  return apiRequest<{ notifications: Notification[]; pagination: Pagination }>(`/notifications${query.size ? `?${query}` : ""}`, { token });
}

export function getUnreadNotificationCount(token: string) {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count", { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiRequest<{ notification: Notification }>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", token });
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<{ markedRead: number }>("/notifications/read-all", { method: "PATCH", token });
}

export function getWallet(token: string) {
  return apiRequest<{ wallet: Wallet }>("/wallet", { token });
}

export function getTransactions(token: string, params: { type?: string; status?: string; page?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) query.set(key, String(value)); });
  return apiRequest<{ transactions: Transaction[]; pagination: Pagination }>(`/wallet/transactions${query.size ? `?${query}` : ""}`, { token });
}

export function topUpWallet(token: string, amountMinor: number, idempotencyKey: string) {
  return apiRequest<{ transaction: Transaction; wallet: Wallet; idempotent: boolean }>("/wallet/top-up", {
    method: "POST", token, body: { amountMinor }, idempotencyKey,
  });
}

export function adjustWallet(token: string, body: { userId: string; direction: "credit" | "debit"; amountMinor: number; reason: string }, idempotencyKey: string) {
  return apiRequest<{ transaction: Transaction; wallet: Wallet; idempotent: boolean }>("/wallet/admin/adjustments", {
    method: "POST", token, body, idempotencyKey,
  });
}
