const mongoose = require('mongoose')

const ledgerEntrySchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true, required: true },
    type: {
      type: String,
      enum: [
        'SALE_CREDIT',
        'COMMISSION_DEBIT',
        'COMMISSION_CREDIT',
        'WITHDRAWAL_HOLD',
        'WITHDRAWAL_PAID',
        'WITHDRAWAL_REJECTED',
        'REFUND_DEBIT',
        'ADJUSTMENT',
        'RELEASE'
      ],
      required: true
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    orderItem: { type: mongoose.Schema.Types.ObjectId },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
    description: { type: String }
  },
  { timestamps: true }
)

ledgerEntrySchema.index({ seller: 1, createdAt: -1 })

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema)
