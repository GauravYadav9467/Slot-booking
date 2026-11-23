import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { Station } from "../lib/api";
import { removeStationSelection, toggleStationSelection, uniqueStations } from "../lib/stationSelection.js";

const storageKey = "nexusArenaBookingSelectionV1";

function readSelection(): Station[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(value)) return [];
    return uniqueStations(value.filter((station): station is Station =>
      station && typeof station.id === "string" && typeof station.name === "string" &&
      typeof station.code === "string" && ["PC", "Console", "VR"].includes(station.type) &&
      ["active", "maintenance", "inactive"].includes(station.status)
    ));
  } catch {
    return [];
  }
}

type BookingSelectionValue = {
  selectedStations: Station[];
  selectedStationIds: string[];
  toggleStation: (station: Station) => void;
  removeStation: (stationId: string) => void;
  clearSelection: () => void;
};

const BookingSelectionContext = createContext<BookingSelectionValue | null>(null);

export function BookingSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedStations, setSelectedStations] = useState<Station[]>(readSelection);
  const currentSelection = useRef(selectedStations);

  const updateSelection = useCallback((next: Station[] | ((current: Station[]) => Station[])) => {
    const normalized = uniqueStations(typeof next === "function" ? next(currentSelection.current) : next);
    currentSelection.current = normalized;
    setSelectedStations(normalized);
    try { sessionStorage.setItem(storageKey, JSON.stringify(normalized)); } catch { /* The in-memory cart remains available for this page session. */ }
  }, []);

  const toggleStation = useCallback((station: Station) => {
    if (station.status !== "active") return;
    updateSelection((current) => toggleStationSelection(current, station));
  }, [updateSelection]);

  const removeStation = useCallback((stationId: string) => {
    updateSelection((current) => removeStationSelection(current, stationId));
  }, [updateSelection]);

  const clearSelection = useCallback(() => updateSelection([]), [updateSelection]);
  const selectedStationIds = useMemo(() => selectedStations.map((station) => station.id), [selectedStations]);
  const value = useMemo(() => ({ selectedStations, selectedStationIds, toggleStation, removeStation, clearSelection }), [
    selectedStations, selectedStationIds, toggleStation, removeStation, clearSelection,
  ]);

  return <BookingSelectionContext.Provider value={value}>{children}</BookingSelectionContext.Provider>;
}

export function useBookingSelection() {
  const value = useContext(BookingSelectionContext);
  if (!value) throw new Error("useBookingSelection must be used inside BookingSelectionProvider.");
  return value;
}
