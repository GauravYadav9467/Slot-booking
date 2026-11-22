const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { generateToken } = require("../utils/generateToken");

const BCRYPT_ROUNDS = 12;

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function removeIncompleteRegistration(userId) {
  const results = await Promise.allSettled([
    Wallet.deleteOne({ userId }),
    User.deleteOne({ _id: userId }),
  ]);
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Registration cleanup was incomplete.");
  }
}

async function register({ name, email, phone, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id").lean();
  if (existingUser) throw createError("An account with this email already exists.", 409);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = new User({
    name,
    email: normalizedEmail,
    phone,
    passwordHash,
    role: "user",
    status: "active",
  });

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      throw createError("An account with this email already exists.", 409);
    }
    throw error;
  }

  try {
    await Wallet.create({ userId: user._id });
  } catch (error) {
    try {
      await removeIncompleteRegistration(user._id);
    } catch (cleanupError) {
      const registrationError = createError(
        "Account setup could not be completed. Contact lounge staff before trying again.",
        500
      );
      registrationError.name = "RegistrationCleanupError";
      throw registrationError;
    }
    throw createError("Account setup could not be completed. Please try again.", 500);
  }

  return toSafeUser(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+passwordHash"
  );

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError("Email or password is incorrect.", 401);
  }
  if (user.status === "blocked") {
    throw createError("This account is blocked.", 403);
  }

  return {
    user: toSafeUser(user),
    token: generateToken(user),
  };
}

module.exports = { register, login, toSafeUser };
