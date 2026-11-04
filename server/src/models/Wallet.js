const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', unique: true, required: true },
    availableBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Wallet', walletSchema)
