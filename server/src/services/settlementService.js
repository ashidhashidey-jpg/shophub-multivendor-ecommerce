const mongoose = require('mongoose')
const { PLATFORM_COMMISSION_RATE, SELLER_SETTLEMENT_DAYS } = require('../config/finance')
const { appendEntry } = require('./ledgerService')
const Wallet = require('../models/Wallet')
const LedgerEntry = require('../models/LedgerEntry')
const Order = require('../models/Order')

async function ensureWallet(sellerId, session) {
  const opts = session ? { session } : {}
  let wallet = await Wallet.findOne({ seller: sellerId }, null, opts)
  if (!wallet) {
    wallet = await Wallet.create([{ seller: sellerId }], opts)
    wallet = wallet[0]
  }
  return wallet
}

async function settleDeliveredItem(order, item, session) {
  if (!item || !item.seller || !item.subtotal) return
  if (item.status !== 'DELIVERED') return
  if (order.paymentStatus !== 'PAID') return
  if (item.settledAt) return

  await ensureWallet(item.seller, session)

  const rate = PLATFORM_COMMISSION_RATE
  const commission = Math.round((item.subtotal * rate) / 100)
  const payout = item.subtotal - commission
  if (item.commission !== commission || item.sellerPayout !== payout) {
    item.commission = commission
    item.sellerPayout = payout
  }

  const eligibleAt = new Date(Date.now() + SELLER_SETTLEMENT_DAYS * 24 * 60 * 60 * 1000)
  item.settlementEligibleAt = eligibleAt
  item.settledAt = new Date()

  // Record gross sale
  await appendEntry(
    {
      sellerId: item.seller,
      type: 'SALE_CREDIT',
      amount: item.subtotal,
      order: order._id,
      orderItem: item._id,
      description: `Sale: Order ${order._id} item ${item._id}`,
    },
    session
  )

  // Record commission
  if (commission > 0) {
    await appendEntry(
      {
        sellerId: item.seller,
        type: 'COMMISSION_DEBIT',
        amount: commission,
        order: order._id,
        orderItem: item._id,
        description: `Commission: Order ${order._id} item ${item._id}`,
      },
      session
    )
  }
  // Net payout is represented by the combination of SALE_CREDIT (gross) + COMMISSION_DEBIT
  // Do NOT create a separate SALE_CREDIT for net payout - it would double-count
}

async function releaseHeldFunds(order, item, session) {
  if (!item || !item.seller || !item.sellerPayout) return
  if (!item.settlementEligibleAt) return
  if (new Date() < item.settlementEligibleAt) return

  // Skip if item is not in DELIVERED status (returned, cancelled, refunded, etc.)
  const nonReleasableStatuses = ['RETURNED', 'CANCELLED', 'REFUNDED', 'RETURN_REQUESTED', 'REFUND_PENDING', 'REFUND_FAILED']
  if (nonReleasableStatuses.includes(item.status)) return

  // Skip if already released (idempotency check)
  if (item.releasedAt) return

  // Check if RELEASE ledger entry already exists (additional idempotency)
  const existingRelease = await LedgerEntry.findOne({
    seller: item.seller,
    type: 'RELEASE',
    orderItem: item._id,
  }).session(session)
  if (existingRelease) {
    // Mark as released on the item for future fast-path checks
    item.releasedAt = existingRelease.createdAt
    return
  }

  // Verify sufficient pending balance
  const wallet = await Wallet.findOne({ seller: item.seller }).session(session)
  if (!wallet || wallet.pendingBalance < item.sellerPayout) return

  await ensureWallet(item.seller, session)

  await appendEntry(
    {
      sellerId: item.seller,
      type: 'RELEASE',
      amount: item.sellerPayout,
      order: order._id,
      orderItem: item._id,
      description: `Settlement release: Order ${order._id} item ${item._id}`,
    },
    session
  )

  // Mark item as released
  item.releasedAt = new Date()
}

async function releaseEligibleFunds(session) {
  const now = new Date()

  // Find all orders with items that:
  // - Are DELIVERED
  // - Have settlementEligibleAt in the past
  // - Have not been released yet
  // - Have paymentStatus PAID
  // - Are not in non-releasable statuses
  const nonReleasableStatuses = ['RETURNED', 'CANCELLED', 'REFUNDED', 'RETURN_REQUESTED', 'REFUND_PENDING', 'REFUND_FAILED']

  const orders = await Order.find({
    paymentStatus: 'PAID',
    'items.status': 'DELIVERED',
    'items.settlementEligibleAt': { $ne: null, $lte: now },
    'items.releasedAt': null,
    'items.status': { $nin: nonReleasableStatuses },
  }).session(session)

  let releasedCount = 0
  let skippedCount = 0
  const errors = []

  for (const order of orders) {
    for (const item of order.items) {
      // Re-check eligibility for each item
      if (item.status !== 'DELIVERED') {
        skippedCount++
        continue
      }
      if (!item.settlementEligibleAt || item.settlementEligibleAt > now) {
        skippedCount++
        continue
      }
      if (item.releasedAt) {
        skippedCount++
        continue
      }
      if (nonReleasableStatuses.includes(item.status)) {
        skippedCount++
        continue
      }
      if (!item.sellerPayout || item.sellerPayout <= 0) {
        skippedCount++
        continue
      }

      try {
        await releaseHeldFunds(order, item, session)
        releasedCount++
      } catch (err) {
        errors.push({ orderId: order._id, itemId: item._id, error: err.message })
      }
    }
    // Save the order with updated releasedAt timestamps
    await order.save({ session })
  }

  return { releasedCount, skippedCount, errors }
}

async function reverseHeldFunds(order, item, session) {
  if (!item || !item.seller || !item.sellerPayout) return
  if (!item.settledAt) return

  await ensureWallet(item.seller, session)

  // Check if funds were already released (RELEASE entry exists for this orderItem)
  const releaseEntry = await LedgerEntry.findOne({
    seller: item.seller,
    type: 'RELEASE',
    orderItem: item._id,
  }).session(session)

  const fromPending = !releaseEntry

  // Reverse the gross sale (REFUND_DEBIT for subtotal)
  await appendEntry(
    {
      sellerId: item.seller,
      type: 'REFUND_DEBIT',
      amount: item.subtotal,
      order: order._id,
      orderItem: item._id,
      description: `Settlement reversal: Order ${order._id} item ${item._id}`,
      refundFromPending: fromPending,
    },
    session
  )

  // Reverse the commission (COMMISSION_CREDIT)
  if (item.commission > 0) {
    await appendEntry(
      {
        sellerId: item.seller,
        type: 'COMMISSION_CREDIT',
        amount: item.commission,
        order: order._id,
        orderItem: item._id,
        description: `Commission reversal: Order ${order._id} item ${item._id}`,
        refundFromPending: fromPending,
      },
      session
    )
  }

  item.settledAt = null
  item.settlementEligibleAt = null
  item.releasedAt = null
  item.sellerPayout = 0
  item.commission = 0
}

module.exports = {
  ensureWallet,
  settleDeliveredItem,
  releaseHeldFunds,
  releaseEligibleFunds,
  reverseHeldFunds
}