import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../components/ui/exploreCard";
import CheckOutCard from "../components/ui/checkOutCard";
import BookingSelectionFooter from "../components/ui/BookingSelectionFooter";
import Footer from "../components/layout/footer";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "../context/AuthContext";
import { useBookingSelection } from "../context/BookingSelectionContext";
import { getAvailability, getErrorMessage, getStations, getWallet } from "../lib/api";
import { bookingWindow, defaultKolkataSession, kolkataDateOffset } from "../lib/bookingTime";

export default function Home() {
  const { user, token } = useAuth();
  const { selectedStations, selectedStationIds, toggleStation } = useBookingSelection();
  const navigate = useNavigate();
  const location = useLocation();
  const initialSession = useMemo(() => defaultKolkataSession(), []);
  const [stations, setStations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [focusedStationId, setFocusedStationId] = useState(null);
  const [date, setDate] = useState(initialSession.date);
  const [time, setTime] = useState(initialSession.time);
  const [duration, setDuration] = useState(120);
  const [quote, setQuote] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const station = stations.find((item) => item.id === focusedStationId) || selectedStations.find((item) => item.id === focusedStationId) || null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStations({ type: type || undefined, search: search.trim() || undefined, page, limit: 20 })
      .then((result) => {
        if (!active) return;
        setStations(result.stations);
        setPagination(result.pagination);
        setError("");
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError, "Could not load stations.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, search, page, refreshKey]);

  useEffect(() => {
    if (!focusedStationId && selectedStations.length) setFocusedStationId(selectedStations.at(-1).id);
    if (focusedStationId && !selectedStationIds.includes(focusedStationId)) {
      setFocusedStationId(selectedStationIds.at(-1) || null);
    }
  }, [focusedStationId, selectedStationIds, selectedStations]);

  useEffect(() => {
    if (!token) {
      setWalletBalance(null);
      return;
    }
    let active = true;
    getWallet(token).then(({ wallet }) => { if (active) setWalletBalance(wallet.balanceMinor); })
      .catch(() => { if (active) setWalletBalance(null); });
    return () => { active = false; };
  }, [token, location.key]);

  useEffect(() => {
    if (!station) {
      setQuote(null);
      return;
    }
    const slot = bookingWindow(date, time, duration);
    if (!slot) {
      setQuote(null);
      return;
    }
    let active = true;
    setChecking(true);
    setMessage(null);
    const timer = globalThis.setTimeout(() => {
      getAvailability({ stationId: station.id, ...slot })
        .then((result) => { if (active) setQuote(result); })
        .catch((requestError) => {
          if (!active) return;
          setQuote(null);
          setMessage({ kind: "error", text: getErrorMessage(requestError, "Availability could not be checked.") });
        })
        .finally(() => { if (active) setChecking(false); });
    }, 250);
    return () => { active = false; globalThis.clearTimeout(timer); };
  }, [station?.id, date, time, duration]);

  function reserve() {
    navigate("/checkout");
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen w-full bg-[#0F2128]">
        <main className={`home mx-auto flex min-h-screen w-full max-w-[1600px] flex-col p-5 text-white sm:px-8 lg:max-w-[85%] ${selectedStations.length ? "pb-44 sm:pb-36" : ""}`}>
          <h1 className="text-3xl font-bold sm:text-4xl">Reserve Your<span className="ml-3 text-[#00F0FF]">Battle Station</span></h1>
          <h2 className="mt-3 max-w-3xl text-base leading-7 text-[#C5D0D8] sm:text-lg">Find a ready gaming station, choose a session for today or the next two days, and review its live price before reserving.</h2>

          <div className="HomeBody mt-5 flex w-full flex-col items-start gap-5 lg:flex-row">
            <section id="station-list" className="leftCont w-full min-w-0 p-2 lg:w-[75%] lg:max-w-[70%] lg:shrink-0">
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:flex-row">
                <label className="flex-1 text-xs font-bold text-[#AAB7C0]">Search stations
                  <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Try PC-01 or VR Arena" className="mt-1 w-full rounded-lg border border-[#303943] bg-[#0D1218] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00E5F5]" />
                </label>
                <label className="w-full text-xs font-bold text-[#AAB7C0] sm:w-48">Station type
                  <select value={type} onChange={(event) => { setPage(1); setType(event.target.value); }} className="mt-1 w-full rounded-lg border border-[#303943] bg-[#0D1218] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00E5F5]">
                    <option value="">All types</option><option value="PC">PC</option><option value="Console">Console</option><option value="VR">VR</option>
                  </select>
                </label>
              </div>

              {loading ? <div className="rounded-xl border border-[#164B54] bg-[#151A20] p-8 text-sm text-[#A5B4BC]" role="status">Loading available stations…</div> : null}
              {!loading && error ? <div className="rounded-xl border border-rose-900 bg-rose-950/50 p-4 text-sm text-rose-200" role="alert">{error}<button onClick={() => setRefreshKey((value) => value + 1)} className="ml-3 underline">Retry</button></div> : null}
              {!loading && !error && stations.length === 0 ? <div className="rounded-xl border border-[#164B54] bg-[#151A20] p-8 text-sm text-[#A5B4BC]">No active stations match these filters. Try another search or type.</div> : null}
              {!loading && stations.length > 0 ? <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">{stations.map((item) => <Card key={item.id} station={item} selected={selectedStationIds.includes(item.id)} onSelect={(value) => { const wasSelected = selectedStationIds.includes(value.id); toggleStation(value); setFocusedStationId(wasSelected ? selectedStationIds.filter((id) => id !== value.id).at(-1) || null : value.id); setQuote(null); setMessage(null); }} />)}</div> : null}

              {pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border border-[#232F37] bg-[#151A20] px-4 py-3 text-xs text-[#A5B4BC]">
                <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} stations</span>
                <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div>
              </div>}
            </section>

            <div className="rightCont relative w-full min-w-0 flex-1 self-stretch lg:w-auto">
              <div className="sticky top-[72px] mx-auto max-w-[520px] lg:max-w-[380px]">
                <CheckOutCard
                  station={station}
                  selectedCount={selectedStations.length}
                  date={date}
                  time={time}
                  duration={duration}
                  minDate={kolkataDateOffset(0)}
                  maxDate={kolkataDateOffset(2)}
                  quote={quote}
                  checking={checking}
                  submitting={false}
                  walletBalance={walletBalance}
                  signedIn={Boolean(user)}
                  message={message}
                  onDateChange={(value) => { setDate(value); setQuote(null); }}
                  onTimeChange={(value) => { setTime(value); setQuote(null); }}
                  onDurationChange={(value) => { setDuration(value); setQuote(null); }}
                  onReserve={reserve}
                />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <BookingSelectionFooter />
    </>
  );
}
