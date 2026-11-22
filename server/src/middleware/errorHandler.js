function errorHandler(error, req, res, next) {
  const status = Number.isInteger(error.status)
    ? error.status
    : Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;

  if (status >= 500) {
    console.error("Request failed:", error.name || "Error");
  }

  const response = {
    status: "error",
    message: status >= 500 ? "Internal server error" : error.message,
  };

  if (Array.isArray(error.details)) response.details = error.details;
  res.status(status).json(response);
}

module.exports = errorHandler;
