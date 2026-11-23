const mongoose = require("mongoose");

function validationError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateNotificationList(req, res, next) {
  const query = req.query;
  const allowed = ["status", "scope", "page", "limit"];
  const errors = [];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }

  const status = query.status;
  if (status !== undefined && !["unread", "read"].includes(status)) errors.push("status must be unread or read.");
  const scope = query.scope;
  if (scope !== undefined && scope !== "operations") errors.push("scope must be operations.");
  if (scope === "operations" && req.auth.role !== "admin") {
    return next(validationError("You do not have permission to view operational notifications.", 403));
  }

  const parse = (key, fallback, max) => {
    const raw = query[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max) {
      errors.push(`${key} must be a positive integer no greater than ${max}.`);
      return fallback;
    }
    return Number(raw);
  };
  const page = parse("page", 1, 1000000);
  const limit = parse("limit", 20, 100);
  if (errors.length) return next(validationError(errors.join(" ")));
  req.notificationQuery = { status, scope, page, limit };
  return next();
}

function validateNotificationId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return next(validationError("Notification ID must be a valid MongoDB ObjectId."));
  }
  return next();
}

function validateEmptyRequest(req, res, next) {
  if (Object.keys(req.query).length > 0) return next(validationError("This endpoint does not accept query parameters."));
  if (req.body !== undefined && (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length > 0)) {
    return next(validationError("This endpoint does not accept a request body."));
  }
  return next();
}

module.exports = { validateNotificationList, validateNotificationId, validateEmptyRequest };
