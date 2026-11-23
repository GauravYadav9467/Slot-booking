require("dotenv").config({ quiet: true });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Station = require("../src/models/Station");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");

const stations = [
  { name: "Nexus RTX Arena 01", code: "NA-PC-01", type: "PC", status: "active", hourlyRateMinor: 15000, description: "High-performance PC station tuned for competitive shooters and high-refresh play.", specifications: { cpu: "AMD Ryzen 7 7800X3D", gpu: "NVIDIA GeForce RTX 4070 Super", memory: "32 GB DDR5", display: "27-inch 240 Hz", peripherals: "Mechanical keyboard, lightweight mouse, gaming headset" }, installedGames: ["Valorant", "Counter-Strike 2", "Apex Legends", "Fortnite"] },
  { name: "Nexus RTX Arena 02", code: "NA-PC-02", type: "PC", status: "active", hourlyRateMinor: 15000, description: "High-performance PC station for ranked play and smooth 1440p gaming.", specifications: { cpu: "Intel Core i7-14700F", gpu: "NVIDIA GeForce RTX 4070", memory: "32 GB DDR5", display: "27-inch 180 Hz", peripherals: "Mechanical keyboard, gaming mouse, closed-back headset" }, installedGames: ["Valorant", "Counter-Strike 2", "Overwatch 2", "Apex Legends"] },
  { name: "Nexus PC Station 03", code: "NA-PC-03", type: "PC", status: "active", hourlyRateMinor: 10000, description: "Comfortable standard PC setup for multiplayer sessions and gaming with friends.", specifications: { cpu: "AMD Ryzen 5 7600", gpu: "NVIDIA GeForce RTX 4060", memory: "16 GB DDR5", display: "24-inch 165 Hz", peripherals: "Mechanical keyboard, gaming mouse, headset" }, installedGames: ["Valorant", "Rocket League", "Minecraft", "EA SPORTS FC"] },
  { name: "Nexus PC Station 04", code: "NA-PC-04", type: "PC", status: "active", hourlyRateMinor: 10000, description: "Balanced gaming PC for co-op, esports and casual play.", specifications: { cpu: "Intel Core i5-14400F", gpu: "NVIDIA GeForce RTX 4060", memory: "16 GB DDR5", display: "24-inch 165 Hz", peripherals: "Mechanical keyboard, gaming mouse, headset" }, installedGames: ["Valorant", "Counter-Strike 2", "Fall Guys", "Rocket League"] },
  { name: "Nexus PC Station 05", code: "NA-PC-05", type: "PC", status: "active", hourlyRateMinor: 9000, description: "A reliable everyday gaming station for quick sessions and party games.", specifications: { cpu: "AMD Ryzen 5 5600", gpu: "NVIDIA GeForce RTX 3060", memory: "16 GB DDR4", display: "24-inch 144 Hz", peripherals: "Gaming keyboard, mouse, headset" }, installedGames: ["Minecraft", "Rocket League", "EA SPORTS FC", "Fall Guys"] },
  { name: "Nexus PC Station 06", code: "NA-PC-06", type: "PC", status: "active", hourlyRateMinor: 9000, description: "Balanced PC station suited to casual multiplayer and esports practice.", specifications: { cpu: "Intel Core i5-12400F", gpu: "NVIDIA GeForce RTX 3060", memory: "16 GB DDR4", display: "24-inch 144 Hz", peripherals: "Gaming keyboard, mouse, headset" }, installedGames: ["Valorant", "Apex Legends", "Minecraft", "Rocket League"] },
  { name: "Nexus Racing Simulator", code: "NA-RACE-01", type: "PC", status: "active", hourlyRateMinor: 18000, description: "Dedicated racing rig with a force-feedback wheel and pedal set.", specifications: { cpu: "AMD Ryzen 7 7700", gpu: "NVIDIA GeForce RTX 4070", memory: "32 GB DDR5", display: "32-inch curved display", wheel: "Direct-drive force-feedback wheel", seat: "Adjustable racing bucket seat" }, installedGames: ["Forza Horizon 5", "Assetto Corsa Competizione", "F1 24"] },
  { name: "Nexus PC Station 08", code: "NA-PC-08", type: "PC", status: "active", hourlyRateMinor: 10000, description: "Team-ready station with a high-refresh display for competitive sessions.", specifications: { cpu: "AMD Ryzen 5 7600", gpu: "AMD Radeon RX 7700 XT", memory: "16 GB DDR5", display: "24-inch 180 Hz", peripherals: "Mechanical keyboard, gaming mouse, headset" }, installedGames: ["Valorant", "Counter-Strike 2", "Overwatch 2", "Apex Legends"] },
  { name: "Nexus PlayStation 5 Pod 01", code: "NA-PS5-01", type: "Console", status: "active", hourlyRateMinor: 12000, description: "Private console pod with a 4K display and two wireless controllers.", specifications: { console: "PlayStation 5", display: "55-inch 4K UHD", seating: "Two-player lounge seating", controllers: 2 }, installedGames: ["EA SPORTS FC", "Marvel's Spider-Man 2", "Gran Turismo 7", "Mortal Kombat 1"] },
  { name: "Nexus PlayStation 5 Pod 02", code: "NA-PS5-02", type: "Console", status: "active", hourlyRateMinor: 12000, description: "Console station for couch co-op, sports and local multiplayer.", specifications: { console: "PlayStation 5", display: "50-inch 4K UHD", seating: "Two-player lounge seating", controllers: 2 }, installedGames: ["EA SPORTS FC", "Gran Turismo 7", "It Takes Two", "Mortal Kombat 1"] },
  { name: "Nexus Xbox Series X Pod 01", code: "NA-XBX-01", type: "Console", status: "active", hourlyRateMinor: 11000, description: "4K console setup for racing, sports and shared game sessions.", specifications: { console: "Xbox Series X", display: "55-inch 4K UHD", seating: "Two-player lounge seating", controllers: 2 }, installedGames: ["Forza Horizon 5", "Halo Infinite", "EA SPORTS FC", "Mortal Kombat 1"] },
  { name: "Nexus Xbox Series X Pod 02", code: "NA-XBX-02", type: "Console", status: "maintenance", hourlyRateMinor: 11000, description: "Console pod temporarily unavailable for controller and display checks.", specifications: { console: "Xbox Series X", display: "50-inch 4K UHD", seating: "Two-player lounge seating", controllers: 2 }, installedGames: ["Forza Horizon 5", "Halo Infinite", "Rocket League"] },
  { name: "Nexus VR Bay 01", code: "NA-VR-01", type: "VR", status: "active", hourlyRateMinor: 20000, description: "Room-scale VR bay with supervised play space and standalone headset.", specifications: { headset: "Meta Quest 3", playArea: "2.5 m x 2.5 m", audio: "Integrated spatial audio", supervision: "Staff-assisted setup" }, installedGames: ["Beat Saber", "Superhot VR", "The Walking Dead: Saints & Sinners"] },
  { name: "Nexus VR Bay 02", code: "NA-VR-02", type: "VR", status: "maintenance", hourlyRateMinor: 20000, description: "VR bay held for headset servicing and play-area inspection.", specifications: { headset: "Meta Quest 3", playArea: "2.5 m x 2.5 m", audio: "Integrated spatial audio", supervision: "Staff-assisted setup" }, installedGames: ["Beat Saber", "Superhot VR", "Pistol Whip"] },
  { name: "Nexus PC Station 09", code: "NA-PC-09", type: "PC", status: "inactive", hourlyRateMinor: 8500, description: "Retained in the station catalogue but currently out of service.", specifications: { cpu: "Intel Core i5-12400F", gpu: "NVIDIA GeForce RTX 3060", memory: "16 GB DDR4", display: "24-inch 144 Hz" }, installedGames: ["Valorant", "Minecraft", "Rocket League"] },
  { name: "Nexus PlayStation 5 Pod 03", code: "NA-PS5-03", type: "Console", status: "inactive", hourlyRateMinor: 12000, description: "Retained in the station catalogue while the console pod is unavailable.", specifications: { console: "PlayStation 5", display: "55-inch 4K UHD", seating: "Two-player lounge seating", controllers: 2 }, installedGames: ["EA SPORTS FC", "Gran Turismo 7", "It Takes Two"] },
];

function localMongoTarget(uri) {
  let parsed;
  try { parsed = new URL(uri); } catch { throw new Error("MONGODB_URI is not a valid MongoDB connection URI."); }
  const host = parsed.hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("Demo seeding is restricted to a local MongoDB host.");
  }
  if (parsed.pathname.replace(/^\//, "") !== "nexus_arena") {
    throw new Error("Demo seeding requires the nexus_arena database.");
  }
}

function optionalAccount(prefix) {
  const values = ["NAME", "EMAIL", "PASSWORD"].map((key) => process.env[`${prefix}_${key}`] || "");
  if (values.every((value) => !value)) return null;
  if (values.some((value) => !value)) throw new Error(`${prefix} demo account configuration is incomplete.`);
  const [name, email, password] = values;
  if (name.trim().length < 2 || name.trim().length > 80) throw new Error(`${prefix} demo account name is invalid.`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error(`${prefix} demo account email is invalid.`);
  if (password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error(`${prefix} demo account password must be 12 to 72 UTF-8 bytes.`);
  }
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

async function seedAccount(account, role) {
  if (!account) return "not configured";
  const existing = await User.findOne({ email: account.email }).select("_id").lean();
  if (existing) return "already exists; left unchanged";

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [user] = await User.create([{
        name: account.name,
        email: account.email,
        passwordHash: await bcrypt.hash(account.password, 12),
        role,
        status: "active",
      }], { session });
      await Wallet.create([{ userId: user._id, currency: "INR", status: "active" }], { session });
    });
    return "created";
  } finally {
    await session.endSession();
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is disabled in production.");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI must be set in server/.env.");
  localMongoTarget(uri);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (hello.setName !== "rs0" || hello.isWritablePrimary !== true) {
    throw new Error("Demo seeding requires a writable primary in replica set rs0.");
  }
  await Promise.all([Station.init(), User.init(), Wallet.init()]);

  let createdStations = 0;
  for (const station of stations) {
    const result = await Station.updateOne(
      { code: station.code },
      { $setOnInsert: { ...station, currency: "INR" } },
      { upsert: true, runValidators: true }
    );
    if (result.upsertedCount === 1) createdStations += 1;
  }

  const adminResult = await seedAccount(optionalAccount("DEMO_ADMIN"), "admin");
  const userResult = await seedAccount(optionalAccount("DEMO_USER"), "user");
  console.log(`Demo station seed finished: ${createdStations} created, ${stations.length - createdStations} already present.`);
  console.log(`Optional demo admin account: ${adminResult}.`);
  console.log(`Optional demo user account: ${userResult}.`);
}

main()
  .catch((error) => {
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
