const crypto = require("crypto");
const { getRazorpay, isConfigured } = require("../config/razorpay");
const ApiError = require("../utils/ApiError");

const isPaymentConfigured = () => isConfigured();

/**
 * Create a Razorpay order. `amountPaise` must be an integer in the smallest
 * currency unit (e.g. INR 100.50 -> 10050). The server computes this value
 * from authority product data; it is never accepted from the frontend.
 */
const createRazorpayOrder = async ({ amountPaise, currency = "INR", receipt, notes = {} }) => {
  const razorpay = getRazorpay();

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, "Payment amount must be a positive integer in the smallest currency unit");
  }

  return razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes,
  });
};

/**
 * Fetch a payment from Razorpay. Returns the raw payment object so the server
 * can compare the actually-settled amount with the expected paise amount.
 */
const fetchRazorpayPayment = async (razorpayPaymentId) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  const razorpay = getRazorpay();
  return razorpay.payments.fetch(razorpayPaymentId);
};

/**
 * Verify the Razorpay payment signature.
 * @param {Object} payload { orderId, paymentId, signature }
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, "orderId, paymentId and signature are required");
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  return true;
};

/**
 * Issue a real Razorpay refund for a captured payment.
 *
 * Only ever called AFTER the order is in a confirmed refundable state
 * (RETURNED / CANCELLED). `amountPaise` must be computed server-side from the
 * stored order snapshot — it is never accepted from a client. The returned
 * refund id is stored on the order item so duplicate requests reuse it and
 * never fire a second gateway refund.
 */
const createRazorpayRefund = async (razorpayPaymentId, amountPaise) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  if (!razorpayPaymentId) {
    throw new ApiError(400, "No Razorpay payment id is recorded for this order");
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, "Refund amount must be a positive integer in the smallest currency unit");
  }

  const razorpay = getRazorpay();
  const refund = await razorpay.payments.refund(razorpayPaymentId, { amount: amountPaise });
  return { refundId: refund && refund.id, status: (refund && refund.status) || "processed" };
};

module.exports = {
  isPaymentConfigured,
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
  createRazorpayRefund,
};