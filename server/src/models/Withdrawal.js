const mongoose = require('mongoose')

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, required: true },
    accountNumberLast4: { type: String, required: true },
    ifsc: { type: String, required: true },
    bankName: { type: String, required: true }
  },
  { _id: false }
)

const withdrawalSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', index: true, required: true },
    amount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'PAID', 'FAILED'],
      default: 'REQUESTED'
    },
    bankDetails: { type: bankDetailsSchema, required: true },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNotes: { type: String },
    rejectedReason: { type: String }
  },
  { timestamps: true }
)

module.exports = mongoose.model('Withdrawal', withdrawalSchema)
