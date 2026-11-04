const mongoose = require('mongoose')
const Wallet = require('../models/Wallet')
const LedgerEntry = require('../models/LedgerEntry')
const Seller = require('../models/Seller')
const { getPaginationOptions, buildPagination } = require('../utils/paginate')
const { sendResponse, createError } = require('../utils/response')

async function getWallet(req, res, next) {
  try {
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    let wallet = await Wallet.findOne({ seller: seller._id })
    if (!wallet) wallet = await Wallet.create({ seller: seller._id })
    sendResponse(res, 200, 'Wallet fetched', {
      wallet: {
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn
      }
    })
  } catch (err) {
    next(err)
  }
}

async function getTransactions(req, res, next) {
  try {
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    const { page, limit } = getPaginationOptions(req)
    const [transactions, total] = await Promise.all([
      LedgerEntry.find({ seller: seller._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LedgerEntry.countDocuments({ seller: seller._id })
    ])
    sendResponse(res, 200, 'Transactions fetched', {
      transactions,
      pagination: buildPagination(total, page, limit)
    })
  } catch (err) {
    next(err)
  }
}

async function getEarnings(req, res, next) {
  try {
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    let wallet = await Wallet.findOne({ seller: seller._id })
    if (!wallet) wallet = await Wallet.create({ seller: seller._id })
    sendResponse(res, 200, 'Earnings fetched', {
      earnings: {
        totalEarnings: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getWallet,
  getTransactions,
  getEarnings
}
