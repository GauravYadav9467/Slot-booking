const mongoose = require("mongoose");

const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PC", "Console", "VR"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    installedGames: {
      type: [String],
      default: [],
    },
    hourlyRateMinor: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Hourly rate must be an integer amount in paise.",
      },
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive"],
      default: "active",
    },
    image: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Station || mongoose.model("Station", stationSchema);
