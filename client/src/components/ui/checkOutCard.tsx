export default function CheckoutCard() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-[#164B54] bg-gradient-to-b from-[#191D25] to-[#151A20] p-5 shadow-[0_0_20px_rgba(0,229,245,0.08)] text-[#C5D0D8]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold tracking-widest text-[#00E5F5]">
          ● ACTIVE SELECTION
        </p>

        <span className="rounded-full border border-[#237E69] bg-[#123C36] px-3 py-1 text-xs font-bold text-[#38E8BA]">
          Locked In
        </span>
      </div>

      <h2 className="text-base font-bold text-white">Rig 04 - VIP Pod</h2>

      <div className="border-t border-[#303943] my-4" />

      {/* Selected Station */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#263640] bg-[#0D1218] p-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#17616D] bg-[#103039] text-[#00E5F5]">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 21h8m-4-4v4" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Zone A - Station #04</p>

            <p className="text-xs leading-relaxed text-[#00E5F5]">
              RTX 4090 • 540Hz OLED Display
            </p>
          </div>
        </div>

        <button className="shrink-0 text-xs font-semibold text-[#9BAAB4] underline underline-offset-2 hover:text-[#00E5F5]">
          Change Rig
        </button>
      </div>

      {/* Duration */}
      <section className="mt-5">
        <h3 className="mb-3 text-xs font-bold tracking-wide text-[#AAB7C0]">
          1. SELECT DURATION
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[#303943] bg-[#202630] p-3">
            <p className="text-sm font-bold text-white">1 Hour</p>
            <p className="mt-1 text-xs text-[#8796A1]">$8.50 Standard</p>
          </div>

          <div className="rounded-lg border border-[#00E5F5] bg-[#10343B] p-3 shadow-[0_0_10px_rgba(0,229,245,0.12)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">2 Hours</p>
              <span className="text-[#00E5F5] text-sm">◉</span>
            </div>

            <p className="mt-1 text-xs font-bold text-[#00E5F5]">
              $16.00 ($8/hr)
            </p>
          </div>

          <div className="rounded-lg border border-[#303943] bg-[#202630] p-3">
            <p className="text-sm font-bold text-white">3 Hours</p>
            <p className="mt-1 text-xs font-bold text-[#38E8BA]">
              $22.50 (Save 12%)
            </p>
          </div>

          <div className="rounded-lg border border-[#51415F] bg-[#282330] p-3">
            <p className="text-sm font-bold text-white">Night Owl Pass</p>
            <p className="mt-1 text-xs text-[#C9A3E8]">6h + $39.00</p>
          </div>
        </div>
      </section>

      {/* Snacks and Drinks */}
      <section className="mt-5">
        <h3 className="mb-3 text-xs font-bold tracking-wide text-[#AAB7C0]">
          2. SNACKS & DRINKS (DELIVERED TO DESK)
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#0D1218] p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#00E5F5] text-xs text-black">
                ✓
              </span>

              <p className="text-xs font-semibold text-white">
                Monster Energy Mango Loco
              </p>
            </div>

            <span className="shrink-0 text-xs font-bold text-[#C5D0D8]">
              +$3.50
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-[#0D1218] p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-4 w-4 shrink-0 rounded-sm border border-[#59636D] bg-[#252B33]" />

              <p className="text-xs font-semibold text-[#B8C2CA]">
                Hot Spicy Tonkotsu Ramen
              </p>
            </div>

            <span className="shrink-0 text-xs font-bold text-[#C5D0D8]">
              +$6.00
            </span>
          </div>
        </div>
      </section>

      {/* Price Summary */}
      <section className="mt-5 border-t border-[#303943] pt-4 space-y-3">
        <div className="flex justify-between gap-2 text-xs">
          <span className="text-[#9BAAB4]">2-Hour VIP Rig Session:</span>
          <span className="font-semibold text-white">$16.00</span>
        </div>

        <div className="flex justify-between gap-2 text-xs">
          <span className="text-[#9BAAB4]">Monster Energy Drink:</span>
          <span className="font-semibold text-white">+$3.50</span>
        </div>

        <div className="flex justify-between gap-2 rounded-md bg-[#332A3C] px-3 py-2 text-xs">
          <span className="text-[#C9A3E8]">VIP Diamond 20% Discount:</span>
          <span className="font-bold text-[#C9A3E8]">-$3.20</span>
        </div>
      </section>

      {/* Total */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-white">Total Due:</span>

        <div className="text-right">
          <p className="text-2xl font-extrabold text-[#00E5F5]">$16.30</p>

          <p className="text-[10px] text-[#74838D]">
            Deducted from $148.50 Wallet
          </p>
        </div>
      </div>

      {/* Checkout Button */}
      <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5F5] py-3.5 text-sm font-extrabold text-[#061519] shadow-[0_0_16px_rgba(0,229,245,0.25)] transition hover:bg-[#39F3FF] hover:shadow-[0_0_22px_rgba(0,229,245,0.4)]">
        <span className="text-lg">ϟ</span>
        Reserve & Unlock Rig #04
      </button>

      {/* Footer */}
      <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-medium text-[#38B98F]">
        <span>●</span>
        Immediate seat activation • Instant pin unlock
      </p>
    </div>
  );
}
