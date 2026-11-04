const express = require('express')
const router = express.Router()
const { authenticate, authorizeRoles, loadSeller, requireApprovedSeller } = require('../middleware')
const { getWallet, getTransactions, getEarnings } = require('../controllers/walletController')

router.use(authenticate, authorizeRoles('SELLER'), loadSeller, requireApprovedSeller)

router.get('/', getWallet)
router.get('/transactions', getTransactions)
router.get('/earnings', getEarnings)

module.exports = router
