import test from "node:test";
import assert from "node:assert/strict";
import { removeStationSelection, toggleStationSelection, uniqueStations } from "../../src/lib/stationSelection.js";

const activeStation = { id: "station-a", name: "Apex PC", status: "active" };
const secondStation = { id: "station-b", name: "Orbit Console", status: "active" };

test("selection adds multiple stations and toggles a selected station off", () => {
  const once = toggleStationSelection([], activeStation);
  const twice = toggleStationSelection(once, secondStation);
  assert.deepEqual(twice.map(({ id }) => id), ["station-a", "station-b"]);
  assert.deepEqual(toggleStationSelection(twice, activeStation).map(({ id }) => id), ["station-b"]);
});

test("station selection removes duplicate IDs and refuses inactive stations", () => {
  assert.deepEqual(uniqueStations([activeStation, { ...activeStation, name: "duplicate" }]), [activeStation]);
  assert.deepEqual(toggleStationSelection([], { ...activeStation, status: "inactive" }), []);
  assert.deepEqual(toggleStationSelection([], { ...activeStation, status: "maintenance" }), []);
});

test("removing the last selected station leaves an empty cart", () => {
  assert.deepEqual(removeStationSelection([activeStation], "station-a"), []);
});
