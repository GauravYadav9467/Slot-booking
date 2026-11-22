require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const mongoose = require("mongoose");

const port = Number(process.env.PORT) || 5000;
const server = app.listen(port, () => {
  console.log(`NEXUS ARENA API listening on port ${port}`);
});

connectDB().catch((error) => {
  console.error(`MongoDB connection failed: ${error.message}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  server.close(async () => {
    try {
      await mongoose.disconnect();
      process.exitCode = 0;
    } catch (error) {
      console.error("Error while closing MongoDB connection:", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
