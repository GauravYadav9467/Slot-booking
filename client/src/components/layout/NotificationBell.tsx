import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage, getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, type Notification } from "../../lib/api";

function destination(notification: Notification) {
  if (notification.relatedBookingId) return `/bookings/${notification.relatedBookingId}`;
  if (notification.relatedTransactionId) return "/transactions";
  if (notification.type.startsWith("wallet_")) return "/wallet";
  return "/myBookings";
}

function ageLabel(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}

export default function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    const refresh = () => getUnreadNotificationCount(token).then(({ unreadCount: count }) => { if (active) setUnreadCount(count); }).catch(() => {});
    void refresh();
    window.addEventListener("nexus-notifications-refresh", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("nexus-notifications-refresh", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [token, location.key]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!token) return null;

  async function loadRecent() {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const [list, count] = await Promise.all([getNotifications(token, { page: 1, limit: 5 }), getUnreadNotificationCount(token)]);
      setRecent(list.notifications); setUnreadCount(count.unreadCount);
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setLoading(false); }
  }

  async function openPanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    onNavigate?.();
    if (nextOpen) await loadRecent();
  }

  async function selectNotification(notification: Notification) {
    if (!token) return;
    setBusy(true); setError("");
    try {
      if (!notification.readAt) await markNotificationRead(token, notification.id);
      setRecent((items) => items.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
      setOpen(false);
      navigate(destination(notification));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function markAllRead() {
    if (!token || !unreadCount) return;
    setBusy(true); setError("");
    try {
      await markAllNotificationsRead(token);
      const readAt = new Date().toISOString();
      setRecent((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event("nexus-notifications-refresh"));
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => void openPanel()} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={open} className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#232F37] text-[#ACBCBD] transition hover:border-[#00F0FF] hover:text-[#00F0FF]">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#00E5F5] px-1 text-[10px] font-extrabold text-[#061519]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <section className="absolute right-0 top-12 z-[70] w-[min(90vw,380px)] overflow-hidden rounded-xl border border-[#285D69] bg-[#111820] shadow-2xl" aria-label="Recent notifications">
      <div className="flex items-center justify-between border-b border-[#263640] px-4 py-3"><h2 className="text-sm font-bold text-white">Notifications</h2><button disabled={busy || unreadCount === 0} onClick={() => void markAllRead()} className="text-xs font-semibold text-[#4DDCE9] hover:underline disabled:opacity-50">Mark all read</button></div>
      {error && <p className="px-4 py-3 text-xs text-rose-200" role="alert">{error}</p>}
      {loading ? <p className="px-4 py-7 text-center text-sm text-[#84919D]" role="status">Loading notifications…</p> : recent.length ? <div className="max-h-[60vh] overflow-y-auto">{recent.map((notification) => <button key={notification.id} type="button" disabled={busy} onClick={() => void selectNotification(notification)} className={`block w-full border-b border-[#263640] px-4 py-3 text-left transition hover:bg-[#172A30] ${notification.readAt ? "opacity-70" : "bg-[#10232A]"}`}><span className="flex items-start gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-transparent" : "bg-[#00E5F5]"}`} /><span className="min-w-0"><span className="block text-sm font-semibold text-white">{notification.title}</span><span className="mt-1 block text-xs leading-5 text-[#A5B4BC]">{notification.message}</span><span className="mt-1 block text-[11px] text-[#84919D]">{ageLabel(notification.createdAt)}</span></span></span></button>)}</div> : !error && <p className="px-4 py-8 text-center text-sm text-[#84919D]">You are all caught up. New booking and wallet activity will appear here.</p>}
      <Link to="/notifications" onClick={() => { setOpen(false); onNavigate?.(); }} className="block px-4 py-3 text-center text-xs font-bold text-[#4DDCE9] hover:bg-[#172A30]">View notification history</Link>
    </section>}
  </div>;
}
