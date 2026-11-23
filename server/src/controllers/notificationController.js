const notificationService = require("../services/notificationService");

async function list(req, res) {
  const result = await notificationService.getNotifications(req.auth.userId, req.notificationQuery);
  res.status(200).json({ status: "success", data: result });
}

async function unreadCount(req, res) {
  const result = await notificationService.getUnreadCount(req.auth.userId);
  res.status(200).json({ status: "success", data: result });
}

async function markRead(req, res) {
  const notification = await notificationService.markRead(req.auth.userId, req.params.id);
  res.status(200).json({ status: "success", data: { notification } });
}

async function markAllRead(req, res) {
  const result = await notificationService.markAllRead(req.auth.userId);
  res.status(200).json({ status: "success", data: result });
}

module.exports = { list, unreadCount, markRead, markAllRead };
