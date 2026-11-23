const express = require("express");
const walletController = require("../controllers/walletController");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const {
  validateIdempotencyKey,
  validateWalletQuery,
  validateTopUp,
  validateTransactionList,
  validateAdjustment,
} = require("../validators/walletValidator");

const router = express.Router();

router.use(authenticate);
router.get("/", validateWalletQuery, walletController.getWallet);
router.get("/transactions", validateTransactionList, walletController.getTransactions);
router.post("/top-up", validateIdempotencyKey, validateTopUp, walletController.topUp);
router.post("/admin/adjustments", requireAdmin, validateIdempotencyKey, validateAdjustment, walletController.adjustWallet);

module.exports = router;
