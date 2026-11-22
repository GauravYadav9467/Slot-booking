const validationError = require("../middleware/validate");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s().-]{7,20}$/;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateBody(req, res, next, allowedFields, checks) {
  if (!isPlainObject(req.body)) {
    return next(validationError(["A JSON object is required."]));
  }

  const errors = [];
  for (const field of Object.keys(req.body)) {
    if (!allowedFields.includes(field)) errors.push(`Unexpected field: ${field}.`);
  }

  const values = {};
  for (const [field, check] of Object.entries(checks)) {
    const result = check(req.body[field]);
    if (result.error) errors.push(result.error);
    else values[field] = result.value;
  }

  if (errors.length) return next(validationError(errors));
  req.body = values;
  return next();
}

function requiredString(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== "string") return { error: `${field} must be a string.` };
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    return { error: `${field} must be between ${min} and ${max} characters.` };
  }
  return { value: normalized };
}

function validateRegistration(req, res, next) {
  return validateBody(
    req,
    res,
    next,
    ["name", "email", "phone", "password"],
    {
      name(value) {
        return requiredString(value, "Name", { min: 2, max: 80 });
      },
      email(value) {
        const result = requiredString(value, "Email", { min: 3, max: 254 });
        if (result.error) return result;
        const normalized = result.value.toLowerCase();
        return emailPattern.test(normalized)
          ? { value: normalized }
          : { error: "Email must be a valid email address." };
      },
      phone(value) {
        const result = requiredString(value, "Phone", { min: 7, max: 20 });
        if (result.error) return result;
        const digitCount = (result.value.match(/[0-9]/g) || []).length;
        return phonePattern.test(result.value) && digitCount >= 7
          ? result
          : { error: "Phone must contain at least seven digits and use a valid phone format." };
      },
      password(value) {
        if (typeof value !== "string") return { error: "Password must be a string." };
        if (value.length < 8) return { error: "Password must be at least 8 characters." };
        if (Buffer.byteLength(value, "utf8") > 72) {
          return { error: "Password must not exceed 72 UTF-8 bytes." };
        }
        return { value };
      },
    }
  );
}

function validateLogin(req, res, next) {
  return validateBody(req, res, next, ["email", "password"], {
    email(value) {
      const result = requiredString(value, "Email", { min: 3, max: 254 });
      if (result.error) return result;
      const normalized = result.value.toLowerCase();
      return emailPattern.test(normalized)
        ? { value: normalized }
        : { error: "Email must be a valid email address." };
    },
    password(value) {
      if (typeof value !== "string" || value.length === 0) {
        return { error: "Password is required." };
      }
      if (Buffer.byteLength(value, "utf8") > 72) {
        return { error: "Password must not exceed 72 UTF-8 bytes." };
      }
      return { value };
    },
  });
}

module.exports = { validateRegistration, validateLogin };
