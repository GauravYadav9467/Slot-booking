import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="bg-black text-[#ACBCBD]">
      <nav className="h-[60px] px-4 flex items-center">
        {/* Left: Brand Name */}
        <NavLink to="/exploreStation" className="no-underline shrink-0">
          <h1 className="text-2xl font-bold leading-none">NEXUS ARENA</h1>
        </NavLink>

        {/* Right: Navigation + User Actions */}
        <div className="ml-auto flex items-center gap-10">
          {/* Navigation Links */}
          <div className="flex items-center gap-10 whitespace-nowrap">
            <NavLink to="/exploreStation" className="hover:text-white">
              Explore Stations
            </NavLink>

            <NavLink to="/tournaments" className="hover:text-white">
              Tournaments
            </NavLink>

            <NavLink to="/myBookings" className="hover:text-white">
              My Bookings
            </NavLink>
          </div>

          {/* Wallet, Notifications, Profile */}
          <div className="flex items-center gap-4">
            {/* Wallet */}
            <NavLink to="/wallet" className="hover:text-white">
              <div className="flex items-center gap-2 text-xs border border-[#232F37] rounded-lg px-2 py-1">
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

                <p className="m-0">$145</p>
                <span className="text-black bg-[#00F0FF] rounded-sm px-2 py-1">
                  + TopUp
                </span>
              </div>
            </NavLink>

            {/* Notifications */}
            <NavLink to="/notifications" className="hover:text-white">
              <div className="text-sm border border-[#232F37] rounded-lg px-3 py-2 whitespace-nowrap">
                Notifications
              </div>
            </NavLink>

            {/* Profile */}
            <NavLink to="/profile" className="hover:text-white">
              <div className="flex items-center gap-2 text-sm border border-[#232F37] rounded-lg px-2 py-1">
                <img
                  src="/avatar.png"
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />

                {/* Profile Details */}
                <div className="leading-tight">
                  <p className="m-0 text-sm">Name</p>
                  <p className="m-0 text-xs">Rank</p>
                </div>
              </div>
            </NavLink>
          </div>
        </div>
      </nav>
    </header>
  );
}
