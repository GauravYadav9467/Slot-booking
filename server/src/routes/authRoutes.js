const express = require("express");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authMiddleware");
const { validateRegistration, validateLogin } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validateRegistration, authController.register);
router.post("/login", validateLogin, authController.login);
router.get("/me", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
