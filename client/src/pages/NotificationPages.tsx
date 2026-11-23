import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, type Notification } from "../lib/api";
import { LoadingState, Notice, PageHeading } from "../components/ui/Feedback";

function notificationDestination(notification: Notification) {
  if (notification.relatedBookingId) return `/bookings/${notification.relatedBookingId}`;
  if (notification.relatedTransactionId) return "/transactions";
  if (notification.type.startsWith("wallet_")) return "/wallet";
  return "/myBookings";
}

function timestamp(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export function NotificationHistoryPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [status, setStatus] = useState<"" | "unread" | "read">("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    getNotifications(token, { status: status || undefined, page, limit: 20 })
      .then((result) => { if (active) { setItems(result.notifications); setTotalPages(result.pagination.totalPages); setError(""); } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, status, page]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const refresh = async () => {
      try { const result = await getUnreadNotificationCount(token); if (active) setUnreadCount(result.unreadCount); }
      catch { /* Listing errors are shown in the history view; count refresh can retry on navigation. */ }
    };
    void refresh();
    window.addEventListener("nexus-notifications-refresh", refresh);
    return () => {
      active = false;
      window.removeEventListener("nexus-notifications-refresh", refresh);
    };
  }, [token]);

  async function openNotification(notification: Notification) {
    if (!token) return;
    setBusy(true); setError("");
    try {
      if (!notification.readAt) await markNotificationRead(token, notification.id);
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
      navigate(notificationDestination(notification));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function markOneRead(notification: Notification) {
    if (!token || notification.readAt) return;
    setBusy(true); setError("");
    try {
      const result = await markNotificationRead(token, notification.id);
      setItems((current) => current.map((item) => item.id === notification.id ? result.notification : item));
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function markAllRead() {
    if (!token || unreadCount === 0) return;
    setBusy(true); setError("");
    try {
      await markAllNotificationsRead(token);
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-5 py-10 sm:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><PageHeading eyebrow="ACTIVITY" title="Notifications" description="Booking and wallet updates for your NEXUS ARENA account." /><button disabled={busy || unreadCount === 0} onClick={() => void markAllRead()} className="mb-7 rounded-lg border border-[#285D69] bg-[#103039] px-4 py-2.5 text-sm font-bold text-[#9FEAF0] hover:border-[#00E5F5] disabled:opacity-50">Mark all as read ({unreadCount})</button></div>
    {error && <div className="mb-5"><Notice>{error}</Notice></div>}
    <div className="mb-5 flex flex-wrap items-center gap-3"><label htmlFor="notification-filter" className="text-xs font-bold text-[#AAB7C0]">Show</label><select id="notification-filter" value={status} onChange={(event) => { setLoading(true); setPage(1); setStatus(event.target.value as typeof status); }} className="rounded-lg border border-[#303943] bg-[#0D1218] px-3 py-2.5 text-sm text-white"><option value="">All notifications</option><option value="unread">Unread</option><option value="read">Read</option></select></div>
    {loading ? <LoadingState label="Loading notifications…" /> : items.length ? <div className="space-y-3">{items.map((notification) => <article key={notification.id} className={`rounded-xl border p-4 transition ${notification.readAt ? "border-[#263640] bg-[#111820]" : "border-[#285D69] bg-[#14232A]"}`}><div className="flex items-start gap-3"><span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? "bg-[#52616A]" : "bg-[#00E5F5]"}`} /><div className="min-w-0 flex-1"><button type="button" disabled={busy} onClick={() => void openNotification(notification)} className="w-full text-left disabled:opacity-60"><span className="block font-bold text-white">{notification.title}</span><span className="mt-1 block text-sm leading-6 text-[#C5D0D8]">{notification.message}</span><span className="mt-2 block text-xs text-[#84919D]">{timestamp(notification.createdAt)}</span></button></div>{!notification.readAt && <button type="button" disabled={busy} onClick={() => void markOneRead(notification)} className="shrink-0 text-xs font-bold text-[#4DDCE9] hover:underline disabled:opacity-50">Mark read</button>}</div></article>)}</div> : <div className="rounded-xl border border-[#263640] bg-[#0D1218] p-8 text-center"><h2 className="font-bold text-white">{status === "unread" ? "You are all caught up" : "No notifications yet"}</h2><p className="mt-2 text-sm text-[#84919D]">Updates about bookings and wallet activity will appear here.</p></div>}
    {totalPages > 1 && <div className="mt-5 flex items-center justify-between rounded-xl border border-[#232F37] bg-[#151A20] px-4 py-3 text-xs text-[#A5B4BC]"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => { setLoading(true); setPage((value) => value + 1); }} className="rounded-md border border-[#303943] px-3 py-2 disabled:opacity-40">Next</button></div></div>}
  </main>;
}
