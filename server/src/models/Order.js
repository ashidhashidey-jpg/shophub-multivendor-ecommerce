const mongoose = require("mongoose");

const ORDER_ITEM_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUND_PENDING",
  "REFUNDED",
];

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ORDER_ITEM_STATUSES,
      default: "PENDING",
    },
    returnReason: {
      type: String,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundId: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      default: null,
      index: true,
    },
    checkoutId: {
      type: String,
      trim: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    address: {
      type: addressSnapshotSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["RAZORPAY", "COD"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
        "REFUND_FAILED",
        "PARTIALLY_REFUNDED",
      ],
      default: "PENDING",
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipping: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.index({ "items.product": 1 });
orderSchema.index({ createdAt: -1 });

// A given Razorpay payment can fund one checkout, which is split into one
// Order document PER SELLER. Several order rows therefore share the same
// razorpayPaymentId, so this is a plain (non-unique) index. Duplicate-payment
// protection lives on Payment.razorpayOrderId (unique) plus the idempotency
// check in verifyPayment.
orderSchema.index({ razorpayPaymentId: 1 });

orderSchema.virtual("orderStatus").get(function () {
  const statuses = this.items.map((i) => i.status);
  if (statuses.length === 0) return "PENDING";
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED";
  if (statuses.every((s) => s === "DELIVERED")) return "DELIVERED";
  if (statuses.every((s) => s === "REFUNDED")) return "REFUNDED";
  if (statuses.every((s) => s === "RETURNED")) return "RETURNED";
  if (statuses.includes("REFUND_PENDING")) return "REFUND_PENDING";
  if (statuses.includes("RETURN_REQUESTED")) return "RETURN_REQUESTED";
  if (statuses.includes("DELIVERED")) return "PARTIALLY_DELIVERED";
  if (statuses.includes("SHIPPED")) return "SHIPPED";
  if (statuses.includes("CANCELLED")) return "PARTIALLY_CANCELLED";
  return "PENDING";
});

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_ITEM_STATUSES = ORDER_ITEM_STATUSES;