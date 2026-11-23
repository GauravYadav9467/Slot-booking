import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBookingSelection } from "../context/BookingSelectionContext";
import { createBooking, formatMinor, getAvailability, getErrorMessage, getMyBookings, getWallet, payBooking, type Availability, type Booking, type Wallet } from "../lib/api";
import { bookingWindow, defaultKolkataSession, kolkataDateOffset } from "../lib/bookingTime";
import { buttonPrimary, inputClass, Notice, PageHeading } from "../components/ui/Feedback";

export default function BookingCartCheckoutPage() {
  const { token, user } = useAuth();
  const { selectedStations, removeStation, clearSelection } = useBookingSelection();
  const navigate = useNavigate();
  const initial = useMemo(() => defaultKolkataSession(), []);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [duration, setDuration] = useState(120);
  const [quotes, setQuotes] = useState<Record<string, Availability | null>>({});
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [pending, setPending] = useState<Record<string, Booking>>({});
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);
  const slot = bookingWindow(date, time, duration);
  const withinWindow = date >= kolkataDateOffset(0) && date <= kolkataDateOffset(2);

  useEffect(() => {
    if (!selectedStations.length || !slot || !withinWindow) { setQuotes({}); return; }
    let active = true;
    setChecking(true);
    Promise.all(selectedStations.map(async (station) => {
      try {
        const quote = station.status === "active"
          ? await getAvailability({ stationId: station.id, ...slot })
          : { stationId: station.id, ...slot, durationMinutes: duration, hourlyRateMinor: station.hourlyRateMinor, estimatedTotalMinor: 0, currency: station.currency, available: false, reason: "station_unavailable", message: "This station is not active and cannot be booked." } satisfies Availability;
        return [station.id, quote] as const;
      } catch (requestError) {
        return [station.id, { stationId: station.id, ...slot, durationMinutes: duration, hourlyRateMinor: station.hourlyRateMinor, estimatedTotalMinor: 0, currency: station.currency, available: false, reason: "availability_error", message: getErrorMessage(requestError) } satisfies Availability] as const;
      }
    })).then((results) => { if (active) setQuotes(Object.fromEntries(results)); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [selectedStations.map((station) => `${station.id}:${station.status}`).join("|"), date, time, duration, withinWindow]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getWallet(token).then(({ wallet: result }) => { if (active) setWallet(result); }).catch((requestError) => { if (active) setError(getErrorMessage(requestError)); });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token || !slot || !selectedStations.length) { setPending({}); return; }
    let active = true;
    getMyBookings(token, { status: "pending", page: 1, limit: 100 }).then(({ bookings }) => {
      if (!active) return;
      const matching = Object.fromEntries(bookings.filter((booking) =>
        booking.status === "pending" && booking.paymentStatus === "unpaid" &&
        booking.startAt === slot.startAt && booking.endAt === slot.endAt &&
        selectedStations.some((station) => station.id === booking.stationId)
      ).map((booking) => [booking.stationId, booking]));
      setPending(matching);
    }).catch(() => {});
    return () => { active = false; };
  }, [token, selectedStations.map((station) => station.id).join("|"), slot?.startAt, slot?.endAt]);

  async function checkout() {
    if (!token || !user) { navigate("/login", { state: { from: "/checkout" } }); return; }
    if (submitting.current || !slot || !withinWindow || !selectedStations.length || !selectedStations.every((station) => pending[station.id] || quotes[station.id]?.available)) return;
    const quoteTotal = selectedStations.reduce((total, station) => total + (pending[station.id]?.priceSnapshot.totalMinor ?? quotes[station.id]?.estimatedTotalMinor ?? 0), 0);
    if (!wallet || wallet.balanceMinor < quoteTotal) {
      setError(wallet ? `Wallet balance is short by ${formatMinor(quoteTotal - wallet.balanceMinor)}. Add simulated funds and retry.` : "Wallet balance is unavailable. Refresh your wallet session and retry.");
      return;
    }
    submitting.current = true; setBusy(true); setError(""); setNotice("");
    let paid = 0;
    for (const station of selectedStations) {
      let createdBooking: Booking | null = null;
      try {
        let booking: Booking | undefined = pending[station.id];
        if (!booking) {
          const currentQuote = await getAvailability({ stationId: station.id, ...slot });
          if (!currentQuote.available) throw new Error(currentQuote.message || "Station is no longer available.");
        }
        if (!booking) {
          try {
            const result = await createBooking(token, { stationId: station.id, ...slot });
            booking = result.booking;
            createdBooking = booking;
            setPending((items) => ({ ...items, [station.id]: booking! }));
          } catch (createError) {
            const { bookings } = await getMyBookings(token, { status: "pending", page: 1, limit: 100 });
            booking = bookings.find((item) => item.stationId === station.id && item.status === "pending" && item.paymentStatus === "unpaid" && item.startAt === slot.startAt && item.endAt === slot.endAt) || undefined;
            if (!booking) throw createError;
            createdBooking = booking;
            setPending((items) => ({ ...items, [station.id]: booking! }));
          }
        }
        await payBooking(token, booking.id);
        setPending((items) => { const next = { ...items }; delete next[station.id]; return next; });
        removeStation(station.id);
        paid += 1;
        setNotice(`${paid} station(s) confirmed and paid. Each station is recorded as its own booking.`);
        window.dispatchEvent(new Event("nexus-wallet-updated"));
        window.dispatchEvent(new Event("nexus-notifications-refresh"));
      } catch (requestError) {
        const savedBooking = pending[station.id] || createdBooking;
        if (createdBooking) setPending((items) => ({ ...items, [station.id]: createdBooking! }));
        setError(`${station.name}: ${getErrorMessage(requestError)} ${savedBooking ? "A pending booking was saved; retry payment below to avoid creating a duplicate." : paid ? `${paid} station(s) were confirmed. Later stations were not submitted.` : "Booking status could not be confirmed. Check My Bookings before retrying."}`);
        break;
      }
    }
    if (paid && paid === selectedStations.length) {
      setNotice(`${paid} station(s) confirmed and paid from your wallet.`);
      setWallet((current) => current ? { ...current, balanceMinor: Math.max(0, current.balanceMinor - quoteTotal) } : current);
      clearSelection();
    }
    submitting.current = false; setBusy(false);
  }

  async function retryPayment(stationId: string) {
    if (!token || submitting.current || !pending[stationId]) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await payBooking(token, pending[stationId].id);
      setPending((items) => { const next = { ...items }; delete next[stationId]; return next; });
      removeStation(stationId);
      setNotice("Saved booking payment completed. No duplicate booking was created.");
      window.dispatchEvent(new Event("nexus-wallet-updated"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { submitting.current = false; setBusy(false); }
  }

  const quotesReady = selectedStations.length > 0 && selectedStations.every((station) => pending[station.id] || quotes[station.id]?.available);
  const total = selectedStations.reduce((sum, station) => sum + (pending[station.id]?.priceSnapshot?.totalMinor ?? (quotes[station.id]?.available ? quotes[station.id]!.estimatedTotalMinor : 0)), 0);
  return <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-5 py-10 pb-12 sm:px-8">
    <Link to="/" className="mb-6 inline-block text-sm text-[#4DDCE9] hover:underline">← Station selection</Link>
    <PageHeading eyebrow="RESERVE A SESSION" title="Booking and checkout" description="Review each selected station, choose a shared session time, and confirm current availability and prices." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}{notice && <div className="mb-5"><Notice kind="success">{notice}</Notice></div>}
    {!selectedStations.length ? <div className="rounded-2xl border border-[#164B54] bg-[#151A20] p-8 text-center"><p className="text-sm text-[#A5B4BC]">No stations remain in checkout.</p><Link to="/" className={`${buttonPrimary} mt-4`}>Browse stations</Link></div> : <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="space-y-5 rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6 sm:p-8">
        <div className="space-y-3">{selectedStations.map((station) => <article key={station.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#263640] bg-[#0D1218] p-4"><div className="min-w-0"><h2 className="truncate font-bold text-white">{station.name}</h2><p className="mt-1 text-xs text-[#84919D]">{station.code} · {station.type} · {formatMinor(station.hourlyRateMinor)}/hr</p><p className="mt-2 text-xs text-[#A5B4BC]">{checking ? "Checking availability…" : quotes[station.id]?.message || "Availability is being checked."}</p>{pending[station.id] && <p className="mt-2 text-xs text-amber-200">Booking saved, payment pending.</p>}</div><div className="flex items-center gap-3"><span className="font-bold text-[#00E5F5]">{pending[station.id] ? formatMinor(pending[station.id].priceSnapshot.totalMinor) : quotes[station.id]?.available ? formatMinor(quotes[station.id]!.estimatedTotalMinor) : "—"}</span>{pending[station.id] && <button type="button" disabled={busy} onClick={() => void retryPayment(station.id)} className="rounded-md border border-[#303943] px-3 py-2 text-xs text-[#4DDCE9] disabled:opacity-50">Retry payment</button>}<button type="button" onClick={() => removeStation(station.id)} className="rounded-md border border-[#303943] px-3 py-2 text-xs text-rose-200" aria-label={`Remove ${station.name}`}>Remove</button></div></article>)}</div>
        <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold text-[#C5D0D8]">Session date<input type="date" min={kolkataDateOffset(0)} max={kolkataDateOffset(2)} value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} mt-2`} /></label><label className="text-sm font-semibold text-[#C5D0D8]">Start time<input type="time" step={1800} value={time} onChange={(event) => setTime(event.target.value)} className={`${inputClass} mt-2`} /></label><label className="text-sm font-semibold text-[#C5D0D8]">Session duration<select value={duration} onChange={(event) => setDuration(Number(event.target.value))} className={`${inputClass} mt-2`}>{[30, 60, 90, 120, 180, 240, 360, 480, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}</option>)}</select></label></div>
        <p className="text-xs text-[#84919D]">Available dates include today and the next two calendar days in Asia/Kolkata. Each station is checked separately.</p>{checking && <p role="status" className="text-sm text-[#A5B4BC]">Checking all selected station availability…</p>}
      </section>
      <aside className="h-fit rounded-2xl border border-[#164B54] bg-gradient-to-b from-[#191D25] to-[#151A20] p-6"><p className="text-xs font-bold tracking-widest text-[#00E5F5]">PRICE SUMMARY</p><div className="mt-5 space-y-3">{selectedStations.map((station) => <div key={station.id} className="flex justify-between gap-3 text-sm"><span className="truncate text-[#A5B4BC]">{station.name}</span><span>{pending[station.id] ? formatMinor(pending[station.id].priceSnapshot.totalMinor) : quotes[station.id]?.available ? formatMinor(quotes[station.id]!.estimatedTotalMinor) : "—"}</span></div>)}</div><div className="mt-5 border-t border-[#303943] pt-5"><div className="flex justify-between"><span className="font-bold text-white">Backend total</span><span className="text-xl font-extrabold text-[#00E5F5]">{quotesReady ? formatMinor(total) : "—"}</span></div></div><p className="mt-3 text-xs text-[#84919D]">Wallet: {wallet ? formatMinor(wallet.balanceMinor) : "Sign in to view"}</p><button onClick={() => void checkout()} disabled={busy || checking || !quotesReady || !withinWindow} className={`${buttonPrimary} mt-6 w-full`}>{busy ? "Securing sessions…" : token && user ? "Reserve and pay" : "Sign in to continue"}</button><Link to="/wallet" className="mt-4 block text-center text-xs text-[#4DDCE9] hover:underline">Review wallet balance</Link></aside>
    </div>}
  </main>;
}
