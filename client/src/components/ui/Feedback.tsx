import type { ReactNode } from "react";

export function LoadingState({ label = "Loading NEXUS ARENA…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-[#A5B4BC]" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#00E5F5] border-t-transparent" />
      {label}
    </div>
  );
}

export function Notice({ kind = "error", children }: { kind?: "error" | "success" | "info"; children: ReactNode }) {
  const colors = {
    error: "border-rose-900/70 bg-rose-950/50 text-rose-200",
    success: "border-emerald-800 bg-emerald-950/40 text-emerald-200",
    info: "border-[#285D69] bg-[#103039] text-[#9FEAF0]",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${colors[kind]}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="mb-7">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#00E5F5]">{eyebrow}</p>}
      <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A5B4BC]">{description}</p>}
    </header>
  );
}

export const inputClass = "w-full rounded-lg border border-[#303943] bg-[#0D1218] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-[#74838D] focus:border-[#00E5F5] focus:ring-2 focus:ring-[#00E5F5]/15";
export const buttonPrimary = "inline-flex items-center justify-center rounded-lg bg-[#00E5F5] px-5 py-3 text-sm font-extrabold text-[#061519] shadow-[0_0_16px_rgba(0,229,245,0.18)] transition hover:bg-[#39F3FF] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonSecondary = "inline-flex items-center justify-center rounded-lg border border-[#285D69] bg-[#103039] px-4 py-2.5 text-sm font-bold text-[#9FEAF0] transition hover:border-[#00E5F5] disabled:cursor-not-allowed disabled:opacity-50";
