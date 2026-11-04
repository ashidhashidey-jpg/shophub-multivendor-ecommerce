const mongoose = require('mongoose')
const Wallet = require('../models/Wallet')
const LedgerEntry = require('../models/LedgerEntry')

async function ensureWallet(sellerId) {
  let wallet = await Wallet.findOne({ seller: sellerId })
  if (!wallet) {
    wallet = await Wallet.create({ seller: sellerId })
  }
  return wallet
}

async function appendEntry(sellerId, entry, session) {
  const wallet = await Wallet.findOne({ seller: sellerId }).session(session)
  if (!wallet) return null
  let balanceAfter = wallet.availableBalance + wallet.pendingBalance
  switch (entry.type) {
    case 'SALE_CREDIT':
    case 'WITHDRAWAL_REJECTED':
    case 'ADJUSTMENT':
      balanceAfter = (wallet.availableBalance + entry.amount) + wallet.pendingBalance
      break
    case 'COMMISSION_DEBIT':
    case 'REFUND_DEBIT':
    case 'WITHDRAWAL_HOLD':
      break
    case 'WITHDRAWAL_PAID':
      balanceAfter = (wallet.availableBalance) + (wallet.pendingBalance - entry.amount)
      break
    default:
      break
  }
  const ledger = await LedgerEntry.create([
    {
      seller: sellerId,
      type: entry.type,
      amount: entry.amount,
      balanceAfter,
      order: entry.order,
      orderItem: entry.orderItem,
      withdrawal: entry.withdrawal,
      description: entry.description,
    },
  ], session ? { session } : {})
  return ledger[0]
}

module.exports = {
  ensureWallet,
  appendEntry
}

