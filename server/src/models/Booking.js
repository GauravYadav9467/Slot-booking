const mongoose = require("mongoose");

const priceSnapshotSchema = new mongoose.Schema(
  {
    hourlyRateMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    subtotalMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
    discountMinor: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isSafeInteger,
    },
    totalMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isSafeInteger,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startAt || value > this.startAt;
        },
        message: "Booking end time must be later than its start time.",
      },
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator(value) {
          return Number.isInteger(value) && value > 0;
        },
        message: "Booking duration must be a positive whole number of minutes.",
      },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "not_required"],
      default: "unpaid",
    },
    priceSnapshot: {
      type: priceSnapshotSchema,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    refundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ stationId: 1, status: 1, startAt: 1, endAt: 1 });
bookingSchema.index({ userId: 1, startAt: -1 });
bookingSchema.index({ status: 1, startAt: -1 });

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
