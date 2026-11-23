import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  adjustWallet, createWalkInBooking, formatMinor, getAdminAvailability, getAdminCustomerWallet, getAdminOverview,
  getAdminCustomers, getAdminStations, getAdminTransactions, getAvailability, getErrorMessage,
  type AdminCustomer, type AdminSchedule, type AdminScheduleSlot, type AdminTransaction,
  type AdminOverview, type Pagination, type Station, type Wallet,
} from "../lib/api";
import { bookingWindow, defaultKolkataSession, formatKolkataDateTime, kolkataDateOffset } from "../lib/bookingTime";
import { buttonPrimary, buttonSecondary, inputClass, LoadingState, Notice, PageHeading } from "../components/ui/Feedback";

function AdminPage({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[calc(100vh-210px)] min-w-0 px-4 py-7 sm:px-6 lg:px-8">{children}</main>;
}

function defaultPage(): Pagination { return { page: 1, limit: 20, total: 0, totalPages: 0 }; }

function localParts(iso: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function selectClass() { return `${inputClass} mt-1`; }

export function OwnerDashboardPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    getAdminOverview(token).then(({ overview: data }) => { if (active) setOverview(data); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  return <AdminPage><PageHeading eyebrow="OWNER OVERVIEW" title="Admin dashboard" description="Current lounge inventory, booking load, and operational activity from NEXUS ARENA." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    {loading ? <LoadingState label="Loading owner dashboard…" /> : overview && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{([ ["Total stations", overview.stations.total, "/admin/stations"], ["Active stations", overview.stations.active, "/admin/stations?status=active"], ["Maintenance", overview.stations.maintenance, "/admin/stations?status=maintenance"], ["Inactive", overview.stations.inactive, "/admin/stations?status=inactive"], ["Total bookings", overview.bookings.total, "/admin/bookings"], ["Today", overview.bookings.today, "/admin/bookings"], ["Upcoming", overview.bookings.upcoming, "/admin/bookings?status=confirmed"], ["Cancelled", overview.bookings.cancelled, "/admin/bookings?status=cancelled"] ] as const).map(([label, value, to]) => <Link key={label} to={to} className="rounded-xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-4 transition hover:border-[#00E5F5]"><p className="text-xs font-bold tracking-wide text-[#84919D]">{label}</p><p className="mt-2 text-3xl font-extrabold text-white">{value}</p></Link>)}</section>
      <section className="mt-7 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-white">Booking status</h2><Link to="/admin/bookings" className="text-xs font-semibold text-[#4DDCE9]">Open booking ledger</Link></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{([ ["Pending", overview.bookings.pending], ["Confirmed", overview.bookings.confirmed], ["Cancelled", overview.bookings.cancelled], ["Completed", overview.bookings.completed], ["No-show", overview.bookings.no_show] ] as const).map(([label, value]) => <div key={label} className="rounded-lg border border-[#263640] bg-[#0D1218] p-3"><p className="text-xs text-[#84919D]">{label}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>)}</div></section>
      <section className="mt-7 grid min-w-0 gap-5 xl:grid-cols-2"><div className="min-w-0 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:p-5"><h2 className="mb-3 text-lg font-bold text-white">Recent bookings</h2>{overview.recentBookings.length ? <div className="space-y-2">{overview.recentBookings.map((booking) => <Link key={booking.id} to={`/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#263640] bg-[#0D1218] p-3"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{booking.user} · {booking.station}</span><span className="mt-1 block text-xs text-[#84919D]">{formatKolkataDateTime(booking.startAt)}</span></span><span className="text-xs capitalize text-[#4DDCE9]">{booking.status} · {booking.paymentStatus}</span></Link>)}</div> : <p className="text-sm text-[#84919D]">No bookings recorded.</p>}</div><div className="min-w-0 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-bold text-white">Recent operations</h2><Link to="/admin/notifications" className="text-xs font-semibold text-[#4DDCE9]">All notifications</Link></div>{overview.recentNotifications.length ? <div className="space-y-2">{overview.recentNotifications.map((item) => <article key={item.id} className="rounded-lg border border-[#263640] bg-[#0D1218] p-3"><p className="text-sm font-semibold text-white">{item.title}</p><p className="mt-1 text-xs leading-5 text-[#A5B4BC]">{item.message}</p><p className="mt-1 text-[10px] text-[#74838D]">{formatKolkataDateTime(item.createdAt)}</p></article>)}</div> : <p className="text-sm text-[#84919D]">No operational notifications yet.</p>}</div></section>
    </>}
  </AdminPage>;
}

export function AdminAvailabilityPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => defaultKolkataSession(), []);
  const [date, setDate] = useState(initial.date);
  const [duration, setDuration] = useState(60);
  const [stationId, setStationId] = useState(searchParams.get("stationId") || "");
  const [schedule, setSchedule] = useState<AdminSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    getAdminAvailability(token, { date, durationMinutes: duration })
      .then((result) => { if (active) { setSchedule(result); setError(""); } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, date, duration]);

  const visibleStations = schedule?.stations.filter((station) => !stationId || station.id === stationId) || [];
  return <AdminPage>
    <PageHeading eyebrow="LIVE SCHEDULE" title="Slot availability" description="Server-generated availability for every station. Select a booked session to inspect it or choose an available slot for a walk-in booking." />
    <section className="mb-5 grid gap-3 rounded-xl border border-[#164B54] bg-[#151A20] p-4 sm:grid-cols-3">
      <label className="text-xs font-bold text-[#AAB7C0]">Schedule date<input aria-label="Schedule date" type="date" min={kolkataDateOffset(0)} max={kolkataDateOffset(2)} value={date} onChange={(event) => setDate(event.target.value)} className={selectClass()} /></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Session duration<select aria-label="Schedule duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={selectClass()}>{[30, 60, 90, 120, 180, 240, 360, 480, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}</option>)}</select></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Station<select aria-label="Filter schedule station" value={stationId} onChange={(event) => setStationId(event.target.value)} className={selectClass()}><option value="">All stations</option>{schedule?.stations.map((station) => <option key={station.id} value={station.id}>{station.name} · {station.status}</option>)}</select></label>
    </section>
    <p className="mb-4 text-xs text-[#84919D]">Times use Asia/Kolkata. Booking dates follow the public policy: today and the next two calendar days. Availability is calculated by the server and rechecked when a booking is submitted.</p>
    <div className="mb-4 flex flex-wrap gap-3 text-xs"><span className="rounded-md bg-[#123C36] px-3 py-2 text-[#38E8BA]">Available</span><span className="rounded-md bg-[#172A30] px-3 py-2 text-[#4DDCE9]">Booked / pending</span><span className="rounded-md bg-[#332A3C] px-3 py-2 text-[#C9A3E8]">Station unavailable</span><span className="rounded-md bg-[#282A2D] px-3 py-2 text-[#A5B4BC]">Past / processing</span></div>
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}
    {loading ? <LoadingState label="Loading the station schedule…" /> : visibleStations.length ? <div className="space-y-4">{visibleStations.map((station) => <section key={station.id} className="min-w-0 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold tracking-wide text-[#4DDCE9]">{station.code} · {station.type}</p><h2 className="mt-1 text-lg font-bold text-white">{station.name}</h2><p className="mt-1 text-xs text-[#A5B4BC]">{station.status} · {formatMinor(station.hourlyRateMinor)}/hour</p></div><Link to={`/admin/walk-in?stationId=${encodeURIComponent(station.id)}`} className="text-xs font-bold text-[#4DDCE9] hover:underline">New walk-in booking</Link></header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">{station.slots.map((slot: AdminScheduleSlot) => {
        const booking = slot.booking;
        const isBooked = slot.reason === "booked" && Boolean(booking);
        const style = slot.available ? "border-emerald-800 bg-[#123C36] text-[#B7F5DE] hover:border-[#38E8BA]" : isBooked ? "border-[#285D69] bg-[#142A33] text-[#9FEAF0] hover:border-[#00E5F5]" : station.status !== "active" ? "border-[#42364B] bg-[#28212E] text-[#C9A3E8]" : "border-[#303943] bg-[#11171C] text-[#74838D]";
        const label = <><span className="font-bold">{slot.time}</span><span className="block truncate text-[10px] capitalize">{booking && isBooked ? `${booking.status} · ${booking.paymentStatus}` : slot.available ? "Available" : station.status !== "active" ? station.status : slot.reason === "past_time" ? "Past" : slot.reason === "reservation_in_progress" ? "Processing" : "Unavailable"}</span></>;
        if (booking && isBooked) return <Link key={slot.time} to={`/bookings/${booking.id}`} title={`${booking.customer?.name || "Customer"} · ${formatKolkataDateTime(booking.startAt)}`} className={`min-w-0 rounded-lg border p-2 text-left text-xs ${style}`}>{label}<span className="mt-1 block truncate text-[10px]">{booking.customer?.name || "Customer"}</span></Link>;
        if (slot.available) return <Link key={slot.time} to={`/admin/walk-in?stationId=${encodeURIComponent(station.id)}&startAt=${encodeURIComponent(slot.startAt)}&durationMinutes=${duration}`} title="Create a walk-in booking for this time" className={`min-w-0 rounded-lg border p-2 text-left text-xs ${style}`}>{label}</Link>;
        return <div key={slot.time} className={`min-w-0 rounded-lg border p-2 text-xs ${style}`}>{label}</div>;
      })}</div>
    </section>)}</div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">No stations were found in the current schedule.</div>}
    {schedule?.cancelledBookings.length ? <section className="mt-7 rounded-2xl border border-[#42364B] bg-[#17141C] p-4 sm:p-5"><h2 className="text-lg font-bold text-white">Cancelled sessions on this date</h2><div className="mt-3 divide-y divide-[#3A3041]">{schedule.cancelledBookings.map((booking) => <Link key={booking.id} to={`/bookings/${booking.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-[#4DDCE9]"><span className="text-white">{booking.station} · {booking.customer?.name || "Customer"}</span><span className="text-xs text-[#A5B4BC]">{formatKolkataDateTime(booking.startAt)} · {booking.paymentStatus}{booking.cancellationReason ? ` · ${booking.cancellationReason}` : ""}</span></Link>)}</div></section> : null}
  </AdminPage>;
}

export function WalkInBookingPage() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const initial = useMemo(() => defaultKolkataSession(), []);
  const preset = params.get("startAt") ? localParts(params.get("startAt")!) : null;
  const [date, setDate] = useState(preset?.date || initial.date);
  const [time, setTime] = useState(preset?.time || initial.time);
  const [duration, setDuration] = useState(Number(params.get("durationMinutes")) || 60);
  const [stationId, setStationId] = useState(params.get("stationId") || "");
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getAvailability>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookingId, setBookingId] = useState("");
  const submitGuard = useRef(false);
  const slot = bookingWindow(date, time, duration);
  const withinWindow = date >= kolkataDateOffset(0) && date <= kolkataDateOffset(2);
  const selectedStation = stations.find((station) => station.id === stationId);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getAdminStations(token, { status: "active", limit: 100 }).then(({ stations: items }) => { if (active) setStations(items); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  useEffect(() => {
    if (!token) return;
    let active = true; setCheckingCustomer(true);
    getAdminCustomers(token, { search: search.trim() || undefined, status: "active", page: 1, limit: 20 })
      .then(({ customers: items }) => { if (active) { setCustomers(items); if (!items.some((item) => item.id === customerId)) setCustomerId(""); } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setCheckingCustomer(false); });
    return () => { active = false; };
  }, [token, search]);
  useEffect(() => {
    if (!token || !stationId || !slot || !withinWindow) { setQuote(null); return; }
    let active = true;
    const timer = window.setTimeout(() => getAvailability({ stationId, ...slot })
      .then((result) => { if (active) { setQuote(result); setError(""); } })
      .catch((requestError) => { if (active) { setQuote(null); setError(getErrorMessage(requestError)); } }), 150);
    return () => { active = false; window.clearTimeout(timer); };
  }, [token, stationId, date, time, duration, withinWindow]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || submitGuard.current || !customerId || !stationId || !slot || !withinWindow || !quote?.available) return;
    submitGuard.current = true; setBusy(true); setError(""); setNotice(""); setBookingId("");
    try {
      const result = await createWalkInBooking(token, { userId: customerId, stationId, ...slot });
      setBookingId(result.booking.id);
      setNotice("Walk-in booking created. The booking is pending and unpaid; no customer wallet funds were deducted.");
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(`${getErrorMessage(requestError)} If the request timed out, check the booking list before trying again.`); }
    finally { submitGuard.current = false; setBusy(false); }
  }

  return <AdminPage>
    <PageHeading eyebrow="FRONT DESK" title="Walk-in booking" description="Create a session for a registered customer visiting the lounge. Booking and pricing rules are verified by the server." />
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}{notice && <div className="mb-4"><Notice kind="success">{notice} {bookingId && <Link to={`/bookings/${bookingId}`} className="ml-1 underline">Open booking</Link>}</Notice></div>}
    {loading ? <LoadingState label="Loading stations…" /> : <form onSubmit={(event) => void submit(event)} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="space-y-4 rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-5 sm:p-7">
        <h2 className="font-bold text-white">1. Select an active station and session</h2>
        <label className="block text-xs font-bold text-[#AAB7C0]">Station<select required value={stationId} onChange={(event) => { setStationId(event.target.value); setQuote(null); }} className={selectClass()}><option value="">Choose a station</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.name} · {station.code}</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#AAB7C0]">Date<input type="date" required min={kolkataDateOffset(0)} max={kolkataDateOffset(2)} value={date} onChange={(event) => { setDate(event.target.value); setQuote(null); }} className={selectClass()} /></label><label className="text-xs font-bold text-[#AAB7C0]">Start time<input type="time" required step={1800} value={time} onChange={(event) => { setTime(event.target.value); setQuote(null); }} className={selectClass()} /></label><label className="text-xs font-bold text-[#AAB7C0]">Duration<select value={duration} onChange={(event) => { setDuration(Number(event.target.value)); setQuote(null); }} className={selectClass()}>{[30, 60, 90, 120, 180, 240, 360, 480, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}</option>)}</select></label></div>
        {selectedStation && <p className="text-xs text-[#A5B4BC]">Server rate: {formatMinor(selectedStation.hourlyRateMinor)}/hour. Availability will be checked for the full session.</p>}
        {quote && <Notice kind={quote.available ? "success" : "error"}>{quote.message}</Notice>}
      </section>
      <section className="space-y-4 rounded-2xl border border-[#164B54] bg-[#151A20] p-5 sm:p-7"><h2 className="font-bold text-white">2. Identify the customer</h2><label className="block text-xs font-bold text-[#AAB7C0]">Search registered customers<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or phone" className={selectClass()} /></label><label className="block text-xs font-bold text-[#AAB7C0]">Customer<select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={selectClass()}><option value="">{checkingCustomer ? "Searching customers…" : "Select an existing customer"}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label>{selectedCustomer && <div className="rounded-lg border border-[#263640] bg-[#0D1218] p-3 text-xs text-[#C5D0D8]"><p>{selectedCustomer.name}</p><p className="mt-1 text-[#84919D]">{selectedCustomer.email}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</p></div>}<div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-xs leading-5 text-amber-100">Payment is not collected here. The booking remains pending and unpaid. No wallet is charged and no cash receipt is recorded.</div>
        <div className="border-t border-[#303943] pt-4"><p className="text-xs font-bold tracking-widest text-[#00E5F5]">SERVER PRICE QUOTE</p><p className="mt-2 text-2xl font-extrabold text-white">{quote?.available ? formatMinor(quote.estimatedTotalMinor, quote.currency) : "—"}</p><p className="mt-1 text-xs text-[#84919D]">{duration} minutes · server-calculated integer paise</p></div>
        <button disabled={busy || !customerId || !stationId || !quote?.available || !withinWindow} className={`${buttonPrimary} w-full`}>{busy ? "Creating booking…" : "Confirm unpaid booking"}</button>
      </section>
    </form>}
  </AdminPage>;
}

export function AdminCustomersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "blocked">("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPage());
  const [selected, setSelected] = useState<AdminCustomer | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true; setLoading(true);
    getAdminCustomers(token, { search: search.trim() || undefined, status: status || undefined, page, limit: 20 })
      .then((result) => { if (active) { setItems(result.customers); setPagination(result.pagination); setError(""); } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, search, status, page]);
  async function inspectWallet(customer: AdminCustomer) {
    if (!token) return;
    setSelected(customer); setWallet(null); setError("");
    try { const result = await getAdminCustomerWallet(token, customer.id); setWallet(result.wallet); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  }
  return <AdminPage><PageHeading eyebrow="CUSTOMER ACCOUNTS" title="Customers" description="Search registered lounge members and view safe profile details and their wallet balance." />
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]"><label className="text-xs font-bold text-[#AAB7C0]">Search customers<input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Name, email, phone" className={selectClass()} /></label><label className="text-xs font-bold text-[#AAB7C0]">Account status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as typeof status); }} className={selectClass()}><option value="">All statuses</option><option value="active">Active</option><option value="blocked">Blocked</option></select></label></div>
    {selected && <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#164B54] bg-[#151A20] p-4"><div><p className="font-bold text-white">{selected.name}</p><p className="mt-1 text-xs text-[#A5B4BC]">{selected.email} · {selected.status}</p></div><div className="text-right"><p className="text-[10px] font-bold tracking-wide text-[#84919D]">WALLET BALANCE</p><p className="mt-1 font-bold text-[#00E5F5]">{wallet ? formatMinor(wallet.balanceMinor, wallet.currency) : "Loading…"}</p></div></section>}
    <p className="mb-3 text-xs text-[#84919D]">{pagination.total} registered customers</p>
    {loading ? <LoadingState label="Loading customer records…" /> : items.length ? <div className="space-y-2">{items.map((customer) => <article key={customer.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#263640] bg-[#111920] p-4"><div className="min-w-0"><p className="break-words font-semibold text-white">{customer.name}</p><p className="mt-1 break-all text-xs text-[#A5B4BC]">{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${customer.status === "active" ? "bg-[#123C36] text-[#38E8BA]" : "bg-[#332A3C] text-[#C9A3E8]"}`}>{customer.status}</span><button onClick={() => void inspectWallet(customer)} className={buttonSecondary}>View wallet</button><Link to={`/admin/transactions?search=${encodeURIComponent(customer.email)}`} className="text-xs font-semibold text-[#4DDCE9] hover:underline">Ledger</Link></div></article>)}</div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">No customers match this search.</div>}
    {pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-xs text-[#A5B4BC]"><span>Page {page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </AdminPage>;
}

export function AdminTransactionsPage() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPage());
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (!token) return;
    let active = true; setLoading(true);
    getAdminTransactions(token, { type: (type || undefined) as AdminTransaction["type"] | undefined, status: (status || undefined) as AdminTransaction["status"] | undefined, search: search.trim() || undefined, page, limit: 20 })
      .then((result) => { if (active) { setItems(result.transactions); setPagination(result.pagination); setError(""); } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, type, status, search, page]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    getAdminCustomers(token, { search: customerSearch.trim() || undefined, status: "active", limit: 20 })
      .then(({ customers: result }) => { if (active) setCustomers(result); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); });
    return () => { active = false; };
  }, [token, customerSearch]);
  useEffect(() => {
    if (!token || !customerId) { setWallet(null); return; }
    let active = true;
    getAdminCustomerWallet(token, customerId).then(({ wallet: result }) => { if (active) setWallet(result); }).catch((requestError) => { if (active) setError(getErrorMessage(requestError)); });
    return () => { active = false; };
  }, [token, customerId]);

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    if (!token || !customerId || submitting.current) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) { setError("Enter an amount in rupees with no more than two decimal places."); return; }
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) { setError("Enter a positive amount."); return; }
    submitting.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await adjustWallet(token, { userId: customerId, direction, amountMinor, reason: reason.trim() }, crypto.randomUUID());
      setWallet(result.wallet); setAmount(""); setReason(""); setNotice("Audited wallet adjustment recorded."); setPage(1);
      window.dispatchEvent(new Event("nexus-wallet-updated"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <AdminPage><PageHeading eyebrow="WALLET LEDGER" title="Wallet and transactions" description="Review customer ledger records and make reasoned, idempotent administrative balance adjustments." />
    {notice && <div className="mb-4"><Notice kind="success">{notice}</Notice></div>}{error && <div className="mb-4"><Notice>{error}</Notice></div>}
    <form onSubmit={(event) => void submitAdjustment(event)} className="mb-7 grid gap-4 rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-5 sm:grid-cols-2 xl:grid-cols-3">
      <div className="sm:col-span-2 xl:col-span-3"><p className="font-bold text-white">Audited wallet adjustment</p><p className="mt-1 text-xs leading-5 text-[#A5B4BC]">Each adjustment writes an administrator transaction through the existing replica-set financial transaction. It is not a payment collection or top-up.</p></div>
      <label className="text-xs font-bold text-[#AAB7C0]">Find customer<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Name, email, phone" className={selectClass()} /></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Customer<select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className={selectClass()}><option value="">Choose registered customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Direction<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)} className={selectClass()}><option value="credit">Credit wallet</option><option value="debit">Debit wallet</option></select></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Amount (INR)<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="For example, 100.00" className={selectClass()} /></label>
      <label className="text-xs font-bold text-[#AAB7C0] sm:col-span-2">Reason (required for audit)<input required minLength={5} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} className={selectClass()} /></label>
      <div className="flex items-end justify-between gap-3"><p className="text-xs text-[#84919D]">Selected balance: {wallet ? formatMinor(wallet.balanceMinor, wallet.currency) : "—"}</p><button disabled={busy || !customerId} className={buttonPrimary}>{busy ? "Recording…" : "Record adjustment"}</button></div>
    </form>
    <section className="mb-4 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-[#AAB7C0]">Search customer or booking<input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Name, email, phone, booking ID" className={selectClass()} /></label><label className="text-xs font-bold text-[#AAB7C0]">Transaction type<select value={type} onChange={(event) => { setPage(1); setType(event.target.value); }} className={selectClass()}><option value="">All types</option>{["top_up", "booking_charge", "refund", "adjustment"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label className="text-xs font-bold text-[#AAB7C0]">Status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className={selectClass()}><option value="">All statuses</option>{["success", "pending", "failed"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></section>
    {loading ? <LoadingState label="Loading wallet ledger…" /> : items.length ? <div className="space-y-2">{items.map((item) => <article key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#263640] bg-[#111920] p-4"><div className="min-w-0"><p className="break-words font-semibold capitalize text-white">{item.type.replaceAll("_", " ")} · {item.customer?.name || "Customer"}</p><p className="mt-1 break-all text-xs text-[#84919D]">{item.customer?.email || ""} · {item.description || item.reference}</p><p className="mt-1 text-[10px] text-[#74838D]">{formatKolkataDateTime(item.createdAt)}{item.bookingId ? ` · Booking ${item.bookingId}` : ""}</p></div><div className="text-right"><p className={`font-bold ${item.direction === "credit" ? "text-[#38E8BA]" : "text-white"}`}>{item.direction === "credit" ? "+" : "−"}{formatMinor(item.amountMinor, item.currency)}</p><p className="mt-1 text-xs capitalize text-[#84919D]">{item.status}</p></div></article>)}</div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">No transactions match these filters.</div>}
    {pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between text-xs text-[#A5B4BC]"><span>Page {page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </AdminPage>;
}
