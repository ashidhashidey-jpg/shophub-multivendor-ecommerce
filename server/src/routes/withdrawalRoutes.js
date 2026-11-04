const express = require('express')
const router = express.Router()
const { authenticate, authorizeRoles, loadSeller, requireApprovedSeller } = require('../middleware')
const {
  requestWithdrawal,
  getWithdrawals,
  getWithdrawal,
  cancelWithdrawal,
  adminGetWithdrawals,
  adminGetWithdrawal,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminPayWithdrawal
} = require('../controllers/withdrawalController')

// Seller routes
router.use(authenticate, authorizeRoles('SELLER'), loadSeller, requireApprovedSeller)

router.post('/', requestWithdrawal)
router.get('/', getWithdrawals)
router.get('/:id', getWithdrawal)
router.patch('/:id/cancel', cancelWithdrawal)

// Admin routes
router.use('/admin', authenticate, authorizeRoles('ADMIN'))
router.get('/admin', adminGetWithdrawals)
router.get('/admin/:id', adminGetWithdrawal)
router.patch('/admin/:id/approve', adminApproveWithdrawal)
router.patch('/admin/:id/reject', adminRejectWithdrawal)
router.patch('/admin/:id/pay', adminPayWithdrawal)

module.exports = router
