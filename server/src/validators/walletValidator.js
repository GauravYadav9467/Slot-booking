const mongoose = require("mongoose");
const validationError = require("../middleware/validate");

const transactionTypes = ["top_up", "booking_charge", "refund", "adjustment"];
const transactionStatuses = ["pending", "success", "failed"];

function fail(next, message) {
  return next(validationError(Array.isArray(message) ? message : [message]));
}

function validateIdempotencyKey(req, res, next) {
  const key = req.get("Idempotency-Key");
  if (typeof key !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    return fail(next, "Idempotency-Key must contain 8 to 128 letters, numbers, periods, underscores, colons, or hyphens.");
  }
  req.idempotencyKey = key;
  return next();
}

function validateWalletQuery(req, res, next) {
  if (Object.keys(req.query).length) return fail(next, "Wallet balance does not accept query parameters.");
  return next();
}

function validateTopUp(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return fail(next, "A JSON object is required.");
  }
  const errors = [];
  if (Object.keys(req.body).some((key) => key !== "amountMinor")) errors.push("Only amountMinor may be provided.");
  if (!Number.isSafeInteger(req.body.amountMinor) || req.body.amountMinor <= 0) {
    errors.push("amountMinor must be a positive safe integer in paise.");
  }
  if (errors.length) return fail(next, errors);
  req.topUpAmountMinor = req.body.amountMinor;
  return next();
}

function validateTransactionList(req, res, next) {
  const errors = [];
  for (const key of Object.keys(req.query)) {
    if (!["type", "status", "page", "limit"].includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  }
  const { type, status } = req.query;
  if (type !== undefined && (typeof type !== "string" || !transactionTypes.includes(type))) {
    errors.push("type is not a valid transaction type.");
  }
  if (status !== undefined && (typeof status !== "string" || !transactionStatuses.includes(status))) {
    errors.push("status is not a valid transaction status.");
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
  if (errors.length) return fail(next, errors);
  req.transactionQuery = { type, status, page, limit };
  return next();
}

function validateAdminTransactionList(req, res, next) {
  const errors = [];
  for (const key of Object.keys(req.query)) if (!["type", "status", "search", "page", "limit"].includes(key)) errors.push(`Query parameter '${key}' is not supported.`);
  const { type, status } = req.query;
  if (type !== undefined && (typeof type !== "string" || !transactionTypes.includes(type))) errors.push("type is not a valid transaction type.");
  if (status !== undefined && (typeof status !== "string" || !transactionStatuses.includes(status))) errors.push("status is not a valid transaction status.");
  let search;
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== "string" || !req.query.search.trim() || req.query.search.trim().length > 100) errors.push("search must be between 1 and 100 characters.");
    else search = req.query.search.trim();
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
  if (errors.length) return fail(next, errors);
  req.adminTransactionQuery = { type, status, search, page, limit };
  return next();
}

function validateAdjustment(req, res, next) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return fail(next, "A JSON object is required.");
  }
  const allowed = ["userId", "direction", "amountMinor", "reason"];
  const errors = [];
  if (Object.keys(req.body).some((key) => !allowed.includes(key))) errors.push("Only userId, direction, amountMinor, and reason may be provided.");
  if (typeof req.body.userId !== "string" || !mongoose.isObjectIdOrHexString(req.body.userId)) errors.push("userId must be a valid MongoDB ObjectId.");
  if (!["credit", "debit"].includes(req.body.direction)) errors.push("direction must be credit or debit.");
  if (!Number.isSafeInteger(req.body.amountMinor) || req.body.amountMinor <= 0) errors.push("amountMinor must be a positive safe integer in paise.");
  if (typeof req.body.reason !== "string" || req.body.reason.trim().length < 5 || req.body.reason.trim().length > 300) errors.push("reason must be between 5 and 300 characters.");
  if (errors.length) return fail(next, errors);
  req.adjustment = { ...req.body, reason: req.body.reason.trim() };
  return next();
}

module.exports = { validateIdempotencyKey, validateWalletQuery, validateTopUp, validateTransactionList, validateAdminTransactionList, validateAdjustment };
