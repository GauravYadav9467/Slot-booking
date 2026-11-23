import { useNavigate } from "react-router-dom";
import { useBookingSelection } from "../../context/BookingSelectionContext";

export default function BookingSelectionFooter() {
  const navigate = useNavigate();
  const { selectedStations, removeStation } = useBookingSelection();
  if (!selectedStations.length) return null;

  const preview = selectedStations.slice(0, 2).map((station) => station.name).join(" · ");
  const remaining = selectedStations.length - 2;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-[#164B54] bg-[#0D1218]/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.35)] backdrop-blur sm:px-8 sm:pt-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-white">{selectedStations.length} {selectedStations.length === 1 ? "Station" : "Stations"} Selected</p>
          <p className="truncate text-xs text-[#A5B4BC]">{preview}{remaining > 0 ? ` · +${remaining} more` : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => navigate("/checkout")} className="flex-1 rounded-lg bg-[#00E5F5] px-5 py-3 text-sm font-extrabold text-[#061519] shadow-[0_0_16px_rgba(0,229,245,0.2)] transition hover:bg-[#39F3FF] sm:flex-none">
            Continue to Checkout
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-[#303943] px-3 py-3 text-xs font-semibold text-[#C5D0D8] hover:border-[#00E5F5]">Review</summary>
            <div className="absolute right-0 bottom-full mb-2 max-h-64 w-72 overflow-y-auto rounded-xl border border-[#285D69] bg-[#111920] p-2 shadow-xl">
              {selectedStations.map((station) => <div key={station.id} className="flex items-center justify-between gap-3 border-b border-[#263640] px-2 py-2 last:border-0">
                <span className="min-w-0 truncate text-xs text-white">{station.name}</span>
                <button type="button" aria-label={`Remove ${station.name}`} onClick={() => removeStation(station.id)} className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-rose-200 hover:bg-rose-950/50">Remove</button>
              </div>)}
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}
