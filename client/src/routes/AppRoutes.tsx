import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState, Notice, PageHeading } from "../components/ui/Feedback";
import SiteLayout from "../components/layout/SiteLayout";
import Home from "../pages/Home.jsx";
import { LoginPage, RegistrationPage } from "../pages/AuthPages";
import {
  BookingCheckoutPage, BookingDetailPage, MyBookingsPage, ProfilePage, StationDetailsPage,
  TransactionHistoryPage, WalletPage,
} from "../pages/UserPages";
import { AdminBookingsPage, AdminDashboardPage, AdminStationsPage } from "../pages/AdminPages";
import { NotificationHistoryPage } from "../pages/NotificationPages";

function ProtectedArea({ admin = false }: { admin?: boolean }) {
  const { user, token, loading, sessionError, refreshProfile, logout } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState label="Checking your NEXUS ARENA session…" />;
  if (sessionError && token && !user) return <main className="mx-auto min-h-[60vh] max-w-2xl px-5 py-16"><Notice>{sessionError}</Notice><div className="mt-4 flex gap-3"><button onClick={() => void refreshProfile()} className="rounded-lg bg-[#00E5F5] px-4 py-2 text-sm font-bold text-[#061519]">Retry</button><button onClick={() => void logout()} className="rounded-lg border border-[#303943] px-4 py-2 text-sm">Sign out</button></div></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

function NotFoundPage() {
  return <main className="mx-auto min-h-[60vh] max-w-3xl px-5 py-16"><PageHeading eyebrow="NEXUS ARENA" title="Page not found" description="That route is not part of the current lounge booking service." /><a href="/" className="text-sm font-semibold text-[#4DDCE9] hover:underline">Return to station discovery</a></main>;
}

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route element={<SiteLayout />}>
      <Route path="/exploreStation" element={<Navigate to="/" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/stations/:id" element={<StationDetailsPage />} />
      <Route path="/stations/:id/book" element={<BookingCheckoutPage />} />
      <Route element={<ProtectedArea />}>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/myBookings" element={<MyBookingsPage />} />
        <Route path="/bookings/:id" element={<BookingDetailPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/transactions" element={<TransactionHistoryPage />} />
        <Route path="/notifications" element={<NotificationHistoryPage />} />
      </Route>
      <Route element={<ProtectedArea admin />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/stations" element={<AdminStationsPage />} />
        <Route path="/admin/bookings" element={<AdminBookingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
