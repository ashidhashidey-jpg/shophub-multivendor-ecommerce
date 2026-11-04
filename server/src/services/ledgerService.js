const mongoose = require('mongoose')
const Wallet = require('../models/Wallet')
const LedgerEntry = require('../models/LedgerEntry')

async function appendEntry({ sellerId, type, amount, order, orderItem, withdrawal, description, refundFromPending }, session) {
  const opts = session ? { session } : {}
  const wallet = await Wallet.findOne({ seller: sellerId }).session(session)
  if (!wallet) return null
  let available = wallet.availableBalance
  let pending = wallet.pendingBalance
  let totalEarned = wallet.totalEarned
  let totalWithdrawn = wallet.totalWithdrawn

  switch (type) {
    case 'SALE_CREDIT':
      // Gross sale amount - adds to pending and totalEarned
      pending += amount
      totalEarned += amount
      break
    case 'COMMISSION_DEBIT':
      // Commission deducted from pending (reduces pending balance)
      pending -= amount
      break
    case 'RELEASE':
      // Move from pending to available when settlement period elapses
      pending -= amount
      available += amount
      break
    case 'WITHDRAWAL_HOLD':
      // Hold funds for withdrawal request
      available -= amount
      pending += amount
      break
    case 'WITHDRAWAL_PAID':
      // Withdrawal completed - move from pending to withdrawn
      pending -= amount
      totalWithdrawn += amount
      break
    case 'WITHDRAWAL_REJECTED':
      // Withdrawal rejected - return hold to available
      pending -= amount
      available += amount
      break
    case 'REFUND_DEBIT':
      // Refund - deduct from appropriate balance
      // If refundFromPending is true, debit from pending (not yet released)
      // Otherwise debit from available (already released)
      if (refundFromPending) {
        pending -= amount
      } else {
        available -= amount
      }
      totalEarned -= amount
      break
    case 'COMMISSION_CREDIT':
      // Commission reversal - add back to appropriate balance
      if (refundFromPending) {
        pending += amount
      } else {
        available += amount
      }
      break
    case 'ADJUSTMENT':
      break
    default:
      break
  }

  await Wallet.findOneAndUpdate(
    { seller: sellerId },
    { availableBalance: available, pendingBalance: pending, totalEarned: totalEarned, totalWithdrawn: totalWithdrawn },
    { new: true, ...opts }
  )

  const balanceAfter = available + pending
  const entry = await LedgerEntry.create(
    [
      {
        seller: sellerId,
        type,
        amount,
        balanceAfter,
        order,
        orderItem,
        withdrawal,
        description
      }
    ],
    opts
  )
  return entry[0]
}

module.exports = {
  appendEntry
}
