const Station = require("../models/Station");

const publicFields =
  "name code type description specifications installedGames hourlyRateMinor currency status image";

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeStation(station) {
  const value = typeof station.toObject === "function" ? station.toObject() : station;
  const result = { id: value._id.toString() };

  for (const field of [
    "name",
    "code",
    "type",
    "description",
    "specifications",
    "installedGames",
    "hourlyRateMinor",
    "currency",
    "status",
    "image",
  ]) {
    if (value[field] !== undefined) result[field] = value[field];
  }

  return result;
}

function mapDuplicateCode(error) {
  if (error.code === 11000 && (error.keyPattern?.code || error.keyValue?.code)) {
    return createError("A station with this code already exists.", 409);
  }
  return error;
}

async function createStation(input) {
  try {
    const station = await Station.create({
      ...input,
      code: input.code.toUpperCase(),
      currency: "INR",
      status: input.status || "active",
    });
    return safeStation(station);
  } catch (error) {
    throw mapDuplicateCode(error);
  }
}

async function listStations({ type, search, page, limit }) {
  return queryStations({ type, search, page, limit, status: "active" });
}

async function listAdminStations({ type, search, status, page, limit }) {
  return queryStations({ type, search, status, page, limit });
}

async function queryStations({ type, search, status, page, limit }) {
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: escapedSearch, $options: "i" };
  }

  const [stations, total] = await Promise.all([
    Station.find(filter)
      .select(publicFields)
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Station.countDocuments(filter),
  ]);

  return {
    stations: stations.map(safeStation),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getStationById(id) {
  const station = await Station.findById(id).select(publicFields).lean();
  if (!station) throw createError("Station not found.", 404);
  return safeStation(station);
}

async function updateStation(id, updates) {
  const station = await Station.findById(id);
  if (!station) throw createError("Station not found.", 404);

  Object.assign(station, updates);
  try {
    await station.save();
    return safeStation(station);
  } catch (error) {
    throw mapDuplicateCode(error);
  }
}

async function updateStationStatus(id, status) {
  const station = await Station.findById(id);
  if (!station) throw createError("Station not found.", 404);

  station.status = status;
  await station.save();
  return safeStation(station);
}

async function deactivateStation(id) {
  const station = await Station.findById(id);
  if (!station) throw createError("Station not found.", 404);

  station.status = "inactive";
  await station.save();
  return safeStation(station);
}

module.exports = {
  createStation,
  listStations,
  listAdminStations,
  getStationById,
  updateStation,
  updateStationStatus,
  deactivateStation,
};
