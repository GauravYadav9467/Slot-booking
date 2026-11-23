export function uniqueStations(stations) {
  const seen = new Set();
  return stations.filter((station) => {
    if (!station?.id || seen.has(station.id)) return false;
    seen.add(station.id);
    return true;
  });
}

export function toggleStationSelection(stations, station) {
  if (!station || station.status !== "active") return stations;
  if (stations.some((selected) => selected.id === station.id)) {
    return stations.filter((selected) => selected.id !== station.id);
  }
  return uniqueStations([...stations, station]);
}

export function removeStationSelection(stations, stationId) {
  return stations.filter((station) => station.id !== stationId);
}
