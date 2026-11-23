function validateOverviewRequest(req, res, next) {
  if (Object.keys(req.query).length > 0) {
    const error = new Error("The admin overview does not accept query parameters.");
    error.status = 400;
    return next(error);
  }
  return next();
}

module.exports = { validateOverviewRequest };
