import type { Station } from "./api";

export function uniqueStations(stations: Station[]): Station[];
export function toggleStationSelection(stations: Station[], station: Station): Station[];
export function removeStationSelection(stations: Station[], stationId: string): Station[];
