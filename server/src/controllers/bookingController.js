const bookingService = require("../services/bookingService");
const walletService = require("../services/walletService");

async function checkAvailability(req, res) {
  const result = await bookingService.checkAvailability(req.bookingAvailability);
  res.status(200).json({ status: "success", data: result });
}

async function createBooking(req, res) {
  const booking = await bookingService.createBooking({
    ...req.bookingInput,
    userId: req.auth.userId,
  });
  res.status(201).json({ status: "success", data: { booking } });
}

async function getMyBookings(req, res) {
  const result = await bookingService.getMyBookings(req.auth.userId, req.bookingListQuery);
  res.status(200).json({ status: "success", data: result });
}

async function getBooking(req, res) {
  const booking = await bookingService.getBookingById(req.params.id, req.auth);
  res.status(200).json({ status: "success", data: { booking } });
}

async function cancelBooking(req, res) {
  const result = await bookingService.cancelBooking(
    req.params.id,
    req.auth,
    req.cancellationReason
  );
  res.status(200).json({ status: "success", data: result });
}

async function getAdminBookings(req, res) {
  const result = await bookingService.getAdminBookings(req.adminBookingQuery);
  res.status(200).json({ status: "success", data: result });
}

async function payBooking(req, res) {
  const result = await walletService.payBooking(req.params.id, req.auth.userId);
  res.status(200).json({ status: "success", data: result });
}

module.exports = {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAdminBookings,
  payBooking,
};
