const Notification = require("../models/Notification");
const User = require("../models/User");

const adminOperationalTypes = ["admin_booking_created", "admin_booking_paid", "admin_booking_cancelled"];

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function safeNotification(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedBookingId: notification.relatedBookingId ? notification.relatedBookingId.toString() : null,
    relatedTransactionId: notification.relatedTransactionId ? notification.relatedTransactionId.toString() : null,
    readAt: notification.readAt ? new Date(notification.readAt).toISOString() : null,
    createdAt: new Date(notification.createdAt).toISOString(),
  };
}

async function createForUser({ userId, eventKey, type, title, message, relatedBookingId, relatedTransactionId, session }) {
  const recipientId = userId.toString();
  const eventRef = `${eventKey}:${recipientId}`;
  let existingQuery = Notification.findOne({ eventRef });
  if (session) existingQuery = existingQuery.session(session);
  const existing = await existingQuery;
  if (existing) return safeNotification(existing);

  const notification = new Notification({
    userId,
    type,
    title,
    message,
    relatedBookingId,
    relatedTransactionId,
    eventRef,
  });
  await notification.save(session ? { session } : undefined);
  return safeNotification(notification);
}

async function notifyAdmins({ eventKey, type, title, message, relatedBookingId, relatedTransactionId, session }) {
  let query = User.find({ role: "admin", status: "active" }).select("_id");
  if (session) query = query.session(session);
  const admins = await query.lean();
  const created = [];
  for (const admin of admins) {
    created.push(await createForUser({
      userId: admin._id,
      eventKey,
      type,
      title,
      message,
      relatedBookingId,
      relatedTransactionId,
      session,
    }));
  }
  return created;
}

async function getNotifications(userId, { status, scope, page, limit }) {
  const filter = { userId };
  if (status === "unread") filter.readAt = { $exists: false };
  if (status === "read") filter.readAt = { $exists: true };
  if (scope === "operations") filter.type = { $in: adminOperationalTypes };

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return {
    notifications: notifications.map(safeNotification),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getUnreadCount(userId) {
  return { unreadCount: await Notification.countDocuments({ userId, readAt: { $exists: false } }) };
}

async function getRecentAdminOperations(userId, limit = 5) {
  const items = await Notification.find({ userId, type: { $in: adminOperationalTypes } })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  return items.map(safeNotification);
}

async function markRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" }
  ).lean();
  if (notification) return safeNotification(notification);

  const existing = await Notification.findOne({ _id: notificationId, userId }).lean();
  if (!existing) throw createError("Notification not found.", 404);
  return safeNotification(existing);
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  return { markedRead: result.modifiedCount };
}

module.exports = {
  adminOperationalTypes,
  createForUser,
  notifyAdmins,
  getNotifications,
  getUnreadCount,
  getRecentAdminOperations,
  markRead,
  markAllRead,
};
