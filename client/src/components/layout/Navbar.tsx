import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 80) {
        setNavbarVisible(true);
      } else if (currentScrollY > previousScrollY) {
        setNavbarVisible(false);
      } else if (currentScrollY < previousScrollY) {
        setNavbarVisible(true);
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `transition-all duration-200 whitespace-nowrap ${
      isActive
        ? "text-[#00F0FF] underline underline-offset-8 decoration-2"
        : "text-[#ACBCBD] hover:text-white no-underline"
    }`;

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className={`sticky top-0 z-50 transition-transform duration-300 ${
        navbarVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <header className="bg-black text-[#ACBCBD] relative z-50">
        <nav className="min-h-[60px] px-4 md:px-6 flex items-center justify-between">
          {/* Brand Name */}
          <NavLink
            to="/exploreStation"
            onClick={closeMenu}
            className="shrink-0 no-underline"
          >
            <h1 className="text-xl sm:text-2xl font-bold leading-none text-[#ACBCBD]">
              NEXUS ARENA
            </h1>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-10">
            {/* Navigation Links */}
            <div className="flex items-center gap-6 xl:gap-10">
              <NavLink to="/exploreStation" className={linkStyle}>
                Explore Stations
              </NavLink>

              <NavLink to="/tournaments" className={linkStyle}>
                Tournaments
              </NavLink>

              <NavLink to="/myBookings" className={linkStyle}>
                My Bookings
              </NavLink>
            </div>

            {/* Wallet, Notifications, Profile */}
            <div className="flex items-center gap-3 xl:gap-4">
              {/* Wallet */}
              <NavLink to="/wallet" className="no-underline">
                <div className="flex items-center gap-2 text-xs border border-[#232F37] rounded-lg px-2 py-2 whitespace-nowrap hover:border-[#00F0FF] transition">
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="5" width="20" height="15" rx="2" />
                    <path d="M2 9h20" />
                  </svg>
                  <span>$145</span>
                  <span className="text-black bg-[#00F0FF] rounded-sm px-2 py-1">
                    + TopUp
                  </span>
                </div>
              </NavLink>

              {/* Notifications */}
              <NavLink to="/notifications" className="no-underline">
                <div className="text-sm border border-[#232F37] rounded-lg px-3 py-2 whitespace-nowrap hover:border-[#00F0FF] transition">
                  Notifications
                </div>
              </NavLink>

              {/* Profile */}
              <NavLink to="/profile" className="no-underline">
                <div className="flex items-center gap-2 border border-[#232F37] rounded-lg px-2 py-1 hover:border-[#00F0FF] transition">
                  <span className="w-8 h-8 shrink-0 flex items-center justify-center text-black bg-[#00F0FF] rounded-full">
                    A
                  </span>

                  <div className="leading-tight">
                    <p className="m-0 text-sm">Name</p>
                    <p className="m-0 text-xs">Rank</p>
                  </div>
                </div>
              </NavLink>
            </div>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden p-2 text-[#00F0FF] hover:bg-[#232F37] rounded-md transition"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile / Tablet Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-[#232F37] bg-black px-5 py-5 flex flex-col gap-5">
            {/* Navigation Links */}
            <div className="flex flex-col gap-5">
              <NavLink
                to="/exploreStation"
                className={linkStyle}
                onClick={closeMenu}
              >
                Explore Stations
              </NavLink>

              <NavLink
                to="/tournaments"
                className={linkStyle}
                onClick={closeMenu}
              >
                Tournaments
              </NavLink>

              <NavLink
                to="/myBookings"
                className={linkStyle}
                onClick={closeMenu}
              >
                My Bookings
              </NavLink>
            </div>

            <div className="h-px bg-[#232F37]" />

            {/* Wallet */}
            <NavLink
              to="/wallet"
              onClick={closeMenu}
              className="flex items-center justify-between border border-[#232F37] rounded-lg p-3"
            >
              <span>Wallet</span>
              <div className="flex items-center gap-3">
                <span>$145</span>
                <span className="text-black bg-[#00F0FF] rounded px-2 py-1 text-xs">
                  + TopUp
                </span>
              </div>
            </NavLink>

            {/* Notifications */}
            <NavLink
              to="/notifications"
              onClick={closeMenu}
              className={linkStyle}
            >
              Notifications
            </NavLink>

            {/* Profile */}
            <NavLink
              to="/profile"
              onClick={closeMenu}
              className="flex items-center gap-3 border border-[#232F37] rounded-lg p-3"
            >
              <span className="w-9 h-9 flex items-center justify-center rounded-full bg-[#00F0FF] text-black shrink-0">
                A
              </span>

              <div className="leading-tight">
                <p className="m-0 text-sm">Name</p>
                <p className="m-0 text-xs">Rank</p>
              </div>
            </NavLink>
          </div>
        )}
      </header>
    </div>
  );
}
