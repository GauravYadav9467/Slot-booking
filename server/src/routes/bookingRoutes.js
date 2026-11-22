const express = require("express");
const bookingController = require("../controllers/bookingController");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const {
  validateAvailability,
  validateCreateBooking,
  validateBookingId,
  validateMyBookings,
  validateAdminBookings,
  validateCancellation,
} = require("../validators/bookingValidator");

const router = express.Router();

router.get("/availability", validateAvailability, bookingController.checkAvailability);
router.get("/my", authenticate, validateMyBookings, bookingController.getMyBookings);
router.get("/admin", authenticate, requireAdmin, validateAdminBookings, bookingController.getAdminBookings);
router.post("/", authenticate, validateCreateBooking, bookingController.createBooking);
router.patch(
  "/:id/cancel",
  authenticate,
  validateBookingId,
  validateCancellation,
  bookingController.cancelBooking
);
router.get("/:id", authenticate, validateBookingId, bookingController.getBooking);

module.exports = router;
