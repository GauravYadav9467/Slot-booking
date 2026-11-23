const Booking = require("../models/Booking");
const Station = require("../models/Station");
const notificationService = require("./notificationService");
const bookingService = require("./bookingService");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed", "no_show"];

async function getOverview(adminUserId) {
  const now = new Date();
  const localParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const localDate = Object.fromEntries(localParts.map((part) => [part.type, part.value]));
  const localDayStart = new Date(`${localDate.year}-${localDate.month}-${localDate.day}T00:00:00+05:30`);
  const nextDayStart = new Date(localDayStart.getTime() + 24 * 60 * 60 * 1000);
  const [stationGroups, bookingGroups, todayBookings, upcomingBookings, recentBookings, recentNotifications] = await Promise.all([
    Station.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
    Booking.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]),
    Booking.countDocuments({ startAt: { $gte: localDayStart, $lt: nextDayStart } }),
    Booking.countDocuments({ status: { $in: ["pending", "confirmed"] }, startAt: { $gte: now } }),
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
    stations: { ...stationCounts, total: Object.values(stationCounts).reduce((sum, count) => sum + count, 0) },
    bookings: { ...bookingCounts, total: Object.values(bookingCounts).reduce((sum, count) => sum + count, 0), today: todayBookings, upcoming: upcomingBookings },
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

function listCustomers(query) {
  return bookingService.listCustomers(query);
}

function getCustomerWallet(userId) {
  return bookingService.getCustomerWallet(userId);
}

module.exports = { getOverview, listCustomers, getCustomerWallet };
