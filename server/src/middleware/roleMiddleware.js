function authorizeRoles(...allowedRoles) {
  return function roleAuthorization(req, res, next) {
    if (!req.auth) {
      const error = new Error("Authentication is required.");
      error.status = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.auth.role)) {
      const error = new Error("You do not have permission to access this resource.");
      error.status = 403;
      return next(error);
    }

    return next();
  };
}

module.exports = authorizeRoles;
module.exports.requireAdmin = authorizeRoles("admin");
