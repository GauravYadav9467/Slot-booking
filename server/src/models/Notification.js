const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "booking_confirmed",
        "payment_success",
        "booking_cancelled",
        "booking_refund",
        "wallet_top_up",
        "admin_booking_created",
        "admin_booking_paid",
        "admin_booking_cancelled",
      ],
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    relatedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    readAt: {
      type: Date,
    },
    eventRef: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ eventRef: 1 }, { unique: true, sparse: true });
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1, _id: -1 }, { name: "notification_read_state_by_user" });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
