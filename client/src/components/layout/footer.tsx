import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#202832] bg-[#0B0F15]">
      <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#38B98F] shadow-[0_0_8px_rgba(56,185,143,0.5)]" />
            <Link to="/" className="text-sm font-bold tracking-wide text-white transition hover:text-[#00E5F5]">NEXUS ARENA</Link>
            <p className="text-center text-xs text-[#84919D]">© {new Date().getFullYear()} NEXUS ARENA Gaming Lounge.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link to="/" className="text-xs font-medium text-[#B2BEC8] transition-colors hover:text-[#00E5F5]">Explore stations</Link>
            <Link to="/myBookings" className="text-xs font-medium text-[#B2BEC8] transition-colors hover:text-[#00E5F5]">My bookings</Link>
            <Link to="/wallet" className="text-xs font-medium text-[#B2BEC8] transition-colors hover:text-[#00E5F5]">Wallet</Link>
            <a href="mailto:staff@nexusarena.com" className="text-xs font-medium text-[#B2BEC8] transition-colors hover:text-[#00E5F5]">Contact lounge staff</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
