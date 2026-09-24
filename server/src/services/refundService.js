const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");
const paymentService = require("./paymentService");

// Refundable item states. "RETURNED" follows a completed return; "CANCELLED"
// follows a customer cancellation of an eligible (pre-shipment) paid order.
const REFUNDABLE_ITEM_STATUSES = ["RETURNED", "CANCELLED"];

// Amount is computed from the HISTORICAL stored order snapshot (item.subtotal =
// price x quantity at purchase time). Never from the current product price and
// never from the client. Express in the smallest currency unit (paise).
const computeRefundAmountPaise = (item) => Math.round(Number(item.subtotal || 0) * 100);

/**
 * Refund one item. Never marks the order refunded unless the gateway
 * acknowledges a real refund (or the order is COD, which requires no gateway).
 *
 * State machine:
 *   RETURNED / CANCELLED --claim--> REFUND_PENDING --success--> REFUNDED
 *                                        |--failure--> <revert, REFUND_FAILED>
 *
 * The claim is an atomic `updateOne` guarded on the item's current status, so
 * two concurrent refund requests cannot both reach the gateway.
 */
const refundOneItem = async (order, item) => {
  const idx = order.items.findIndex((i) => String(i.product) === String(item.product));
  if (idx === -1) throw new ApiError(404, "Order item not found");

  const baseStatus = order.items[idx].status;
  if (baseStatus === "REFUNDED" || baseStatus === "REFUND_PENDING") {
    return {
      productId: String(item.product),
      status: baseStatus === "REFUNDED" ? "already-refunded" : "in-progress",
    };
  }
  if (!REFUNDABLE_ITEM_STATUSES.includes(baseStatus)) {
    throw new ApiError(400, "Only RETURNED or CANCELLED items can be refunded");
  }

  const amountPaise = computeRefundAmountPaise(order.items[idx]);

  // COD settlement involves no gateway: mark the item refunded administratively.
  if (order.paymentMethod === "COD") {
    order.items[idx].status = "REFUNDED";
    order.items[idx].refundedAt = new Date();
    order.items[idx].refundId = "cod";
    order.paymentStatus = "REFUNDED";
    order.markModified("items");
    await order.save();
    return {
      productId: String(item.product),
      status: "refunded",
      amount: amountPaise / 100,
      skipped: true,
      reason: "COD — no gateway refund",
    };
  }

  // Razorpay unconfigured: never fake a refund. Order stays non-refunded.
  if (!paymentService.isPaymentConfigured()) {
    throw new ApiError(
      503,
      "Refund could not be processed because Razorpay is not configured. The order has NOT been marked refunded."
    );
  }

  // Atomic claim: only one request can move RETURNED/CANCELLED -> REFUND_PENDING.
  const claimed = await Order.updateOne(
    {
      _id: order._id,
      "items.product": order.items[idx].product,
      "items.status": { $in: REFUNDABLE_ITEM_STATUSES },
    },
    { $set: { "items.$.status": "REFUND_PENDING", paymentStatus: "REFUND_PENDING" } }
  );
  if (claimed.modifiedCount === 0) {
    const fresh = await Order.findById(order._id);
    if (!fresh) throw new ApiError(404, "Order not found");
    const freshItem = fresh.items.find((i) => String(i.product) === String(item.product));
    if (freshItem && freshItem.status === "REFUNDED") {
      return { productId: String(item.product), status: "already-refunded", refundId: freshItem.refundId };
    }
    throw new ApiError(
      409,
      freshItem && freshItem.status === "REFUND_PENDING"
        ? "Refund is already in progress for this item."
        : "This item is no longer refundable."
    );
  }
  order.items[idx].status = "REFUND_PENDING";
  order.paymentStatus = "REFUND_PENDING";
  order.markModified("items");

  let refund;
  try {
    refund = await paymentService.createRazorpayRefund(order.razorpayPaymentId, amountPaise);
  } catch (error) {
    // Money-safe: revert the claim and persist REFUND_FAILED. The item is
    // intentionally NOT marked refunded, and a retry is allowed later.
    order.items[idx].status = baseStatus;
    order.paymentStatus = "REFUND_FAILED";
    order.markModified("items");
    await order.save();
    throw new ApiError(
      502,
      `Refund request failed${error && error.message ? `: ${error.message}` : ""}. The item was NOT marked refunded.`
    );
  }

  order.items[idx].status = "REFUNDED";
  order.items[idx].refundedAt = new Date();
  order.items[idx].refundId = refund.refundId || "";
  order.paymentStatus = "REFUNDED";
  order.markModified("items");
  await order.save();

  return {
    productId: String(item.product),
    status: "refunded",
    refundId: refund.refundId || "",
    amount: amountPaise / 100,
  };
};

/**
 * Refund one specific item (productId) or every refundable item in an order
 * group. Across-seller safety: `order` is a single per-seller order record, so
 * only items in that seller group are ever touched.
 */
const refundOrderItems = async (order, { productId } = {}) => {
  let results = [];

  if (productId) {
    const item = order.items.find((i) => String(i.product) === String(productId));
    if (!item) throw new ApiError(404, "Order item not found");
    if (item.status === "REFUNDED") {
      return { order, results: [], duplicate: true, refundId: item.refundId };
    }
    if (item.status === "REFUND_PENDING") {
      throw new ApiError(409, "Refund is already in progress for this item.");
    }
    const result = await refundOneItem(order, item);
    return { order, results: [result] };
  }

  if (order.items.length === 0) throw new ApiError(400, "No refundable items found");

  let pending = 0;
  let already = 0;
  for (const it of order.items) {
    if (it.status === "REFUNDED") already += 1;
    else if (it.status === "REFUND_PENDING") pending += 1;
    else if (REFUNDABLE_ITEM_STATUSES.includes(it.status)) results = results.concat(await refundOneItem(order, it));
  }

  if (results.length === 0) {
    if (pending > 0) throw new ApiError(409, "Refund is already in progress for one or more items.");
    if (already > 0) return { order, results, duplicate: true, refundId: order.items[0].refundId };
    throw new ApiError(400, "No refundable items found");
  }

  return { order, results };
};

module.exports = { REFUNDABLE_ITEM_STATUSES, computeRefundAmountPaise, refundOneItem, refundOrderItems };