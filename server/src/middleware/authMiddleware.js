const mongoose = require("mongoose");
const User = require("../models/User");
const { verifyToken } = require("../utils/generateToken");

function authError() {
  const error = new Error("A valid bearer token is required.");
  error.status = 401;
  return error;
}

async function authenticate(req, res, next) {
  const authorization = req.get("authorization");
  const match = authorization && authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) return next(authError());

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch (error) {
    if (error.status >= 500) return next(error);
    return next(authError());
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    !Number.isInteger(payload.exp) ||
    !mongoose.isValidObjectId(payload.sub) ||
    !["user", "admin"].includes(payload.role)
  ) {
    return next(authError());
  }

  try {
    const user = await User.findById(payload.sub)
      .select("_id name email phone role status createdAt updatedAt")
      .lean();

    if (!user) return next(authError());
    if (user.status === "blocked") {
      const error = new Error("This account is blocked.");
      error.status = 403;
      return next(error);
    }
    if (payload.role !== user.role) return next(authError());

    req.user = user;
    req.auth = { userId: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
