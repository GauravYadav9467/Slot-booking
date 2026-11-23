const mongoose = require("mongoose");

function validateOverviewRequest(req, res, next) {
  if (Object.keys(req.query).length > 0) {
    const error = new Error("The admin overview does not accept query parameters.");
    error.status = 400;
    return next(error);
  }
  return next();
}

function validateCustomerList(req, res, next) {
  const errors = [];
  for (const key of Object.keys(req.query)) if (!["search", "status", "page", "limit"].includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  let search;
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== "string" || !req.query.search.trim() || req.query.search.trim().length > 100) errors.push("search must be between 1 and 100 characters.");
    else search = req.query.search.trim();
  }
  let status;
  if (req.query.status !== undefined) {
    status = typeof req.query.status === "string" ? req.query.status.toLowerCase() : "";
    if (!["active", "blocked"].includes(status)) errors.push("status must be active or blocked.");
  }
  const parse = (key, fallback, max) => {
    const raw = req.query[key];
    if (raw === undefined) return fallback;
    if (typeof raw !== "string" || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max) {
      errors.push(`${key} must be a positive integer no greater than ${max}.`);
      return fallback;
    }
    return Number(raw);
  };
  const page = parse("page", 1, 1000000);
  const limit = parse("limit", 20, 100);
  if (errors.length) return next(validationError(errors));
  req.customerQuery = { search, status, page, limit };
  return next();
}

function validateCustomerId(req, res, next) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return next(validationError("Customer ID must be a valid MongoDB ObjectId."));
  return next();
}

function validationError(message) {
  const error = new Error(Array.isArray(message) ? message.join(" ") : message);
  error.status = 400;
  return error;
}

module.exports = { validateOverviewRequest, validateCustomerList, validateCustomerId };
