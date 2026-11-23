const Booking = require("../models/Booking");
const Station = require("../models/Station");
const notificationService = require("./notificationService");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];

async function getOverview(adminUserId) {
  const [stationGroups, bookingGroups, recentBookings, recentNotifications] = await Promise.all([
    Station.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
    Booking.find()
      .select("userId stationId startAt endAt status paymentStatus createdAt")
      .populate("userId", "name")
      .populate("stationId", "name code")
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .lean(),
    notificationService.getRecentAdminOperations(adminUserId, 5),
  ]);

  const stationCounts = Object.fromEntries(["active", "maintenance", "inactive"].map((status) => [status, 0]));
  for (const group of stationGroups) if (Object.hasOwn(stationCounts, group._id)) stationCounts[group._id] = group.total;
  const bookingCounts = Object.fromEntries(bookingStatuses.map((status) => [status, 0]));
  for (const group of bookingGroups) if (Object.hasOwn(bookingCounts, group._id)) bookingCounts[group._id] = group.total;

  return {
    stations: stationCounts,
    bookings: { ...bookingCounts, total: Object.values(bookingCounts).reduce((sum, count) => sum + count, 0) },
    recentBookings: recentBookings.map((booking) => ({
      id: booking._id.toString(),
      user: booking.userId?.name || "Customer",
      station: booking.stationId?.name || booking.stationId?.code || "Station",
      startAt: new Date(booking.startAt).toISOString(),
      status: booking.status,
      paymentStatus: booking.paymentStatus || "unpaid",
    })),
    recentNotifications,
  };
}

module.exports = { getOverview };
