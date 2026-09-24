const mongoose = require("mongoose");

const PAYMENT_STATUSES = ["CREATED", "PAID", "FAILED"];

/**
 * A payment attempt record created when a Razorpay order is issued.
 *
 * This is NOT an order. It exists so the server can later associate a
 * verification callback with (a) the authenticated customer, (b) the
 * server-computed amount in paise, and (c) the exact cart that was quoted,
 * without ever trusting the client for any of those values. Orders are only
 * created after verification succeeds.
 */
const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
    checkoutId: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    cartSignature: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "CREATED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;