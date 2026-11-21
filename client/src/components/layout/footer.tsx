import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#202832] bg-[#0B0F15]">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Brand & Copyright */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#38B98F] shadow-[0_0_8px_rgba(56,185,143,0.5)]" />

            <Link
              to="/"
              className="text-sm font-bold tracking-wide text-white hover:text-[#00E5F5] transition"
            >
              NEXUS ARENA TOKYO
            </Link>

            <p className="text-xs text-[#84919D] text-center">
              © 2025 Nexus Gaming Lounge Tokyo. High-Performance Esports LAN
              Grid.
            </p>
          </div>

          {/* Footer Navigation */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a
              href="/house-rules"
              className="text-xs font-medium text-[#B2BEC8] hover:text-[#00E5F5] transition-colors"
            >
              House Rules & FAQ
            </a>

            <a
              href="/pricing"
              className="text-xs font-medium text-[#B2BEC8] hover:text-[#00E5F5] transition-colors"
            >
              Pricing & Passes
            </a>

            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#B2BEC8] hover:text-[#00E5F5] transition-colors"
            >
              Discord Community ↗
            </a>

            <a
              href="mailto:staff@nexusarena.com"
              className="text-xs font-medium text-[#B2BEC8] hover:text-[#00E5F5] transition-colors"
            >
              Contact Staff
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
