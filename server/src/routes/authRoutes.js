const express = require("express");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authMiddleware");
const { validateRegistration, validateLogin } = require("../validators/authValidator");
const { rateLimit } = require("express-rate-limit");

const router = express.Router();

function authRateLimit() {
  const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
  const limit = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);
  if (!Number.isSafeInteger(windowMs) || windowMs < 1 || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Authentication rate limit configuration is invalid.");
  }
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { status: "error", message: "Too many authentication attempts. Please try again later." },
  });
}

router.post("/register", authRateLimit(), validateRegistration, authController.register);
router.post("/login", authRateLimit(), validateLogin, authController.login);
router.get("/me", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
