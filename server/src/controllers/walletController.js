const walletService = require("../services/walletService");

async function getWallet(req, res) {
  const wallet = await walletService.getWallet(req.auth.userId);
  res.status(200).json({ status: "success", data: { wallet } });
}

async function getTransactions(req, res) {
  const result = await walletService.getTransactions(req.auth.userId, req.transactionQuery);
  res.status(200).json({ status: "success", data: result });
}

async function getAdminTransactions(req, res) {
  const result = await walletService.getAdminTransactions(req.adminTransactionQuery);
  res.status(200).json({ status: "success", data: result });
}

async function topUp(req, res) {
  const result = await walletService.topUp(req.auth.userId, req.topUpAmountMinor, req.idempotencyKey);
  res.status(result.idempotent ? 200 : 201).json({ status: "success", data: result });
}

async function adjustWallet(req, res) {
  const result = await walletService.adjustWallet(req.adjustment, req.idempotencyKey);
  res.status(result.idempotent ? 200 : 201).json({ status: "success", data: result });
}

module.exports = { getWallet, getTransactions, getAdminTransactions, topUp, adjustWallet };
