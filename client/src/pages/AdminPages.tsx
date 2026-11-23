import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createStation, deactivateStation, formatMinor, getAdminBookings, getAdminOverview, getAdminStations, getErrorMessage, updateStation, updateStationStatus, type AdminOverview, type Booking, type Pagination, type Station } from "../lib/api";
import { buttonPrimary, buttonSecondary, inputClass, LoadingState, Notice, PageHeading } from "../components/ui/Feedback";
import { formatKolkataDateTime } from "../lib/bookingTime";

function AdminContent({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-5 py-10 sm:px-8">{children}</main>;
}

export function AdminDashboardPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) return;
    let active = true;
    getAdminOverview(token)
      .then(({ overview: result }) => { if (active) setOverview(result); })
      .catch((e) => { if (active) setError(getErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);
  return <AdminContent>
    <PageHeading eyebrow="LOUNGE OPERATIONS" title="Admin dashboard" description="Manage the current station inventory and review upcoming booking activity." />
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    {loading ? <LoadingState label="Loading operations overview…" /> : overview && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{([ ["ACTIVE STATIONS", overview.stations.active], ["MAINTENANCE", overview.stations.maintenance], ["INACTIVE", overview.stations.inactive] ] as const).map(([label, count]) => <div key={label} className="rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-6"><p className="text-xs font-bold tracking-widest text-[#4DDCE9]">{label}</p><p className="mt-3 text-4xl font-extrabold text-white">{count}</p><Link to="/admin/stations" className="mt-4 inline-block text-sm font-semibold text-[#4DDCE9] hover:underline">Manage stations →</Link></div>)}</div>
      <section className="mt-8 rounded-2xl border border-[#164B54] bg-[#151A20] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Booking status overview</h2><Link to="/admin/bookings" className="text-sm font-semibold text-[#4DDCE9] hover:underline">Manage bookings →</Link></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{([ ["All bookings", overview.bookings.total], ["Pending", overview.bookings.pending], ["Confirmed", overview.bookings.confirmed], ["Cancelled", overview.bookings.cancelled], ["Completed", overview.bookings.completed], ["No show", overview.bookings.no_show] ] as const).map(([label, count]) => <div key={label} className="rounded-xl border border-[#263640] bg-[#0D1218] p-4"><p className="text-xs text-[#84919D]">{label}</p><p className="mt-2 text-2xl font-bold text-white">{count}</p></div>)}</div></section>
      <section className="mt-9"><h2 className="mb-4 text-xl font-bold text-white">Recent bookings</h2>{overview.recentBookings.length ? <div className="overflow-x-auto rounded-2xl border border-[#164B54]"><table className="w-full min-w-[700px] border-collapse text-left text-sm"><thead className="bg-[#0D1218] text-xs uppercase tracking-wide text-[#84919D]"><tr><th className="p-4">Customer</th><th className="p-4">Station</th><th className="p-4">Session</th><th className="p-4">Status</th><th className="p-4" /></tr></thead><tbody className="divide-y divide-[#263640] bg-[#151A20]">{overview.recentBookings.map((booking) => <tr key={booking.id}><td className="p-4 text-white">{booking.user}</td><td className="p-4 text-[#C5D0D8]">{booking.station}</td><td className="p-4 text-[#C5D0D8]">{formatKolkataDateTime(booking.startAt)}</td><td className="p-4 capitalize text-[#4DDCE9]">{booking.status} · {booking.paymentStatus}</td><td className="p-4"><Link to={`/bookings/${booking.id}`} className="text-xs font-semibold text-[#4DDCE9] hover:underline">Details</Link></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-5 text-sm text-[#84919D]">No bookings are on record yet.</div>}</section>
      <section className="mt-9"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-white">Recent operational notifications</h2><Link to="/notifications" className="text-sm font-semibold text-[#4DDCE9] hover:underline">Notification history</Link></div>{overview.recentNotifications.length ? <div className="divide-y divide-[#263640] overflow-hidden rounded-xl border border-[#263640] bg-[#0D1218]">{overview.recentNotifications.map((notification) => <div key={notification.id} className="p-4"><p className="text-sm font-bold text-white">{notification.title}</p><p className="mt-1 text-sm text-[#A5B4BC]">{notification.message}</p><p className="mt-1 text-xs text-[#84919D]">{new Date(notification.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p></div>)}</div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-5 text-sm text-[#84919D]">No operational notifications have been recorded.</div>}</section>
    </>}
  </AdminContent>;
}

type StationForm = { name: string; code: string; type: Station["type"]; description: string; hourlyRate: string; installedGames: string };
const blankStation: StationForm = { name: "", code: "", type: "PC", description: "", hourlyRate: "", installedGames: "" };

export function AdminStationsPage() {
  const { token } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<StationForm>(blankStation);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    if (!token) return;
    try { const result = await getAdminStations(token, { search: search.trim() || undefined, page, limit: 20 }); setStations(result.stations); setPagination(result.pagination); setError(""); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [token, search, page]);

  function beginEdit(station: Station) {
    setEditing(station.id);
    setForm({ name: station.name, code: station.code, type: station.type, description: station.description || "", hourlyRate: (station.hourlyRateMinor / 100).toFixed(2), installedGames: station.installedGames?.join(", ") || "" });
    document.getElementById("station-form")?.scrollIntoView({ behavior: "smooth" });
  }
  function resetForm() { setEditing(null); setForm(blankStation); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    const paise = Math.round(Number(form.hourlyRate) * 100);
    if (!Number.isSafeInteger(paise) || paise < 0) { setError("Enter a valid hourly rate in rupees."); return; }
    const body = { name: form.name.trim(), code: form.code.trim(), type: form.type, description: form.description.trim(), hourlyRateMinor: paise, installedGames: form.installedGames.split(",").map((game) => game.trim()).filter(Boolean) };
    setBusy(true); setError(""); setNotice("");
    try {
      if (editing) {
        const { station } = await updateStation(token, editing, body);
        setStations((items) => items.map((item) => item.id === editing ? station : item));
        setNotice("Station details updated.");
      } else {
        const { station } = await createStation(token, body);
        setStations((items) => [station, ...items]);
        setNotice("Station added to the active inventory.");
      }
      resetForm();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function changeStatus(station: Station, status: Station["status"]) {
    if (!token) return;
    setBusy(true); setError("");
    try {
      const { station: updated } = await updateStationStatus(token, station.id, status);
      setStations((items) => items.map((item) => item.id === station.id ? updated : item));
      setNotice(`Station status changed to ${status}.`);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  }
  async function deactivate(station: Station) {
    if (!token || !window.confirm(`Deactivate ${station.name}? Its booking history will be retained.`)) return;
    setBusy(true); setError("");
    try { const { station: updated } = await deactivateStation(token, station.id); setStations((items) => items.map((item) => item.id === station.id ? updated : item)); setNotice("Station deactivated. Booking history remains stored."); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  }

  return <AdminContent>
    <PageHeading eyebrow="INVENTORY" title="Station management" description="Create and update gaming station records using the current lounge inventory API." />
    {notice && <div className="mb-4"><Notice kind="success">{notice}</Notice></div>}{error && <div className="mb-4"><Notice>{error}</Notice></div>}
    <section id="station-form" className="mb-8 rounded-2xl border border-[#164B54] bg-gradient-to-br from-[#172A30] to-[#171A22] p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{editing ? "Edit station" : "Add a station"}</h2>{editing && <button onClick={resetForm} className="text-xs text-[#4DDCE9] hover:underline">Cancel edit</button>}</div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-bold text-[#AAB7C0]">Station name<input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-bold text-[#AAB7C0]">Station code<input required maxLength={20} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-bold text-[#AAB7C0]">Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Station["type"] })} className={`${inputClass} mt-1`}><option>PC</option><option>Console</option><option>VR</option></select></label>
        <label className="text-xs font-bold text-[#AAB7C0]">Hourly rate (INR)<input type="number" required min="0" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-bold text-[#AAB7C0] lg:col-span-2">Description<input maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <label className="text-xs font-bold text-[#AAB7C0] sm:col-span-2 lg:col-span-3">Installed games, comma-separated<input value={form.installedGames} onChange={(e) => setForm({ ...form, installedGames: e.target.value })} className={`${inputClass} mt-1`} /></label>
        <button disabled={busy} className={buttonPrimary}>{busy ? "Saving…" : editing ? "Save station" : "Create station"}</button>
      </form>
    </section>

    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><label className="w-full max-w-sm text-xs font-bold text-[#AAB7C0]">Search all stations<input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className={`${inputClass} mt-1`} placeholder="Search by name" /></label><span className="text-xs text-[#84919D]">{pagination.total} stations</span></div>
    {loading ? <LoadingState label="Loading station inventory…" /> : stations.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{stations.map((station) => <article key={station.id} className="rounded-2xl border border-[#164B54] bg-[#151A20] p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-[#4DDCE9]">{station.code} · {station.type}</p><h3 className="mt-1 text-lg font-bold text-white">{station.name}</h3><p className="mt-1 text-sm text-[#A5B4BC]">{formatMinor(station.hourlyRateMinor)} / hour</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${station.status === "active" ? "bg-[#123C36] text-[#38E8BA]" : "bg-[#332A3C] text-[#C9A3E8]"}`}>{station.status}</span></div>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => beginEdit(station)} className={buttonSecondary}>Edit</button><select value={station.status} disabled={busy} onChange={(e) => void changeStatus(station, e.target.value as Station["status"])} className="rounded-lg border border-[#303943] bg-[#0D1218] px-3 py-2 text-xs text-white"><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option></select><button onClick={() => void deactivate(station)} disabled={busy || station.status === "inactive"} className="rounded-lg border border-rose-900 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40">Deactivate</button></div>
    </article>)}</div> : <div className="mt-4 rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">No stations match the current search. Create a station or adjust the search.</div>}
    {pagination.totalPages > 1 && <div className="mt-5 flex justify-between text-xs text-[#A5B4BC]"><span>Page {page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </AdminContent>;
}

function localDateTimeToISO(value: string) {
  if (!value) return undefined;
  const date = new Date(`${value}:00+05:30`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function AdminBookingsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [stationId, setStationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    getAdminBookings(token, { status: status || undefined, stationId: stationId.trim() || undefined, from: localDateTimeToISO(from), to: localDateTimeToISO(to), page, limit: 20 })
      .then((result) => { if (active) { setItems(result.bookings); setPagination(result.pagination); setError(""); } })
      .catch((e) => { if (active) setError(getErrorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, status, stationId, from, to, page]);

  return <AdminContent>
    <PageHeading eyebrow="LOUNGE OPERATIONS" title="Booking management" description="Filter the booking ledger and review customer sessions. Details and eligible cancellations use the existing booking APIs." />
    {error && <div className="mb-4"><Notice>{error}</Notice></div>}
    <section className="mb-5 grid gap-3 rounded-2xl border border-[#164B54] bg-[#151A20] p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-xs font-bold text-[#AAB7C0]">Booking status<select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className={`${inputClass} mt-1`}><option value="">All statuses</option>{["pending", "confirmed", "cancelled", "completed", "no_show"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label>
      <label className="text-xs font-bold text-[#AAB7C0]">Station ObjectId<input value={stationId} onChange={(e) => { setPage(1); setStationId(e.target.value); }} className={`${inputClass} mt-1`} placeholder="Optional station ID" /></label>
      <label className="text-xs font-bold text-[#AAB7C0]">From (Asia/Kolkata)<input type="datetime-local" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className={`${inputClass} mt-1`} /></label>
      <label className="text-xs font-bold text-[#AAB7C0]">To (Asia/Kolkata)<input type="datetime-local" value={to} onChange={(e) => { setPage(1); setTo(e.target.value); }} className={`${inputClass} mt-1`} /></label>
    </section>
    <p className="mb-3 text-xs text-[#84919D]">{pagination.total} matching bookings</p>
    {loading ? <LoadingState label="Loading booking records…" /> : items.length ? <div className="overflow-x-auto rounded-2xl border border-[#164B54]"><table className="w-full min-w-[850px] border-collapse text-left text-sm"><thead className="bg-[#0D1218] text-xs uppercase tracking-wide text-[#84919D]"><tr><th className="p-4">Customer</th><th className="p-4">Station</th><th className="p-4">Session</th><th className="p-4">Booking / payment</th><th className="p-4">Total</th><th className="p-4" /></tr></thead><tbody className="divide-y divide-[#263640] bg-[#151A20]">{items.map((booking) => <tr key={booking.id}><td className="p-4"><span className="block text-white">{booking.user?.name || "Customer"}</span><span className="text-xs text-[#84919D]">{booking.user?.email || ""}</span></td><td className="p-4 text-[#C5D0D8]">{booking.station?.name || booking.station?.code || "Station"}</td><td className="p-4 text-[#C5D0D8]">{formatKolkataDateTime(booking.startAt)}</td><td className="p-4 capitalize text-[#4DDCE9]">{booking.status} · {booking.paymentStatus}</td><td className="p-4 text-white">{formatMinor(booking.priceSnapshot.totalMinor)}</td><td className="p-4"><Link to={`/bookings/${booking.id}`} className="text-xs font-semibold text-[#4DDCE9] hover:underline">Details</Link></td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-6 text-sm text-[#84919D]">No bookings match these filters.</div>}
    {pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border border-[#232F37] bg-[#151A20] px-4 py-3 text-xs text-[#A5B4BC]"><span>Page {page} of {pagination.totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </AdminContent>;
}
