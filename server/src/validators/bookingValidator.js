const mongoose = require("mongoose");
const validationError = require("../middleware/validate");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];
const isoDateWithOffset =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/i;

function fail(next, details, status = 400) {
  const error = validationError(Array.isArray(details) ? details : [details]);
  error.status = status;
  return next(error);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseIsoDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(isoDateWithOffset);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", , zone, , zoneHourText, zoneMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const zoneHour = Number(zoneHourText || 0);
  const zoneMinute = Number(zoneMinuteText || 0);
  const daysInMonth = month >= 1 && month <= 12 ? new Date(Date.UTC(year, month, 0)).getUTCDate() : 0;

  if (
    day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 ||
    zoneMinute > 59 || zoneHour > 14 || (zoneHour === 14 && zoneMinute !== 0)
  ) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

function kolkataCalendarDay(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Math.floor(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) / 86400000);
}

function validateBookingDateWindow(startAt, errors) {
  const dayOffset = kolkataCalendarDay(startAt) - kolkataCalendarDay(new Date());
  if (dayOffset < 0 || dayOffset > 2) {
    errors.push("Bookings are limited to today and the next two calendar days in Asia/Kolkata.");
  }
}

function durationRules() {
  const read = (key, fallback) => {
    const value = process.env[key];
    if (value === undefined || value === "") return fallback;
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
      const error = new Error("Booking duration configuration is invalid.");
      error.status = 500;
      throw error;
    }
    return Number(value);
  };

  const rules = {
    min: read("BOOKING_MIN_DURATION_MINUTES", 30),
    max: read("BOOKING_MAX_DURATION_MINUTES", 720),
    step: read("BOOKING_DURATION_STEP_MINUTES", 30),
  };

  if (
    rules.min < 1 || rules.max < rules.min || rules.step < 1 ||
    rules.min % rules.step !== 0 || rules.max % rules.step !== 0
  ) {
    const error = new Error("Booking duration configuration is invalid.");
    error.status = 500;
    throw error;
  }
  return rules;
}

function parseTimeWindow(startValue, endValue, errors) {
  const startAt = parseIsoDate(startValue);
  const endAt = parseIsoDate(endValue);
  if (!startAt) errors.push("startAt must be an ISO 8601 timestamp with an explicit timezone offset.");
  if (!endAt) errors.push("endAt must be an ISO 8601 timestamp with an explicit timezone offset.");
  if (!startAt || !endAt) return null;

  if (startAt.getTime() <= Date.now()) errors.push("startAt must be in the future.");
  validateBookingDateWindow(startAt, errors);
  if (endAt <= startAt) errors.push("endAt must be later than startAt.");

  if (startAt.getTime() % 60000 !== 0 || endAt.getTime() % 60000 !== 0) {
    errors.push("Booking start and end times must fall on whole-minute boundaries.");
  }

  const durationMilliseconds = endAt.getTime() - startAt.getTime();
  if (durationMilliseconds % 60000 !== 0) {
    errors.push("Booking times must use whole-minute boundaries.");
    return null;
  }

  const durationMinutes = durationMilliseconds / 60000;
  const rules = durationRules();
  if (durationMinutes < rules.min || durationMinutes > rules.max || durationMinutes % rules.step !== 0) {
    errors.push(
      `Duration must be ${rules.min} to ${rules.max} minutes in increments of ${rules.step} minutes.`
    );
  }

  return { startAt, endAt, durationMinutes };
}

function validateStationId(value) {
  return typeof value === "string" && mongoose.isObjectIdOrHexString(value);
}

function validateAvailability(req, res, next) {
  const query = req.query;
  const errors = [];
  const allowed = ["stationId", "startAt", "endAt"];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }
  if (!validateStationId(query.stationId)) errors.push("stationId must be a valid MongoDB ObjectId.");

  const timeWindow = parseTimeWindow(query.startAt, query.endAt, errors);
  if (errors.length) return fail(next, errors);

  req.bookingAvailability = { stationId: query.stationId, ...timeWindow };
  return next();
}

function validateCreateBooking(req, res, next) {
  if (!isPlainObject(req.body)) return fail(next, "A JSON object is required.");
  const errors = [];
  const allowed = ["stationId", "startAt", "endAt"];
  for (const key of Object.keys(req.body)) {
    if (!allowed.includes(key)) errors.push(`Field '${key}' cannot be set by the client.`);
  }
  if (!validateStationId(req.body.stationId)) errors.push("stationId must be a valid MongoDB ObjectId.");

  const timeWindow = parseTimeWindow(req.body.startAt, req.body.endAt, errors);
  if (errors.length) return fail(next, errors);

  req.bookingInput = { stationId: req.body.stationId, ...timeWindow };
  return next();
}

function validateBookingId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return fail(next, "Booking ID must be a valid MongoDB ObjectId.");
  }
  return next();
}

function parsePagination(query, errors) {
  const parse = (key, defaultValue, maximum) => {
    if (query[key] === undefined) return defaultValue;
    if (typeof query[key] !== "string" || !/^[1-9]\d*$/.test(query[key])) {
      errors.push(`${key} must be a positive integer.`);
      return defaultValue;
    }
    const value = Number(query[key]);
    if (!Number.isSafeInteger(value) || value > maximum) {
      errors.push(`${key} must not exceed ${maximum}.`);
      return defaultValue;
    }
    return value;
  };
  return { page: parse("page", 1, 1000000), limit: parse("limit", 20, 100) };
}

function validateMyBookings(req, res, next) {
  const query = req.query;
  const errors = [];
  for (const key of Object.keys(query)) {
    if (!["status", "page", "limit"].includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }
  let status;
  if (query.status !== undefined) {
    status = typeof query.status === "string" ? query.status.toLowerCase() : "";
    if (!bookingStatuses.includes(status)) errors.push("status is not a valid booking status.");
  }
  const pagination = parsePagination(query, errors);
  if (errors.length) return fail(next, errors);
  req.bookingListQuery = { ...pagination, status };
  return next();
}

function validateAdminBookings(req, res, next) {
  const query = req.query;
  const errors = [];
  const allowed = ["status", "stationId", "from", "to", "page", "limit"];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }

  let status;
  if (query.status !== undefined) {
    status = typeof query.status === "string" ? query.status.toLowerCase() : "";
    if (!bookingStatuses.includes(status)) errors.push("status is not a valid booking status.");
  }
  let stationId;
  if (query.stationId !== undefined) {
    if (!validateStationId(query.stationId)) errors.push("stationId must be a valid MongoDB ObjectId.");
    else stationId = query.stationId;
  }

  const from = query.from === undefined ? undefined : parseIsoDate(query.from);
  const to = query.to === undefined ? undefined : parseIsoDate(query.to);
  if (query.from !== undefined && !from) errors.push("from must be an ISO 8601 timestamp with an explicit timezone offset.");
  if (query.to !== undefined && !to) errors.push("to must be an ISO 8601 timestamp with an explicit timezone offset.");
  if (from && to && from >= to) errors.push("from must be earlier than to.");

  const pagination = parsePagination(query, errors);
  if (errors.length) return fail(next, errors);
  req.adminBookingQuery = { ...pagination, status, stationId, from, to };
  return next();
}

function validateCancellation(req, res, next) {
  if (req.body === undefined) {
    req.cancellationReason = undefined;
    return next();
  }
  if (!isPlainObject(req.body)) return fail(next, "A JSON object is required.");

  const keys = Object.keys(req.body);
  if (keys.some((key) => key !== "reason")) return fail(next, "Only the reason field may be provided.");
  if (req.body.reason === undefined) {
    req.cancellationReason = undefined;
    return next();
  }
  if (typeof req.body.reason !== "string" || req.body.reason.trim().length < 3 || req.body.reason.trim().length > 500) {
    return fail(next, "reason must be between 3 and 500 characters.");
  }

  req.cancellationReason = req.body.reason.trim();
  return next();
}

function validateBookingPayment(req, res, next) {
  if (req.body !== undefined && (!isPlainObject(req.body) || Object.keys(req.body).length !== 0)) {
    return fail(next, "Booking payment does not accept a request body or client-supplied amount.");
  }
  return next();
}

module.exports = {
  validateAvailability,
  validateCreateBooking,
  validateBookingId,
  validateMyBookings,
  validateAdminBookings,
  validateCancellation,
  validateBookingPayment,
};
