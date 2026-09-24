const Address = require("../models/Address");
const Payment = require("../models/Payment");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getOrCreateCart, enrichCart } = require("../services/cartService");
const orderService = require("../services/orderService");
const paymentService = require("../services/paymentService");
const emailService = require("../services/emailService");
const { round2 } = require("../services/orderService");

const computeCartSignature = (cart) =>
  cart.items
    .map((i) => `${String(i.product)}:${Number(i.quantity)}`)
    .sort()
    .join("|");

const applyNonPurchaseRejection = async (payment, message) => {
  if (payment && payment.status === "CREATED") {
    payment.status = "FAILED";
    await payment.save();
  }
  throw new ApiError(400, message);
};

const assertPurchasableCart = async (userId) => {
  const cart = await getOrCreateCart(userId);
  if (!cart.items || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty. Add items before checkout.");
  }

  const view = await enrichCart(cart);

  for (const item of view.items) {
    if (!item.availability) {
      throw new ApiError(
        400,
        `"${item.name}" cannot be purchased because ${item.unavailableReason}. Please remove it from your cart.`
      );
    }
    if (item.quantity > item.stock) {
      throw new ApiError(
        400,
        `Insufficient stock for "${item.name}". Available: ${item.stock}, requested: ${item.quantity}`
      );
    }
  }

  return { cart, view };
};

// POST /api/payment/create-order
// Issues a real Razorpay order for the CURRENT cart. The amount is computed
// on the server from the database; whatever the client sends is ignored.
const createPaymentOrder = asyncHandler(async (req, res) => {
  const { addressId } = req.body;

  const { cart, view } = await assertPurchasableCart(req.user._id);

  const address = await Address.findOne({ _id: addressId, user: req.user._id });
  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  const amountPaise = Math.round(Number(view.totals.total || 0) * 100);
  if (amountPaise <= 0) {
    throw new ApiError(400, "Checkout amount must be greater than zero");
  }

  const checkoutId = orderService.buildCheckoutId();

  let rzpOrder;
  try {
    rzpOrder = await paymentService.createRazorpayOrder({
      amountPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      notes: { userId: String(req.user._id), checkoutId },
    });
  } catch (err) {
    const status = err.statusCode || 502;
    throw new ApiError(
      status,
      `Razorpay order creation failed: ${err.message || "Unknown gateway error"}`
    );
  }

  const payment = await Payment.create({
    user: req.user._id,
    razorpayOrderId: rzpOrder.id,
    checkoutId,
    addressId,
    amount: round2(view.totals.total),
    amountPaise,
    currency: "INR",
    cartSignature: computeCartSignature(cart),
    status: "CREATED",
  });

  // Only the public key may ever reach the client.
  sendResponse(res, 201, "Payment order created", {
    razorpayOrderId: rzpOrder.id,
    amount: payment.amount,
    amountPaise,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    checkoutId,
    payment: { _id: payment._id, status: payment.status },
  });
});

// POST /api/payment/verify
// Server-side verification of a Razorpay callback. No order is created until
// every check passes: ownership, cart revalidation, amount equality (against
// the server-stored quote and the gateway), and the HMAC signature.
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const payment = await Payment.findOne({ razorpayOrderId, user: req.user._id });
  if (!payment) {
    throw new ApiError(400, "Payment order not found for this account");
  }

  // Idempotency: a repeated verified callback must not create another order.
  const existing = await orderService
    .getCheckoutOrders({ checkoutId: payment.checkoutId }, { user: req.user._id });
  if (existing.length > 0) {
    return sendResponse(res, 200, "Payment already verified and order confirmed", {
      duplicate: true,
      order: orderService.buildPurchaseView(existing),
      orders: existing,
      purchase: orderService.buildPurchaseView(existing),
    });
  }

  // 1) The cart must still be purchasable and identical to what was quoted.
  const { cart, view } = await assertPurchasableCart(req.user._id);

  if (computeCartSignature(cart) !== payment.cartSignature) {
    return applyNonPurchaseRejection(
      payment,
      "Your cart changed after the payment was initiated. Nothing was ordered and your cart is unchanged. Please start checkout again."
    );
  }

  const currentAmountPaise = Math.round(Number(view.totals.total || 0) * 100);
  if (currentAmountPaise !== payment.amountPaise) {
    return applyNonPurchaseRejection(
      payment,
      "The checkout amount changed after the payment was initiated (possible price manipulation). Nothing was ordered and your cart is unchanged. Please start checkout again."
    );
  }

  // 2) The delivery address must still belong to this user.
  const address = await Address.findOne({ _id: payment.addressId, user: req.user._id });
  if (!address) {
    return applyNonPurchaseRejection(
      payment,
      "The delivery address for this payment no longer exists. Nothing was ordered and your cart is unchanged. Please start checkout again."
    );
  }

  // 3) Cryptographic signature verification (secret never leaves the server).
  try {
    paymentService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
  } catch (err) {
    return applyNonPurchaseRejection(
      payment,
      err.message || "Payment verification failed. Nothing was ordered and your cart is unchanged."
    );
  }

  // 4) Confirm the settled gateway amount matches the server-computed quote.
  try {
    const fetched = await paymentService.fetchRazorpayPayment(razorpayPaymentId);
    if (!fetched || Number(fetched.amount) !== payment.amountPaise) {
      return applyNonPurchaseRejection(
        payment,
        "Payment amount does not match the verified checkout amount. Nothing was ordered and your cart is unchanged."
      );
    }
  } catch (err) {
    if (err.statusCode === 503) {
      throw new ApiError(503, "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    // Money-safe: if the gateway cannot confirm the payment, do NOT create an
    // order. The payment record stays CREATED so the customer can retry.
    throw new ApiError(
      400,
      "Unable to confirm your payment with Razorpay right now. Nothing was ordered and your cart is unchanged. Please try verifying again."
    );
  }

  // 5) Finalize: per-seller order records + atomic stock decrement + cart clear.
  let result;
  try {
    result = await orderService.finalizeCartCheckout({
      cart,
      address,
      paymentMethod: "RAZORPAY",
      paymentStatus: "PAID",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      checkoutId: payment.checkoutId,
    });
  } catch (err) {
    // A concurrent duplicate may have won the race and committed already.
    const raced = await orderService
      .getCheckoutOrders({ checkoutId: payment.checkoutId }, { user: req.user._id });
    if (raced.length > 0) {
      return sendResponse(res, 200, "Payment already verified and order confirmed", {
        duplicate: true,
        order: orderService.buildPurchaseView(raced),
        orders: raced,
        purchase: orderService.buildPurchaseView(raced),
      });
    }
    // Documented edge case: the payment was captured by the gateway but the
    // final order transaction failed (e.g. stock ran out between checkout and
    // confirmation). Nothing was ordered, stock was rolled back, cart intact.
    // The captured amount must be refunded manually (refund workflow).
    throw new ApiError(
      400,
      `Your payment was received but the order could not be confirmed because "${err.message}". Your cart is unchanged and you have NOT been charged double. Please contact support for a refund of this payment.`
    );
  }

  payment.status = "PAID";
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();

  emailService.sendOrderConfirmation(req.user.email, result.purchase.checkoutId, result.purchase.total);

  sendResponse(res, 201, "Payment verified and order confirmed", {
    order: result.purchase,
    orders: result.orders,
    purchase: result.purchase,
  });
});

module.exports = { createPaymentOrder, verifyPayment, computeCartSignature };