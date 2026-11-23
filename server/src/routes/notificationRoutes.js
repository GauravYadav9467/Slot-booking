const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const controller = require("../controllers/notificationController");
const { validateNotificationList, validateNotificationId, validateEmptyRequest } = require("../validators/notificationValidator");

const router = express.Router();
router.use(authenticate);
router.get("/unread-count", validateEmptyRequest, controller.unreadCount);
router.patch("/read-all", validateEmptyRequest, controller.markAllRead);
router.get("/", validateNotificationList, controller.list);
router.patch("/:id/read", validateNotificationId, validateEmptyRequest, controller.markRead);

module.exports = router;
