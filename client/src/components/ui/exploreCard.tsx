export default function exploreCard() {
  return (
    <div className="w-full max-w-[420px] rounded-[18px] border-2 border-[#00E5F5] bg-gradient-to-br from-[#172A30] via-[#191D25] to-[#171A22] p-5 shadow-[0_0_20px_rgba(0,229,245,0.12)]">
      {/* Top Badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="rounded-full border border-[#77528D] bg-[#473252] px-3 py-1 text-[11px] font-bold text-[#D8B8F0]">
          VIP Stage Pod #04
        </span>

        <span className="flex items-center gap-2 rounded-full border border-[#237E69] bg-[#123C36] px-3 py-1 text-[11px] font-semibold text-[#38E8BA]">
          <span className="h-2 w-2 rounded-full bg-[#38E8BA]" />
          Ready Now
        </span>
      </div>

      {/* Station Name */}
      <h2 className="flex items-center gap-2 text-xl font-bold text-white">
        Rig 04 - VIP Pod
        <span className="text-[#00E5F5]">✥</span>
      </h2>

      <p className="mt-1 text-xs font-medium text-[#A5B4BC]">
        Zone A • Center Arena Mainstage
      </p>

      {/* Specifications */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-[#285D69] bg-[#17333C] px-2.5 py-1.5 text-xs font-semibold text-[#4DDCE9]">
          ⚙ RTX 4090 OC
        </span>

        <span className="rounded-md border border-[#414B54] bg-[#252B33] px-2.5 py-1.5 text-xs font-semibold text-[#B6C0C9]">
          i9-14900KS
        </span>

        <span className="rounded-md border border-[#276B5B] bg-[#18352F] px-2.5 py-1.5 text-xs font-semibold text-[#39DDB0]">
          540Hz ROG OLED
        </span>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[#303943]" />

      {/* Installed Games */}
      <div className="flex items-start gap-2 text-xs text-[#B9C3CB]">
        <span className="text-[#38D8E9]">♧</span>
        <p>Installed: Valorant, CS2, Cyberpunk 2077</p>
      </div>

      {/* Accessories */}
      <div className="mt-2 flex items-start gap-2 text-xs text-[#82939D]">
        <span>▣</span>
        <p>Herman Miller Embody • Wooting 60HE Hall Effect</p>
      </div>

      {/* Bottom Section */}
      <div className="mt-10 border-t border-[#303943] pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* Price */}
          <div>
            <p className="text-3xl font-extrabold text-white">
              $8.50
              <span className="text-xs font-medium text-[#A5B4BC]">/hr</span>
            </p>

            <p className="mt-1 text-xs font-bold text-[#C9A3E8]">
              VIP Member: $6.80/hr
            </p>
          </div>

          {/* Button */}
          <button className="flex items-center gap-2 rounded-xl bg-[#00E5F5] px-5 py-3 text-sm font-bold text-[#061519] shadow-[0_0_18px_rgba(0,229,245,0.35)] transition hover:scale-105 hover:bg-[#39F3FF]">
            ⚡ Selected
          </button>
        </div>
      </div>
    </div>
  );
}
