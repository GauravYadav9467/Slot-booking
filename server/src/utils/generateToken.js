const jwt = require("jsonwebtoken");

function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret || Buffer.byteLength(secret) < 32 || !expiresIn) {
    const error = new Error("JWT authentication is not configured correctly.");
    error.status = 500;
    throw error;
  }

  return { secret, expiresIn };
}

function generateToken(user) {
  const { secret, expiresIn } = getJwtConfig();

  return jwt.sign(
    { role: user.role },
    secret,
    {
      algorithm: "HS256",
      subject: user._id.toString(),
      expiresIn,
    }
  );
}

function verifyToken(token) {
  const { secret } = getJwtConfig();
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
}

module.exports = { generateToken, verifyToken };
