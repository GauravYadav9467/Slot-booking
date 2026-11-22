const mongoose = require("mongoose");

async function connectDB() {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Configure it in the server environment.");
  }

  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected");
  return mongoose.connection;
}

module.exports = connectDB;
