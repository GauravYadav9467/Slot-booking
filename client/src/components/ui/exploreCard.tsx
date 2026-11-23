import { Link } from "react-router-dom";
import { formatMinor, type Station } from "../../lib/api";

export default function ExploreCard({ station, selected, onSelect }: {
  station: Station;
  selected: boolean;
  onSelect: (station: Station) => void;
}) {
  const specs = Object.entries(station.specifications || {}).filter(([, value]) => typeof value === "string" || typeof value === "number").slice(0, 3);
  return (
    <article className={`w-full min-w-0 rounded-[18px] border-2 bg-gradient-to-br from-[#172A30] via-[#191D25] to-[#171A22] p-5 shadow-[0_0_20px_rgba(0,229,245,0.12)] transition ${selected ? "border-[#00E5F5]" : "border-[#164B54] hover:border-[#00E5F5]/70"}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="max-w-full break-words rounded-full border border-[#285D69] bg-[#17333C] px-3 py-1 text-[11px] font-bold text-[#4DDCE9]">{station.type} · {station.code}</span>
        <span className="flex items-center gap-2 rounded-full border border-[#237E69] bg-[#123C36] px-3 py-1 text-[11px] font-semibold text-[#38E8BA]">
          <span className="h-2 w-2 rounded-full bg-[#38E8BA]" />Active station
        </span>
      </div>

      {station.image && <img src={station.image} alt="" className="mb-4 h-36 w-full rounded-xl border border-[#303943] object-cover" loading="lazy" />}
      <h2 className="flex min-w-0 items-center gap-2 text-xl font-bold text-white"><span className="min-w-0 break-words">{station.name}</span><span className="shrink-0 text-[#00E5F5]">✦</span></h2>
      <p className="mt-1 line-clamp-2 min-h-5 break-words text-xs font-medium text-[#A5B4BC]">{station.description || "Gaming station at NEXUS ARENA"}</p>

      <div className="mt-4 flex min-h-8 flex-wrap gap-2">
        {specs.length ? specs.map(([key, value]) => (
          <span key={key} className="max-w-full break-words rounded-md border border-[#285D69] bg-[#17333C] px-2.5 py-1.5 text-xs font-semibold text-[#4DDCE9]">{key}: {String(value)}</span>
        )) : <span className="rounded-md border border-[#414B54] bg-[#252B33] px-2.5 py-1.5 text-xs font-semibold text-[#B6C0C9]">{station.type} station</span>}
      </div>
      <div className="my-3 border-t border-[#303943]" />
      <div className="flex min-h-10 items-start gap-2 text-xs text-[#B9C3CB]">
        <span className="text-[#38D8E9]">♧</span>
        <p className="min-w-0 break-words">{station.installedGames?.length ? `Installed: ${station.installedGames.join(", ")}` : "Ask lounge staff about the current game library."}</p>
      </div>

      <div className="mt-6 border-t border-[#303943] pt-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="min-w-0 break-all text-3xl font-extrabold text-white">{formatMinor(station.hourlyRateMinor)}<span className="ml-1 whitespace-nowrap text-xs font-medium text-[#A5B4BC]">/hr</span></p>
            <p className="mt-1 text-xs text-[#A5B4BC]">Price set by the lounge</p>
          </div>
          <button type="button" aria-pressed={selected} aria-label={`${selected ? "Remove" : "Add"} ${station.name} ${selected ? "from" : "to"} booking selection`} onClick={() => onSelect(station)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00E5F5] px-4 py-3 text-sm font-bold text-[#061519] shadow-[0_0_18px_rgba(0,229,245,0.25)] transition hover:bg-[#39F3FF] xl:w-auto">
            {selected ? "Remove station" : "Select station"}
          </button>
        </div>
        <Link to={`/stations/${station.id}`} className="mt-4 inline-block text-xs font-semibold text-[#4DDCE9] underline-offset-4 hover:underline">View station details</Link>
      </div>
    </article>
  );
}
