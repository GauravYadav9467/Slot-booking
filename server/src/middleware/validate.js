function validationError(details) {
  const error = new Error("Request validation failed.");
  error.status = 400;
  error.details = details;
  return error;
}

module.exports = validationError;
