const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");
const { validateOverviewRequest } = require("../validators/adminValidator");

const router = express.Router();
router.get("/overview", authenticate, requireAdmin, validateOverviewRequest, adminController.getOverview);

module.exports = router;
