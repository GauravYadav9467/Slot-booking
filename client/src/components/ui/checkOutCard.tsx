import { Link } from "react-router-dom";
import { formatMinor, type Availability, type Station } from "../../lib/api";

type Props = {
  station: Station | null;
  selectedCount: number;
  date: string;
  time: string;
  duration: number;
  minDate: string;
  maxDate: string;
  quote: Availability | null;
  checking: boolean;
  submitting: boolean;
  walletBalance: number | null;
  signedIn: boolean;
  message: { kind: "error" | "success" | "info"; text: string } | null;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onReserve: () => void;
};

const fieldClass = "mt-1 w-full rounded-lg border border-[#303943] bg-[#0D1218] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00E5F5]";

export default function CheckOutCard(props: Props) {
  const {
    station, date, time, duration, minDate, maxDate, quote, checking, submitting,
    walletBalance, signedIn, message, onDateChange, onTimeChange, onDurationChange, onReserve, selectedCount,
  } = props;

  return (
    <aside className="w-full rounded-2xl border border-[#164B54] bg-gradient-to-b from-[#191D25] to-[#151A20] p-5 text-[#C5D0D8] shadow-[0_0_20px_rgba(0,229,245,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold tracking-widest text-[#00E5F5]">● BOOKING SELECTION</p>
        <span className="rounded-full border border-[#237E69] bg-[#123C36] px-3 py-1 text-xs font-bold text-[#38E8BA]">{selectedCount ? `${selectedCount} selected` : "Choose a rig"}</span>
      </div>
      <h2 className="text-base font-bold text-white">{station?.name || "Select a gaming station"}</h2>
      <div className="my-4 border-t border-[#303943]" />

      {station ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#263640] bg-[#0D1218] p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{station.code} · {station.type}</p>
            <p className="mt-1 text-xs text-[#00E5F5]">{formatMinor(station.hourlyRateMinor)} per hour</p>
          </div>
          <button type="button" onClick={() => document.getElementById("station-list")?.scrollIntoView({ behavior: "smooth" })} className="shrink-0 text-xs font-semibold text-[#9BAAB4] underline underline-offset-2 hover:text-[#00E5F5]">Change rig</button>
        </div>
      ) : (
        <p className="rounded-xl border border-[#263640] bg-[#0D1218] p-4 text-sm text-[#84919D]">Choose one of the available stations to build your session.</p>
      )}

      <section className="mt-5 space-y-4">
        <h3 className="text-xs font-bold tracking-wide text-[#AAB7C0]">1. SELECT DATE AND SESSION</h3>
        <label className="block text-xs font-semibold text-[#AAB7C0]">Session date
          <input aria-label="Session date" type="date" min={minDate} max={maxDate} value={date} onChange={(event) => onDateChange(event.target.value)} className={fieldClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#AAB7C0]">Start time
            <input aria-label="Start time" type="time" step={1800} value={time} onChange={(event) => onTimeChange(event.target.value)} className={fieldClass} />
          </label>
          <label className="text-xs font-semibold text-[#AAB7C0]">Duration
            <select aria-label="Session duration" value={duration} onChange={(event) => onDurationChange(Number(event.target.value))} className={fieldClass}>
              {[30, 60, 90, 120, 180, 240, 360, 480, 720].map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`}</option>)}
            </select>
          </label>
        </div>
        <p className="text-[11px] text-[#74838D]">Bookings are available today and the next two days in Asia/Kolkata. Prices and availability are checked by the server.</p>
      </section>

      <section className="mt-5 space-y-3 border-t border-[#303943] pt-4">
        <h3 className="text-xs font-bold tracking-wide text-[#AAB7C0]">2. SESSION TOTAL</h3>
        {checking ? <p className="text-sm text-[#A5B4BC]" role="status">Checking live availability…</p> : null}
        {quote && !checking ? <p className={`rounded-lg px-3 py-2 text-xs ${quote.available ? "bg-[#123C36] text-[#38E8BA]" : "bg-rose-950/50 text-rose-200"}`} role="status">{quote.message}</p> : null}
        <div className="flex items-center justify-between gap-2 rounded-md bg-[#0D1218] px-3 py-3 text-sm">
          <span className="text-[#9BAAB4]">Backend quote</span>
          <span className="font-bold text-white">{quote ? formatMinor(quote.estimatedTotalMinor, quote.currency) : "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#9BAAB4]">Wallet balance</span>
          {walletBalance === null ? <Link to={signedIn ? "/wallet" : "/login"} className="text-xs font-semibold text-[#4DDCE9]">{signedIn ? "Open wallet" : "Sign in to view"}</Link> : <span className="text-xs font-semibold text-white">{formatMinor(walletBalance)}</span>}
        </div>
      </section>

      {message && <div className={`mt-4 rounded-lg border px-3 py-2.5 text-xs ${message.kind === "error" ? "border-rose-900 bg-rose-950/50 text-rose-200" : message.kind === "success" ? "border-emerald-800 bg-emerald-950/40 text-emerald-200" : "border-[#285D69] bg-[#103039] text-[#9FEAF0]"}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</div>}

      <button type="button" onClick={onReserve} disabled={submitting || selectedCount === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5F5] py-3.5 text-sm font-extrabold text-[#061519] shadow-[0_0_16px_rgba(0,229,245,0.25)] transition hover:bg-[#39F3FF] disabled:cursor-not-allowed disabled:opacity-45">
        {submitting ? "Opening checkout…" : signedIn ? `Continue to Checkout (${selectedCount})` : `Review selection (${selectedCount})`}
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] font-medium text-[#38B98F]">● No payment is taken until the booking is confirmed and paid from your wallet.</p>
    </aside>
  );
}
