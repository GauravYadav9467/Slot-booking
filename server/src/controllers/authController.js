const authService = require("../services/authService");

async function register(req, res) {
  const user = await authService.register(req.body);

  res.status(201).json({
    status: "success",
    data: { user },
  });
}

async function login(req, res) {
  const result = await authService.login(req.body);

  res.status(200).json({
    status: "success",
    data: result,
  });
}

function getProfile(req, res) {
  res.status(200).json({
    status: "success",
    data: { user: authService.toSafeUser(req.user) },
  });
}

function logout(req, res) {
  res.status(200).json({
    status: "success",
    message:
      "Discard this bearer token on the client. It remains valid until its configured expiry; server-side revocation is not enabled.",
  });
}

module.exports = { register, login, getProfile, logout };
