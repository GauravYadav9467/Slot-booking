const stationService = require("../services/stationService");

async function createStation(req, res) {
  const station = await stationService.createStation(req.body);
  res.status(201).json({ status: "success", data: { station } });
}

async function listStations(req, res) {
  const result = await stationService.listStations(req.stationListQuery);
  res.status(200).json({ status: "success", data: result });
}

async function getStation(req, res) {
  const station = await stationService.getStationById(req.params.id);
  res.status(200).json({ status: "success", data: { station } });
}

async function updateStation(req, res) {
  const station = await stationService.updateStation(req.params.id, req.body);
  res.status(200).json({ status: "success", data: { station } });
}

async function updateStationStatus(req, res) {
  const station = await stationService.updateStationStatus(req.params.id, req.body.status);
  res.status(200).json({ status: "success", data: { station } });
}

async function deactivateStation(req, res) {
  const station = await stationService.deactivateStation(req.params.id);
  res.status(200).json({
    status: "success",
    message: "Station deactivated. Station records are retained for booking history.",
    data: { station },
  });
}

module.exports = {
  createStation,
  listStations,
  getStation,
  updateStation,
  updateStationStatus,
  deactivateStation,
};
