const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')
const Wallet = require('../models/Wallet')
const Seller = require('../models/Seller')
const LedgerEntry = require('../models/LedgerEntry')
const { appendEntry } = require('../services/ledgerService')
const { getPaginationOptions, buildPagination } = require('../utils/paginate')
const { sendResponse, createError } = require('../utils/response')

async function requestWithdrawal(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    const { amount, accountHolderName, accountNumberLast4, ifsc, bankName } = req.body
    if (!amount || amount <= 0) throw createError(422, 'Invalid amount')
    const wallet = await Wallet.findOne({ seller: seller._id }).session(session)
    if (!wallet) throw createError(422, 'Wallet not found')
    if (wallet.availableBalance < amount) throw createError(422, 'Insufficient available balance')
    await appendEntry(
      {
        sellerId: seller._id,
        type: 'WITHDRAWAL_HOLD',
        amount,
        description: 'Withdrawal requested - hold placed'
      },
      session
    )
    const withdrawal = await Withdrawal.create(
      [
        {
          seller: seller._id,
          amount,
          bankDetails: { accountHolderName, accountNumberLast4, ifsc, bankName }
        }
      ],
      { session }
    )
    await session.commitTransaction()
    sendResponse(res, 201, 'Withdrawal requested', { withdrawal: withdrawal[0] })
  } catch (err) {
    await session.abortTransaction()
    next(err)
  } finally {
    session.endSession()
  }
}

async function getWithdrawals(req, res, next) {
  try {
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    const { page, limit } = getPaginationOptions(req)
    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ seller: seller._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Withdrawal.countDocuments({ seller: seller._id })
    ])
    sendResponse(res, 200, 'Withdrawals fetched', {
      withdrawals,
      pagination: buildPagination(total, page, limit)
    })
  } catch (err) {
    next(err)
  }
}

async function getWithdrawal(req, res, next) {
  try {
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    const withdrawal = await Withdrawal.findOne({ _id: req.params.id, seller: seller._id })
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    sendResponse(res, 200, 'Withdrawal fetched', { withdrawal })
  } catch (err) {
    next(err)
  }
}

async function cancelWithdrawal(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    const seller = req.seller || (await Seller.findOne({ user: req.user._id }))
    const withdrawal = await Withdrawal.findOne({ _id: req.params.id, seller: seller._id }).session(session)
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    if (withdrawal.status !== 'REQUESTED') throw createError(422, 'Only REQUESTED withdrawals can be cancelled')
    await appendEntry(
      {
        sellerId: seller._id,
        type: 'WITHDRAWAL_REJECTED',
        amount: withdrawal.amount,
        withdrawal: withdrawal._id,
        description: 'Withdrawal cancelled by seller'
      },
      session
    )
    withdrawal.status = 'REJECTED'
    await withdrawal.save({ session })
    await session.commitTransaction()
    sendResponse(res, 200, 'Withdrawal cancelled', { withdrawal })
  } catch (err) {
    await session.abortTransaction()
    next(err)
  } finally {
    session.endSession()
  }
}

// Admin withdrawal management
async function adminGetWithdrawals(req, res, next) {
  try {
    const { page, limit, skip } = getPaginationOptions(req)
    const { status, sellerId } = req.query
    const filter = {}
    if (status) filter.status = status
    if (sellerId) filter.seller = sellerId

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .populate('seller', 'storeName user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Withdrawal.countDocuments(filter)
    ])
    sendResponse(res, 200, 'Withdrawals fetched', {
      withdrawals,
      pagination: buildPagination(total, page, limit)
    })
  } catch (err) {
    next(err)
  }
}

async function adminGetWithdrawal(req, res, next) {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('seller', 'storeName user')
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    sendResponse(res, 200, 'Withdrawal fetched', { withdrawal })
  } catch (err) {
    next(err)
  }
}

async function adminApproveWithdrawal(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    const withdrawal = await Withdrawal.findById(req.params.id).session(session)
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    if (withdrawal.status !== 'REQUESTED') throw createError(422, 'Only REQUESTED withdrawals can be approved')
    
    withdrawal.status = 'APPROVED'
    withdrawal.processedAt = new Date()
    withdrawal.processedBy = req.user._id
    if (withdrawal.adminNotes !== undefined) {
      withdrawal.adminNotes = req.body.adminNotes || ''
    }
    await withdrawal.save({ session })
    
    await session.commitTransaction()
    sendResponse(res, 200, 'Withdrawal approved', { withdrawal })
  } catch (err) {
    await session.abortTransaction()
    next(err)
  } finally {
    session.endSession()
  }
}

async function adminRejectWithdrawal(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    const withdrawal = await Withdrawal.findById(req.params.id).session(session)
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    if (withdrawal.status !== 'REQUESTED') throw createError(422, 'Only REQUESTED withdrawals can be rejected')
    
    const seller = await Seller.findById(withdrawal.seller)
    if (!seller) throw createError(404, 'Seller not found')
    
    await appendEntry(
      {
        sellerId: seller._id,
        type: 'WITHDRAWAL_REJECTED',
        amount: withdrawal.amount,
        withdrawal: withdrawal._id,
        description: `Withdrawal rejected by admin: ${req.body.reason || 'No reason provided'}`
      },
      session
    )
    
    withdrawal.status = 'REJECTED'
    withdrawal.processedAt = new Date()
    withdrawal.processedBy = req.user._id
    withdrawal.rejectedReason = req.body.reason || 'Rejected by admin'
    await withdrawal.save({ session })
    
    await session.commitTransaction()
    sendResponse(res, 200, 'Withdrawal rejected', { withdrawal })
  } catch (err) {
    await session.abortTransaction()
    next(err)
  } finally {
    session.endSession()
  }
}

async function adminPayWithdrawal(req, res, next) {
  const session = await mongoose.startSession()
  try {
    await session.startTransaction()
    const withdrawal = await Withdrawal.findById(req.params.id).session(session)
    if (!withdrawal) throw createError(404, 'Withdrawal not found')
    if (withdrawal.status !== 'APPROVED') throw createError(422, 'Only APPROVED withdrawals can be marked as paid')
    
    const seller = await Seller.findById(withdrawal.seller)
    if (!seller) throw createError(404, 'Seller not found')
    
    // Verify seller has sufficient pending balance
    const wallet = await Wallet.findOne({ seller: seller._id }).session(session)
    if (!wallet || wallet.pendingBalance < withdrawal.amount) {
      throw createError(422, 'Insufficient pending balance for payout')
    }
    
    // Record payout - move from pending to totalWithdrawn
    await appendEntry(
      {
        sellerId: seller._id,
        type: 'WITHDRAWAL_PAID',
        amount: withdrawal.amount,
        withdrawal: withdrawal._id,
        description: `Withdrawal paid: ${withdrawal._id} (ref: ${req.body.payoutReference || 'manual'})`
      },
      session
    )
    
    withdrawal.status = 'PAID'
    withdrawal.processedAt = new Date()
    withdrawal.processedBy = req.user._id
    if (withdrawal.adminNotes !== undefined) {
      withdrawal.adminNotes = (withdrawal.adminNotes || '') + `\n[PAID] ${req.body.payoutReference || 'manual'} - ${new Date().toISOString()}`
    }
    await withdrawal.save({ session })
    
    await session.commitTransaction()
    sendResponse(res, 200, 'Withdrawal marked as paid', { withdrawal })
  } catch (err) {
    await session.abortTransaction()
    next(err)
  } finally {
    session.endSession()
  }
}

module.exports = {
  requestWithdrawal,
  getWithdrawals,
  getWithdrawal,
  cancelWithdrawal,
  adminGetWithdrawals,
  adminGetWithdrawal,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminPayWithdrawal
}
