import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatMinor, getWallet } from "../../lib/api";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [balanceMinor, setBalanceMinor] = useState<number | null>(null);
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let previousScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setNavbarVisible(currentScrollY < 80 || currentScrollY < previousScrollY);
      previousScrollY = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!token) { setBalanceMinor(null); return; }
    let active = true;
    const refresh = () => getWallet(token).then(({ wallet }) => { if (active) setBalanceMinor(wallet.balanceMinor); }).catch(() => { if (active) setBalanceMinor(null); });
    void refresh();
    window.addEventListener("nexus-wallet-updated", refresh);
    return () => { active = false; window.removeEventListener("nexus-wallet-updated", refresh); };
  }, [token, location.key]);

  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `transition-all duration-200 whitespace-nowrap ${isActive ? "text-[#00F0FF] underline underline-offset-8 decoration-2" : "text-[#ACBCBD] hover:text-white no-underline"}`;
  const closeMenu = () => setMenuOpen(false);
  const signOut = async () => { await logout(); closeMenu(); navigate("/"); };
  const initials = user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "N";

  const navLinks = (
    <>
      <NavLink to="/" className={linkStyle} onClick={closeMenu}>Explore Stations</NavLink>
      {user && <NavLink to="/myBookings" className={linkStyle} onClick={closeMenu}>My Bookings</NavLink>}
      {user?.role === "admin" && <NavLink to="/admin" className={linkStyle} onClick={closeMenu}>Admin</NavLink>}
    </>
  );

  const walletLink = user && (
    <NavLink to="/wallet" onClick={closeMenu} className="no-underline">
      <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#232F37] px-2 py-2 text-xs transition hover:border-[#00F0FF]">
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="5" width="20" height="15" rx="2" /><path d="M2 9h20" /></svg>
        <span>{balanceMinor === null ? "Wallet" : formatMinor(balanceMinor)}</span>
        <span className="rounded-sm bg-[#00F0FF] px-2 py-1 text-black">+ Top up</span>
      </div>
    </NavLink>
  );

  return (
    <div className={`sticky top-0 z-50 transition-transform duration-300 ${navbarVisible ? "translate-y-0" : "-translate-y-full"}`}>
      <header className="relative z-50 bg-black text-[#ACBCBD]">
        <nav className="flex min-h-[60px] items-center justify-between px-4 md:px-6">
          <Link to="/" onClick={closeMenu} className="shrink-0 no-underline">
            <span className="text-xl font-bold leading-none text-[#ACBCBD] sm:text-2xl">NEXUS ARENA</span>
          </Link>

          <div className="hidden items-center gap-6 lg:flex xl:gap-10">
            <div className="flex items-center gap-6 xl:gap-10">{navLinks}</div>
            <div className="flex items-center gap-3 xl:gap-4">
              {walletLink}
              {user ? (
                <>
                  <NavLink to="/profile" className="no-underline">
                    <div className="flex items-center gap-2 rounded-lg border border-[#232F37] px-2 py-1 transition hover:border-[#00F0FF]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00F0FF] text-black">{initials}</span>
                      <div className="leading-tight"><p className="m-0 max-w-28 truncate text-sm">{user.name}</p><p className="m-0 text-xs capitalize text-[#84919D]">{user.role}</p></div>
                    </div>
                  </NavLink>
                  <button onClick={() => void signOut()} className="text-xs text-[#ACBCBD] transition hover:text-white">Log out</button>
                </>
              ) : <div className="flex items-center gap-4"><Link to="/login" className="text-sm text-[#ACBCBD] hover:text-white">Log in</Link><Link to="/register" className="rounded-lg bg-[#00E5F5] px-3 py-2 text-xs font-bold text-[#061519]">Create account</Link></div>}
            </div>
          </div>

          <button onClick={() => setMenuOpen((open) => !open)} className="rounded-md p-2 text-[#00F0FF] transition hover:bg-[#232F37] lg:hidden" aria-label="Toggle navigation menu" aria-expanded={menuOpen}>
            {menuOpen ? <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg> : <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </nav>

        {menuOpen && <div className="flex flex-col gap-5 border-t border-[#232F37] bg-black px-5 py-5 lg:hidden">
          <div className="flex flex-col gap-5">{navLinks}</div>
          {walletLink}
          {user ? <>
            <NavLink to="/profile" onClick={closeMenu} className="flex items-center gap-3 rounded-lg border border-[#232F37] p-3 no-underline">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00F0FF] text-black">{initials}</span>
              <span className="leading-tight"><span className="block text-sm text-white">{user.name}</span><span className="block text-xs capitalize text-[#84919D]">{user.role}</span></span>
            </NavLink>
            <button onClick={() => void signOut()} className="self-start text-sm text-[#ACBCBD] hover:text-white">Log out</button>
          </> : <div className="flex items-center gap-4"><Link to="/login" onClick={closeMenu} className="text-sm text-[#ACBCBD] hover:text-white">Log in</Link><Link to="/register" onClick={closeMenu} className="rounded-lg bg-[#00E5F5] px-3 py-2 text-xs font-bold text-[#061519]">Create account</Link></div>}
        </div>}
      </header>
    </div>
  );
}
