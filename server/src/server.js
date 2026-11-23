require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const mongoose = require("mongoose");

const port = Number(process.env.PORT) || 5000;
let server;

async function start() {
  try {
    await connectDB();
    server = app.listen(port, () => {
      console.log(`NEXUS ARENA API listening on port ${port}`);
    });
  } catch {
    console.error("MongoDB connection failed; API startup aborted.");
    process.exitCode = 1;
  }
}

void start();

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down`);

  if (!server) {
    await mongoose.disconnect();
    process.exitCode = 0;
    return;
  }

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
