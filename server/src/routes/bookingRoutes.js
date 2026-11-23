const express = require("express");
const bookingController = require("../controllers/bookingController");
const authenticate = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const {
  validateAvailability,
  validateAdminAvailability,
  validateWalkInBooking,
  validateCreateBooking,
  validateBookingId,
  validateMyBookings,
  validateAdminBookings,
  validateCancellation,
  validateBookingPayment,
} = require("../validators/bookingValidator");

const router = express.Router();

router.get("/availability", validateAvailability, bookingController.checkAvailability);
router.get("/admin/availability", authenticate, requireAdmin, validateAdminAvailability, bookingController.getAdminAvailability);
router.get("/my", authenticate, validateMyBookings, bookingController.getMyBookings);
router.get("/admin", authenticate, requireAdmin, validateAdminBookings, bookingController.getAdminBookings);
router.post("/", authenticate, validateCreateBooking, bookingController.createBooking);
router.post("/admin/walk-in", authenticate, requireAdmin, validateWalkInBooking, bookingController.createWalkInBooking);
router.post("/:id/pay", authenticate, validateBookingId, validateBookingPayment, bookingController.payBooking);
router.patch(
  "/:id/cancel",
  authenticate,
  validateBookingId,
  validateCancellation,
  bookingController.cancelBooking
);
router.get("/:id", authenticate, validateBookingId, bookingController.getBooking);

module.exports = router;
