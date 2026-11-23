const mongoose = require("mongoose");
const validationError = require("../middleware/validate");

const stationTypes = { pc: "PC", console: "Console", vr: "VR" };
const stationStatuses = ["active", "maintenance", "inactive"];
const editableFields = [
  "name",
  "code",
  "type",
  "description",
  "specifications",
  "installedGames",
  "hourlyRateMinor",
  "currency",
  "image",
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalid(details) {
  return validationError(Array.isArray(details) ? details : [details]);
}

function validateStationId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return next(invalid("Station ID must be a valid MongoDB ObjectId."));
  }
  return next();
}

function validateCreateStation(req, res, next) {
  const allowed = [...editableFields, "status"];
  return validateStationBody(req, next, allowed, true, true);
}

function validateUpdateStation(req, res, next) {
  return validateStationBody(req, next, editableFields, false, false);
}

function validateStationBody(req, next, allowedFields, isCreate, allowStatus) {
  if (!isPlainObject(req.body)) return next(invalid("A JSON object is required."));

  const errors = [];
  const input = {};
  const keys = Object.keys(req.body);

  for (const field of keys) {
    if (!allowedFields.includes(field)) errors.push(`Field '${field}' cannot be set here.`);
  }
  if (!isCreate && keys.length === 0) errors.push("At least one station field must be provided.");

  if (isCreate || Object.hasOwn(req.body, "name")) {
    const name = req.body.name;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      errors.push("Name must be between 2 and 100 characters.");
    } else input.name = name.trim();
  }

  if (isCreate || Object.hasOwn(req.body, "code")) {
    const code = req.body.code;
    if (typeof code !== "string" || !/^[a-z0-9][a-z0-9_-]{1,19}$/i.test(code.trim())) {
      errors.push("Code must be 2 to 20 letters, numbers, underscores, or hyphens.");
    } else input.code = code.trim().toUpperCase();
  }

  if (isCreate || Object.hasOwn(req.body, "type")) {
    const key = typeof req.body.type === "string" ? req.body.type.trim().toLowerCase() : "";
    const type = Object.hasOwn(stationTypes, key) ? stationTypes[key] : null;
    if (!type) errors.push("Type must be PC, Console, or VR.");
    else input.type = type;
  }

  if (isCreate || Object.hasOwn(req.body, "hourlyRateMinor")) {
    const rate = req.body.hourlyRateMinor;
    if (!Number.isSafeInteger(rate) || rate < 0) {
      errors.push("Hourly rate must be a non-negative integer amount in paise.");
    } else input.hourlyRateMinor = rate;
  }

  for (const field of ["description", "image"]) {
    if (!Object.hasOwn(req.body, field)) continue;
    const value = req.body[field];
    const maximum = field === "description" ? 1000 : 2048;
    if (typeof value !== "string" || value.trim().length > maximum) {
      errors.push(`${field === "description" ? "Description" : "Image"} must be a string of at most ${maximum} characters.`);
    } else input[field] = value.trim();
  }

  if (Object.hasOwn(req.body, "specifications")) {
    if (!isPlainObject(req.body.specifications)) {
      errors.push("Specifications must be a JSON object.");
    } else input.specifications = req.body.specifications;
  }

  if (Object.hasOwn(req.body, "installedGames")) {
    const games = req.body.installedGames;
    if (
      !Array.isArray(games) ||
      games.length > 50 ||
      games.some((game) => typeof game !== "string" || game.trim().length === 0 || game.trim().length > 80)
    ) {
      errors.push("Installed games must be an array of up to 50 non-empty names, each at most 80 characters.");
    } else input.installedGames = games.map((game) => game.trim());
  }

  if (Object.hasOwn(req.body, "currency")) {
    if (typeof req.body.currency !== "string" || req.body.currency.trim().toUpperCase() !== "INR") {
      errors.push("Currency must be INR.");
    } else input.currency = "INR";
  }

  if (allowStatus && Object.hasOwn(req.body, "status")) {
    const status = typeof req.body.status === "string" ? req.body.status.trim().toLowerCase() : "";
    if (!stationStatuses.includes(status)) errors.push("Status must be active, maintenance, or inactive.");
    else input.status = status;
  }

  if (errors.length) return next(invalid(errors));
  req.body = input;
  return next();
}

function validateStationStatus(req, res, next) {
  if (!isPlainObject(req.body)) return next(invalid("A JSON object is required."));
  const keys = Object.keys(req.body);
  const status = typeof req.body.status === "string" ? req.body.status.trim().toLowerCase() : "";

  if (keys.length !== 1 || keys[0] !== "status") {
    return next(invalid("Only the status field may be provided."));
  }
  if (!stationStatuses.includes(status)) {
    return next(invalid("Status must be active, maintenance, or inactive."));
  }

  req.body = { status };
  return next();
}

function validateStationList(req, res, next) {
  return validateStationListQuery(req, next, false);
}

function validateAdminStationList(req, res, next) {
  return validateStationListQuery(req, next, true);
}

function validateStationListQuery(req, next, isAdmin) {
  const query = req.query;
  const allowed = isAdmin ? ["type", "search", "status", "page", "limit"] : ["type", "search", "page", "limit"];
  const errors = [];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }

  let type;
  if (query.type !== undefined) {
    const key = typeof query.type === "string" ? query.type.trim().toLowerCase() : "";
    type = Object.hasOwn(stationTypes, key) ? stationTypes[key] : null;
    if (!type) errors.push("Type must be PC, Console, or VR.");
  }

  let search;
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.trim().length > 100) {
      errors.push("Search must be a string of at most 100 characters.");
    } else search = query.search.trim();
  }

  let status;
  if (isAdmin && query.status !== undefined) {
    status = typeof query.status === "string" ? query.status.trim().toLowerCase() : "";
    if (!stationStatuses.includes(status)) errors.push("Status must be active, maintenance, or inactive.");
  }

  const page = parsePositiveInteger(query.page, 1, 1000000, "Page", errors);
  const limit = parsePositiveInteger(query.limit, 20, 100, "Limit", errors);
  if (errors.length) return next(invalid(errors));

  req.stationListQuery = { type, search, status, page, limit };
  return next();
}

function parsePositiveInteger(value, defaultValue, maximum, label, errors) {
  if (value === undefined) return defaultValue;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    errors.push(`${label} must be a positive integer.`);
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    errors.push(`${label} must not exceed ${maximum}.`);
    return defaultValue;
  }
  return parsed;
}

module.exports = {
  validateCreateStation,
  validateStationList,
  validateAdminStationList,
  validateStationId,
  validateUpdateStation,
  validateStationStatus,
};
