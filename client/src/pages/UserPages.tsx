import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  cancelBooking, createBooking, formatMinor, getAvailability, getBooking, getErrorMessage,
  getMyBookings, getStation, getTransactions, getWallet, payBooking, topUpWallet,
  type Availability, type Booking, type Station, type Transaction, type Wallet,
} from "../lib/api";
import { bookingWindow, defaultKolkataSession, formatKolkataDateTime, kolkataDateOffset } from "../lib/bookingTime";
import { buttonPrimary, buttonSecondary, inputClass, LoadingState, Notice, PageHeading } from "../components/ui/Feedback";

function Content({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-5 py-10 sm:px-8">{children}</main>;
}

function BookingStatus({ booking }: { booking: Booking }) {
  const color = booking.status === "cancelled" ? "text-[#A5B4BC]" : booking.status === "confirmed" ? "text-[#38E8BA]" : booking.status === "pending" ? "text-[#4DDCE9]" : "text-[#C9A3E8]";
  return <span className={`text-xs font-bold uppercase tracking-wide ${color}`}>{booking.status.replace("_", " ")} · {booking.paymentStatus.replace("_", " ")}</span>;
}

function TransactionRows({ items, empty = "No wallet activity yet." }: { items: Transaction[]; empty?: string }) {
  if (!items.length) return <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">{empty}</div>;
  return <div className="divide-y divide-[#263640] overflow-hidden rounded-xl border border-[#263640] bg-[#0D1218]">
    {items.map((item) => <div key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-bold capitalize text-white">{item.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#84919D]">{item.description || item.reference} · {new Date(item.createdAt).toLocaleString("en-IN")}</p></div>
      <div className="text-left sm:text-right"><p className={`font-bold ${item.direction === "credit" ? "text-[#38E8BA]" : "text-white"}`}>{item.direction === "credit" ? "+" : "−"}{formatMinor(item.amountMinor, item.currency)}</p><p className="text-xs capitalize text-[#84919D]">{item.status}</p></div>
    </div>)}
  </div>;
}

export function ProfilePage() {
  const { user, refreshProfile, sessionError } = useAuth();
  return <Content>
    <PageHeading eyebrow="ACCOUNT" title="Your profile" description="Your NEXUS ARENA account details and membership access." />
    {sessionError && <div className="mb-5"><Notice>{sessionError}</Notice></div>}
    {user ? <div className="max-w-2xl rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 sm:p-8">
      <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00E5F5] text-xl font-extrabold text-[#061519]">{user.name.slice(0, 1).toUpperCase()}</span><div><h2 className="text-xl font-bold text-white">{user.name}</h2><p className="text-sm capitalize text-[#38E8BA]">{user.role} · {user.status}</p></div></div>
      <dl className="mt-8 grid gap-5 border-t border-[#303943] pt-6 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-[#84919D]">Email</dt><dd className="mt-1 text-sm text-white">{user.email}</dd></div><div><dt className="text-xs uppercase tracking-wide text-[#84919D]">Phone</dt><dd className="mt-1 text-sm text-white">{user.phone || "Not provided"}</dd></div></dl>
      <div className="mt-7 flex flex-wrap gap-3"><Link to="/myBookings" className={buttonSecondary}>View bookings</Link><Link to="/wallet" className={buttonPrimary}>Open wallet</Link><button onClick={() => void refreshProfile()} className="rounded-lg border border-[#303943] px-4 py-2.5 text-sm text-[#C5D0D8] hover:border-[#00E5F5]">Refresh profile</button></div>
    </div> : <Notice>Profile information is unavailable. Sign in again to refresh your account.</Notice>}
  </Content>;
}

export function StationDetailsPage() {
  const { id = "" } = useParams();
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getStation(id).then(({ station: result }) => { if (active) setStation(result); })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  return <Content>
    <Link to="/" className="mb-6 inline-block text-sm text-[#4DDCE9] hover:underline">← Explore stations</Link>
    {loading ? <LoadingState label="Loading station details…" /> : error ? <Notice>{error}</Notice> : station ? <>
      <PageHeading eyebrow={`${station.type} · ${station.code}`} title={station.name} description={station.description || "Station details from the current NEXUS ARENA inventory."} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 sm:p-8">
          {station.image && <img src={station.image} alt={`${station.name} setup`} className="mb-6 max-h-96 w-full rounded-xl object-cover" />}
          <h2 className="text-lg font-bold text-white">Station specifications</h2>
          {station.specifications && Object.keys(station.specifications).length ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(station.specifications).map(([key, value]) => <div key={key} className="rounded-lg border border-[#303943] bg-[#0D1218] p-3"><dt className="text-xs capitalize text-[#84919D]">{key.replaceAll("_", " ")}</dt><dd className="mt-1 text-sm text-white">{String(value)}</dd></div>)}</dl> : <p className="mt-3 text-sm text-[#84919D]">No additional specifications were provided.</p>}
          <h2 className="mt-8 text-lg font-bold text-white">Installed games</h2>
          <div className="mt-3 flex flex-wrap gap-2">{station.installedGames?.length ? station.installedGames.map((game) => <span key={game} className="rounded-md border border-[#285D69] bg-[#17333C] px-3 py-2 text-xs font-semibold text-[#4DDCE9]">{game}</span>) : <p className="text-sm text-[#84919D]">Game list is not available.</p>}</div>
        </section>
        <aside className="h-fit rounded-2xl border border-[#164B54] bg-[#151A20] p-6">
          <p className="text-xs font-bold tracking-widest text-[#00E5F5]">STATION STATUS</p><p className={`mt-2 text-sm font-bold capitalize ${station.status === "active" ? "text-[#38E8BA]" : "text-[#C9A3E8]"}`}>{station.status}</p>
          <p className="mt-6 text-3xl font-extrabold text-white">{formatMinor(station.hourlyRateMinor)}<span className="ml-1 text-xs font-medium text-[#A5B4BC]">/ hour</span></p>
          {station.status === "active" ? <Link to={`/stations/${station.id}/book`} className={`${buttonPrimary} mt-6 w-full`}>Choose session</Link> : <p className="mt-5 rounded-lg bg-[#0D1218] p-3 text-sm text-[#A5B4BC]">This station is not currently available for new bookings.</p>}
        </aside>
      </div>
    </> : null}
  </Content>;
}

export function BookingCheckoutPage() {
  const { id = "" } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [station, setStation] = useState<Station | null>(null);
  const initial = useMemo(() => defaultKolkataSession(), []);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(120);
  const [quote, setQuote] = useState<Availability | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getStation(id).then(({ station: result }) => { if (active) setStation(result); }).catch((e) => { if (active) setError(getErrorMessage(e)); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    getWallet(token).then(({ wallet: result }) => { if (active) setWallet(result); }).catch(() => {});
    return () => { active = false; };
  }, [token]);
  useEffect(() => {
    if (!station || station.status !== "active") return;
    const slot = bookingWindow(date, time, duration);
    if (!slot) return;
    let active = true;
    setChecking(true);
    const timer = window.setTimeout(() => getAvailability({ stationId: station.id, ...slot })
      .then((result) => { if (active) { setQuote(result); setError(""); } })
      .catch((e) => { if (active) { setQuote(null); setError(getErrorMessage(e)); } })
      .finally(() => { if (active) setChecking(false); }), 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [station?.id, station?.status, date, time, duration]);

  async function reserve() {
    if (!token || !user) { navigate("/login", { state: { from: `/stations/${id}/book` } }); return; }
    if (!station || !quote?.available) return;
    const slot = bookingWindow(date, time, duration);
    if (!slot) return;
    setBusy(true);
    try {
      const { booking } = await createBooking(token, { stationId: station.id, ...slot });
      try {
        await payBooking(token, booking.id);
        navigate(`/bookings/${booking.id}`, { state: { notice: "Your station is reserved and paid from your wallet." } });
      } catch (paymentError) {
        navigate(`/bookings/${booking.id}`, { state: { notice: getErrorMessage(paymentError, "Your booking is saved. Add wallet funds and try payment from this page."), noticeKind: "error" } });
      }
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <Content>
    <Link to={`/stations/${id}`} className="mb-6 inline-block text-sm text-[#4DDCE9] hover:underline">← Station details</Link>
    <PageHeading eyebrow="RESERVE A SESSION" title={station?.name || "Booking and checkout"} description="Select a date and session length. Availability and the final price come from the server." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    {station && <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-5 rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#C5D0D8]">Session date<input type="date" min={kolkataDateOffset(0)} max={kolkataDateOffset(2)} value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-semibold text-[#C5D0D8]">Start time<input type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} mt-2`} /></label>
          <label className="text-sm font-semibold text-[#C5D0D8]">Session duration<select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={`${inputClass} mt-2`}>{[30, 60, 90, 120, 180, 240, 360, 480, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}</option>)}</select></label>
        </div>
        <p className="text-xs text-[#84919D]">Available dates use Asia/Kolkata and include today plus the next two calendar days. Past times and dates outside this range are rejected by the backend.</p>
        {checking && <p className="text-sm text-[#A5B4BC]" role="status">Checking station availability…</p>}
        {quote && <Notice kind={quote.available ? "success" : "error"}>{quote.message}</Notice>}
      </section>
      <aside className="h-fit rounded-2xl border border-[#164B54] bg-gradient-to-b from-[#191D25] to-[#151A20] p-6">
        <p className="text-xs font-bold tracking-widest text-[#00E5F5]">PRICE SUMMARY</p>
        <div className="mt-5 flex justify-between text-sm"><span className="text-[#A5B4BC]">Station rate</span><span>{formatMinor(station.hourlyRateMinor)}/hr</span></div>
        <div className="mt-3 flex justify-between text-sm"><span className="text-[#A5B4BC]">Duration</span><span>{duration} min</span></div>
        <div className="mt-5 border-t border-[#303943] pt-5"><div className="flex justify-between"><span className="font-bold text-white">Backend quote</span><span className="text-xl font-extrabold text-[#00E5F5]">{quote ? formatMinor(quote.estimatedTotalMinor) : "—"}</span></div></div>
        <p className="mt-3 text-xs text-[#84919D]">Wallet: {wallet ? formatMinor(wallet.balanceMinor) : "Sign in to view"}</p>
        <button onClick={() => void reserve()} disabled={busy || checking || !quote?.available} className={`${buttonPrimary} mt-6 w-full`}>{busy ? "Securing session…" : "Reserve and pay"}</button>
        <Link to="/wallet" className="mt-4 block text-center text-xs text-[#4DDCE9] hover:underline">Review wallet balance</Link>
      </aside>
    </div>}
  </Content>;
}

export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { token, user } = useAuth();
  const location = useNavigate();
  const routerLocation = useLocation();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const routeState = routerLocation.state as { notice?: string; noticeKind?: "error" | "success" | "info" } | null;
  const [notice, setNotice] = useState(routeState?.notice || "");
  const [noticeKind, setNoticeKind] = useState<"error" | "success" | "info">(routeState?.noticeKind || "success");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("Plans changed");

  async function load() {
    if (!token) return;
    try { const result = await getBooking(token, id); setBooking(result.booking); setError(""); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  }
  useEffect(() => { void load(); }, [id, token]);

  async function pay() {
    if (!token || !booking) return;
    setBusy(true); setError(""); setNotice("");
    try { const result = await payBooking(token, booking.id); setBooking(result.booking); setNotice("Wallet payment completed. Your session is confirmed."); setNoticeKind("success"); window.dispatchEvent(new Event("nexus-wallet-updated")); window.dispatchEvent(new Event("nexus-notifications-refresh")); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!token || !booking) return;
    setBusy(true); setError("");
    try {
      const result = await cancelBooking(token, booking.id, reason);
      setBooking(result.booking);
      setNotice(result.refund ? `Booking cancelled. ${formatMinor(result.refund.amountMinor)} was returned to your wallet.` : "Booking cancelled. No wallet refund was due.");
      setNoticeKind("success");
      setConfirmCancel(false);
      window.dispatchEvent(new Event("nexus-wallet-updated"));
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <Content>
    <button onClick={() => location(-1)} className="mb-6 text-sm text-[#4DDCE9] hover:underline">← Back</button>
    <PageHeading eyebrow="BOOKING DETAILS" title="Your session" description="Review the saved session, payment status, and available actions." />
    {notice && <div className="mb-5"><Notice kind={noticeKind}>{notice}</Notice></div>}
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    {!booking && !error ? <LoadingState label="Loading booking…" /> : booking && <div className="max-w-3xl rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#00E5F5]">{booking.station?.code || booking.stationId}</p><h2 className="mt-2 text-2xl font-bold text-white">{booking.station?.name || "Gaming station"}</h2></div><BookingStatus booking={booking} /></div>
      <dl className="mt-7 grid gap-5 border-t border-[#303943] pt-6 sm:grid-cols-2"><div><dt className="text-xs text-[#84919D]">Session starts</dt><dd className="mt-1 text-sm text-white">{formatKolkataDateTime(booking.startAt)} IST</dd></div><div><dt className="text-xs text-[#84919D]">Session ends</dt><dd className="mt-1 text-sm text-white">{formatKolkataDateTime(booking.endAt)} IST</dd></div><div><dt className="text-xs text-[#84919D]">Duration</dt><dd className="mt-1 text-sm text-white">{booking.durationMinutes} minutes</dd></div><div><dt className="text-xs text-[#84919D]">Session total</dt><dd className="mt-1 text-sm font-bold text-[#00E5F5]">{formatMinor(booking.priceSnapshot.totalMinor)}</dd></div></dl>
      <div className="mt-7 flex flex-wrap gap-3">
        {user?.id === booking.userId && booking.status === "pending" && booking.paymentStatus === "unpaid" && <button disabled={busy} onClick={() => void pay()} className={buttonPrimary}>{busy ? "Processing…" : "Pay from wallet"}</button>}
        {user?.id === booking.userId && booking.status === "pending" && booking.paymentStatus === "unpaid" && <Link to="/wallet" className={buttonSecondary}>Add wallet funds</Link>}
        {["pending", "confirmed"].includes(booking.status) && new Date(booking.startAt) > new Date() && <button disabled={busy} onClick={() => setConfirmCancel((value) => !value)} className="rounded-lg border border-rose-900 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-950/40">Cancel booking</button>}
      </div>
      {confirmCancel && <div className="mt-5 rounded-xl border border-rose-900/70 bg-rose-950/30 p-4"><p className="text-sm font-semibold text-white">Confirm cancellation</p><p className="mt-1 text-xs text-[#C5D0D8]">Paid eligible bookings are refunded to the wallet. This action cannot be undone.</p><label className="mt-3 block text-xs font-semibold text-[#C5D0D8]">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} className={`${inputClass} mt-2`} /></label><div className="mt-3 flex gap-2"><button disabled={busy || reason.trim().length < 3} onClick={() => void cancel()} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Cancelling…" : "Confirm cancellation"}</button><button onClick={() => setConfirmCancel(false)} className={buttonSecondary}>Keep booking</button></div></div>}
    </div>}
  </Content>;
}

export function MyBookingsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    try { const result = await getMyBookings(token, { status: status || undefined, page, limit: 10 }); setBookings(result.bookings); setTotalPages(result.pagination.totalPages); setError(""); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [token, status, page]);
  async function cancel(id: string) {
    if (!token) return;
    try { await cancelBooking(token, id); setConfirming(null); await load(); window.dispatchEvent(new Event("nexus-wallet-updated")); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  }

  return <Content>
    <PageHeading eyebrow="YOUR ARENA ACTIVITY" title="My bookings" description="Track upcoming sessions, payment state, and cancellations." />
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><label className="text-xs font-bold text-[#AAB7C0]">Filter status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className={`${inputClass} mt-1 min-w-48`}><option value="">All bookings</option>{["pending", "confirmed", "cancelled", "completed", "no_show"].map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></label><Link to="/" className={buttonSecondary}>Find a station</Link></div>
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}
    {loading ? <LoadingState label="Loading your bookings…" /> : bookings.length ? <div className="space-y-4">{bookings.map((booking) => <article key={booking.id} className="rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><BookingStatus booking={booking} /><h2 className="mt-2 text-lg font-bold text-white">{booking.station?.name || booking.station?.code || "Gaming station"}</h2><p className="mt-1 text-sm text-[#A5B4BC]">{formatKolkataDateTime(booking.startAt)} IST · {booking.durationMinutes} min</p></div><p className="text-lg font-extrabold text-[#00E5F5]">{formatMinor(booking.priceSnapshot.totalMinor)}</p></div>
      {confirming === booking.id ? <div className="mt-4 rounded-lg border border-rose-900/60 bg-rose-950/30 p-3"><p className="text-sm text-[#FECACA]">Cancel this booking? If it has been paid, the eligible wallet refund is processed with cancellation.</p><div className="mt-3 flex gap-2"><button onClick={() => void cancel(booking.id)} className="rounded-md bg-rose-700 px-3 py-2 text-xs font-bold">Confirm cancel</button><button onClick={() => setConfirming(null)} className="rounded-md border border-[#303943] px-3 py-2 text-xs">Keep it</button></div></div> : null}
      <div className="mt-4 flex flex-wrap gap-3"><Link to={`/bookings/${booking.id}`} className={buttonSecondary}>Details</Link>{booking.status === "pending" && booking.paymentStatus === "unpaid" && <Link to={`/bookings/${booking.id}`} className={buttonPrimary}>Pay from wallet</Link>}{["pending", "confirmed"].includes(booking.status) && new Date(booking.startAt) > new Date() && <button onClick={() => setConfirming(booking.id)} className="rounded-lg border border-rose-900 px-4 py-2.5 text-sm font-bold text-rose-200 hover:bg-rose-950/40">Cancel</button>}</div>
    </article>)}</div> : <div className="rounded-2xl border border-[#164B54] bg-[#151A20] p-8 text-center"><p className="text-sm text-[#A5B4BC]">No bookings match this view.</p><Link to="/" className={`${buttonPrimary} mt-4`}>Browse stations</Link></div>}
    {totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border border-[#232F37] bg-[#151A20] px-4 py-3 text-xs text-[#A5B4BC]"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </Content>;
}

export function WalletPage() {
  const { token, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amountRupees, setAmountRupees] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [walletResult, transactionResult] = await Promise.all([getWallet(token), getTransactions(token, { page: 1, limit: 5 })]);
      setWallet(walletResult.wallet); setTransactions(transactionResult.transactions); setError("");
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [token]);

  async function topUp(event: FormEvent) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!/^\d+(\.\d{1,2})?$/.test(amountRupees)) { setError("Enter a rupee amount with no more than two decimal places."); return; }
    const paise = Math.round(Number(amountRupees) * 100);
    if (!Number.isSafeInteger(paise) || paise <= 0) { setError("Enter a positive amount."); return; }
    if (!token || !user) return;
    setBusy(true);
    const keyName = `nexusTopupKey:${user.id}:${paise}`;
    let key = localStorage.getItem(keyName);
    if (!key) { key = crypto.randomUUID(); localStorage.setItem(keyName, key); }
    try {
      const result = await topUpWallet(token, paise, key);
      localStorage.removeItem(keyName);
      setWallet(result.wallet);
      setTransactions((items) => [result.transaction, ...items].slice(0, 5));
      setAmountRupees("");
      setNotice("Simulated top-up recorded. No payment method was charged.");
      window.dispatchEvent(new Event("nexus-wallet-updated"));
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <Content>
    <PageHeading eyebrow="WALLET" title="Your wallet" description="Review the current server balance and recent ledger activity." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}{notice && <div className="mb-5"><Notice kind="success">{notice}</Notice></div>}
    {loading ? <LoadingState label="Loading wallet…" /> : <>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-[#00E5F5]/50 bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 shadow-[0_0_22px_rgba(0,229,245,0.08)] sm:p-8"><p className="text-xs font-bold tracking-[0.2em] text-[#4DDCE9]">AVAILABLE BALANCE</p><p className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">{wallet ? formatMinor(wallet.balanceMinor) : "—"}</p><p className="mt-3 text-sm capitalize text-[#38E8BA]">Wallet status: {wallet?.status || "unavailable"}</p><p className="mt-6 text-xs text-[#84919D]">Balance is retrieved from NEXUS ARENA. The client does not calculate or alter the authoritative balance.</p></section>
        <form onSubmit={topUp} className="rounded-2xl border border-[#164B54] bg-[#151A20] p-6"><p className="text-xs font-bold tracking-widest text-[#00E5F5]">SIMULATED TOP-UP</p><h2 className="mt-2 text-lg font-bold text-white">Add demo wallet funds</h2><p className="mt-2 text-xs leading-5 text-[#84919D]">This project simulation does not charge a bank account or payment card.</p><label className="mt-5 block text-sm font-semibold text-[#C5D0D8]">Amount in INR<input inputMode="decimal" type="number" step="0.01" min="0.01" required value={amountRupees} onChange={(event) => setAmountRupees(event.target.value)} placeholder="For example, 250.00" className={`${inputClass} mt-2`} /></label><button className={`${buttonPrimary} mt-4 w-full`} disabled={busy}>{busy ? "Recording top-up…" : "Add simulated funds"}</button></form>
      </div>
      <section className="mt-9"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Recent transactions</h2><Link to="/transactions" className="text-sm font-semibold text-[#4DDCE9] hover:underline">View all transactions</Link></div><TransactionRows items={transactions} /></section>
    </>}
  </Content>;
}

export function TransactionHistoryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    getTransactions(token, { type: filterType || undefined, status: status || undefined, page, limit: 20 })
      .then((result) => { if (active) { setItems(result.transactions); setTotalPages(result.pagination.totalPages); setError(""); } })
      .catch((e) => { if (active) setError(getErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, filterType, status, page]);
  return <Content>
    <PageHeading eyebrow="WALLET LEDGER" title="Transaction history" description="Credits, booking charges, refunds, and administrative adjustments for your account." />
    <div className="mb-5 flex flex-wrap gap-4"><label className="text-xs font-bold text-[#AAB7C0]">Type<select value={filterType} onChange={(e) => { setPage(1); setFilterType(e.target.value); }} className={`${inputClass} mt-1 min-w-52`}><option value="">All activity</option>{["top_up", "booking_charge", "refund", "adjustment"].map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label className="text-xs font-bold text-[#AAB7C0]">Status<select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={`${inputClass} mt-1 min-w-40`}><option value="">All statuses</option>{["success", "pending", "failed"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}{loading ? <LoadingState label="Loading transaction history…" /> : <TransactionRows items={items} empty="No transactions match these filters." />}
    {totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border border-[#232F37] bg-[#151A20] px-4 py-3 text-xs text-[#A5B4BC]"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </Content>;
}
