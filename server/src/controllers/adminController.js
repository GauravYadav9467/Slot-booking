const adminService = require("../services/adminService");

async function getOverview(req, res) {
  const overview = await adminService.getOverview(req.auth.userId);
  res.status(200).json({ status: "success", data: { overview } });
}

async function listCustomers(req, res) {
  const result = await adminService.listCustomers(req.customerQuery);
  res.status(200).json({ status: "success", data: result });
}

async function getCustomerWallet(req, res) {
  const wallet = await adminService.getCustomerWallet(req.params.id);
  res.status(200).json({ status: "success", data: { wallet } });
}

module.exports = { getOverview, listCustomers, getCustomerWallet };
