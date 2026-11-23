const adminService = require("../services/adminService");

async function getOverview(req, res) {
  const overview = await adminService.getOverview(req.auth.userId);
  res.status(200).json({ status: "success", data: { overview } });
}

module.exports = { getOverview };
