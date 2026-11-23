require("dotenv").config({ quiet: true });

const mongoose = require("mongoose");
const User = require("../src/models/User");
const Station = require("../src/models/Station");
const Booking = require("../src/models/Booking");
const Wallet = require("../src/models/Wallet");
const Transaction = require("../src/models/Transaction");
const Notification = require("../src/models/Notification");
const StationReservationLock = require("../src/models/StationReservationLock");

const models = [User, Station, Booking, Wallet, Transaction, Notification, StationReservationLock];

function sameKey(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI must be configured in server/.env.");
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  let missing = 0;
  for (const model of models) {
    const actual = await model.collection.indexes();
    const expected = model.schema.indexes();
    const absent = expected.filter(([key, options]) => !actual.some((index) =>
      sameKey(index.key, key) &&
      Boolean(index.unique) === Boolean(options.unique) &&
      Boolean(index.sparse) === Boolean(options.sparse)
    ));
    if (absent.length) {
      missing += absent.length;
      console.log(`${model.modelName}: ${absent.length} schema index(es) missing`);
    } else {
      console.log(`${model.modelName}: schema indexes verified (${expected.length})`);
    }
  }
  if (missing) {
    process.exitCode = 1;
    throw new Error(`${missing} declared index(es) are missing. No indexes were created or changed by this check.`);
  }
}

main()
  .catch((error) => {
    console.error(`Index verification failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
