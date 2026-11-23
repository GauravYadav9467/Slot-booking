const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const adminController = require("../controllers/adminController");
const { validateOverviewRequest, validateCustomerList, validateCustomerId } = require("../validators/adminValidator");

const router = express.Router();
router.get("/overview", authenticate, requireAdmin, validateOverviewRequest, adminController.getOverview);
router.get("/customers", authenticate, requireAdmin, validateCustomerList, adminController.listCustomers);
router.get("/customers/:id/wallet", authenticate, requireAdmin, validateCustomerId, adminController.getCustomerWallet);

module.exports = router;
