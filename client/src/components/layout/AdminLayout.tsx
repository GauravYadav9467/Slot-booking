import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  ["Dashboard", "/admin"],
  ["All Stations", "/admin/stations"],
  ["Slot Availability", "/admin/availability"],
  ["Bookings", "/admin/bookings"],
  ["Walk-in Booking", "/admin/walk-in"],
  ["Customers", "/admin/customers"],
  ["Wallet and Transactions", "/admin/transactions"],
  ["Notifications", "/admin/notifications"],
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-[#123C44] text-[#4DDCE9]" : "text-[#A5B4BC] hover:bg-[#19252C] hover:text-white"}`;

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#164B54] bg-gradient-to-r from-[#172A30] to-[#171A22] px-5 py-4">
      <div><p className="text-[10px] font-bold tracking-[0.24em] text-[#00E5F5]">NEXUS ARENA · OWNER CONTROL</p><h1 className="mt-1 text-xl font-extrabold text-white">Lounge operations</h1></div>
      <button type="button" aria-expanded={menuOpen} aria-controls="admin-mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg border border-[#285D69] px-3 py-2 text-sm font-semibold text-[#9FEAF0] lg:hidden">{menuOpen ? "Close menu" : "Admin navigation"}</button>
      <nav id="admin-mobile-navigation" className={`${menuOpen ? "grid" : "hidden"} w-full grid-cols-1 gap-1 border-t border-[#263640] pt-3 lg:hidden sm:grid-cols-2`}>
        {navigation.map(([label, to]) => <NavLink key={to} end={to === "/admin"} to={to} className={linkClass} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
      </nav>
    </header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="hidden h-fit rounded-2xl border border-[#164B54] bg-[#111920] p-3 lg:block">
        <p className="px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-[#84919D]">OPERATIONS</p>
        <nav className="space-y-1">{navigation.map(([label, to]) => <NavLink key={to} end={to === "/admin"} to={to} className={linkClass}>{label}</NavLink>)}</nav>
      </aside>
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[#164B54]/70 bg-[#0F171D]/70"><Outlet /></div>
    </div>
  </div>;
}
