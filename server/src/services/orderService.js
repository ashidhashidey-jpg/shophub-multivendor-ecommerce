const crypto = require("crypto");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");

const SHIPPING_FEE = 0;
const ELIGIBLE_CANCEL_STATUSES = ["PENDING", "CONFIRMED"];

// Forward fulfillment lifecycle. "PLACED" maps to PENDING (existing convention).
const FULFILLMENT_FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

// Item states that can never move forward through fulfillment again.
const TERMINAL_OR_RETURN_STATES = [
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
  "REFUND_PENDING",
  "REFUNDED",
];

const round2 = (n) => Number(Number(n || 0).toFixed(2));

const buildCheckoutId = () => `chk_${crypto.randomBytes(12).toString("hex")}`;

/**
 * Replicate the Order model's orderStatus virtual at a purchase (checkout)
 * level, i.e. across every item of every seller-specific order record.
 */
const computeOrderStatus = (statuses) => {
  if (!statuses || statuses.length === 0) return "PENDING";
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
};

/**
 * Strict lifecycle transition matrix for fulfillment statuses. Only forward,
 * non-destructive transitions are allowed through this helper; cancellation,
 * returns and refunds MUST use their dedicated endpoints so side effects
 * (stock restore / gateway refund) are never bypassed.
 */
const assertOrderItemLifecycleTransition = (current, next) => {
  if (!FULFILLMENT_FLOW.includes(next)) {
    throw new ApiError(400, `Status must be one of: ${FULFILLMENT_FLOW.join(", ")}`);
  }
  if (TERMINAL_OR_RETURN_STATES.includes(current)) {
    throw new ApiError(400, "Invalid status transition");
  }
  const currentIndex = FULFILLMENT_FLOW.indexOf(current);
  const nextIndex = FULFILLMENT_FLOW.indexOf(next);
  if (currentIndex >= 0 && nextIndex < currentIndex) {
    throw new ApiError(400, "Invalid status transition");
  }
  return true;
};

const validateReturnReason = (reason) => {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new ApiError(400, "Return reason is required");
  }
  if (reason.trim().length > 2000) {
    throw new ApiError(400, "Return reason must be at most 2000 characters");
  }
};

const assertItemReturnEligible = (item) => {
  if (item.status === "DELIVERED") return;
  if (item.status === "RETURN_REQUESTED") {
    throw new ApiError(400, "A return request is already pending for this item");
  }
  throw new ApiError(400, "Only delivered items can be returned");
};

/**
 * Aggregate per-seller order paymentStatus into a purchase-level view.
 * A checkout may hold multiple seller group records (e.g. a partial refund of
 * one seller shows PARTIALLY_REFUNDED while the others stay PAID).
 */
const computePaymentStatus = (orders) => {
  const statuses = orders.map((o) => o.paymentStatus);
  if (statuses.length === 0) return "PENDING";
  if (statuses.every((s) => s === "REFUNDED")) return "REFUNDED";
  if (statuses.some((s) => s === "REFUND_FAILED")) return "REFUND_FAILED";
  if (statuses.some((s) => s === "REFUND_PENDING")) return "REFUND_PENDING";
  if (statuses.some((s) => s === "REFUNDED")) return "PARTIALLY_REFUNDED";
  if (statuses.every((s) => s === "PENDING")) return "PENDING";
  if (statuses.every((s) => s === "PAID")) return "PAID";
  if (statuses.some((s) => s === "FAILED")) return "FAILED";
  return "PENDING";
};

/**
 * Validate cart stock against the database.
 * Throws 400 with the offending product name if any quantity exceeds stock.
 */
const validateStock = (items, productDocs) => {
  for (const item of items) {
    const product = productDocs.find((p) => p._id.toString() === item.product.toString());
    if (!product) {
      throw new ApiError(400, `Product ${item.name} no longer exists`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
      );
    }
  }
};

/**
 * Build order payload from the cart. Prices are always taken from the
 * database, never from the frontend payload. Product status/activity and
 * seller approval are also re-validated at order time.
 */
const buildOrderPayload = async (cart, address) => {
  const productIds = cart.items.map((i) => i.product);
  const productDocs = await Product.find({ _id: { $in: productIds } }).populate("seller", "storeName status");

  if (productDocs.length !== productIds.length) {
    throw new ApiError(400, "One or more products in your cart no longer exist");
  }

  validateStock(cart.items, productDocs);

  const items = cart.items.map((item) => {
    const product = productDocs.find((p) => p._id.toString() === item.product.toString());
    const seller = product.seller;

    if (product.status !== "APPROVED") {
      throw new ApiError(400, `Product "${product.name}" is not approved for sale`);
    }
    if (product.isActive !== true) {
      throw new ApiError(400, `Product "${product.name}" is currently inactive`);
    }
    if (!seller || seller.status !== "APPROVED") {
      throw new ApiError(400, `Seller for "${product.name}" is not currently available`);
    }

    const listPrice = Number(product.price);
    const finalPrice = Number(product.finalPrice);

    return {
      product: product._id,
      seller: product.seller._id,
      name: product.name,
      image: product.images && product.images.length ? product.images[0] : "",
      price: finalPrice,
      originalPrice: listPrice,
      quantity: item.quantity,
      subtotal: round2(finalPrice * item.quantity),
      status: "PENDING",
    };
  });

  // Purchase-wide money: subtotal is list-based, discount is the delta, and
  // total is what the customer actually pays (subtotal - discount + shipping).
  const subtotal = round2(items.reduce((sum, i) => sum + i.originalPrice * i.quantity, 0));
  const discount = round2(items.reduce((sum, i) => sum + (i.originalPrice - i.price) * i.quantity, 0));
  const shipping = SHIPPING_FEE;
  const total = round2(subtotal - discount + shipping);

  const addressSnapshot = {
    name: address.name,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || "",
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country || "India",
  };

  return { items, subtotal, discount, shipping, total, addressSnapshot };
};

const decrementStock = async (items, session = null) => {
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      session ? { session } : {}
    );
    if (result.modifiedCount === 0) {
      throw new ApiError(
        400,
        `Insufficient stock for "${item.name}". Product is out of stock or its stock has changed.`
      );
    }
  }
};

const restoreStock = async (items, session = null) => {
  if (!items || items.length === 0) return;
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      session ? { session } : {}
    );
    if (result.modifiedCount === 0) {
      throw new ApiError(500, "Failed to restore stock for a product");
    }
  }
};

const groupItemsBySeller = (items) => {
  const groups = new Map();
  for (const item of items) {
    const key = String(item.seller);
    if (!groups.has(key)) {
      groups.set(key, { seller: item.seller, items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 });
    }
    const group = groups.get(key);
    group.items.push(item);
    group.originalPriceTotal = round2(
      (group.originalPriceTotal || 0) + item.originalPrice * item.quantity
    );
    group.subtotal = round2(group.subtotal + item.originalPrice * item.quantity);
    group.discount = round2(group.discount + (item.originalPrice - item.price) * item.quantity);
    group.shipping = SHIPPING_FEE;
    group.total = round2(group.subtotal - group.discount + group.shipping);
  }
  return [...groups.values()];
};

/**
 * Combine seller-specific order records into a single "purchase" view for the
 * customer/admin. Total is the sum of every seller group, which equals the
 * amount the customer paid.
 */
const buildPurchaseView = (orders) => {
  const first = orders[0];
  const allItems = orders.flatMap((o) => o.items);
  const subtotal = round2(orders.reduce((s, o) => s + o.subtotal, 0));
  const discount = round2(orders.reduce((s, o) => s + o.discount, 0));
  const shipping = round2(orders.reduce((s, o) => s + o.shipping, 0));
  const total = round2(orders.reduce((s, o) => s + o.total, 0));

  return {
    _id: first._id,
    checkoutId: first.checkoutId,
    user: first.user,
    items: allItems,
    groups: orders.map((o) => ({
      seller: o.seller,
      items: o.items,
      subtotal: o.subtotal,
      discount: o.discount,
      shipping: o.shipping,
      total: o.total,
      paymentStatus: o.paymentStatus,
    })),
    address: first.address,
    paymentMethod: first.paymentMethod,
    paymentStatus: computePaymentStatus(orders),
    razorpayOrderId: first.razorpayOrderId,
    razorpayPaymentId: first.razorpayPaymentId,
    subtotal,
    discount,
    shipping,
    total,
    orderStatus: computeOrderStatus(allItems.map((i) => i.status)),
    itemCount: allItems.length,
    totalQuantity: round2(allItems.reduce((s, i) => s + i.quantity, 0)),
    sellerCount: orders.length,
    orderIds: orders.map((o) => o._id),
    createdAt: first.createdAt,
  };
};

/**
 * Finalize a checkout inside one MongoDB transaction.
 *
 * One checkout/payment may contain items from several sellers. The final
 * purchase is written as one Order record PER SELLER (each with its own
 * subtotal/discount/total and the shared `checkoutId`), stock is decremented
 * atomically with an optimistic `stock >= qty` guard, and the user's cart is
 * cleared only after everything above succeeded.
 *
 * Callers must only invoke this after a payment has been verified (or for COD,
 * after the COD acceptance decision). It MUST NOT be used to report payment
 * success the frontend claims.
 */
const finalizeCartCheckout = async ({
  cart,
  address,
  paymentMethod,
  paymentStatus,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  checkoutId,
}) => {
  const payload = await buildOrderPayload(cart, address);
  const groups = groupItemsBySeller(payload.items);

  const session = await Order.startSession();
  try {
    session.startTransaction();

    for (const group of groups) {
      await decrementStock(group.items, session);
    }

    const docs = groups.map((group) => ({
      user: cart.user,
      seller: group.seller,
      checkoutId,
      items: group.items,
      address: payload.addressSnapshot,
      paymentMethod,
      paymentStatus,
      razorpayOrderId: razorpayOrderId || undefined,
      razorpayPaymentId: razorpayPaymentId || undefined,
      razorpaySignature: razorpaySignature || undefined,
      subtotal: group.subtotal,
      discount: group.discount,
      shipping: group.shipping,
      total: group.total,
    }));

    const orders = await Order.create(docs, { session, ordered: true });

    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();

    return { orders, purchase: buildPurchaseView(orders) };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel a whole checkout (all seller-specific records sharing checkoutId).
 * Restores stock exactly once per item. Every item must still be cancellable.
 */
const cancelCheckoutOrders = async (orders) => {
  const allItems = orders.flatMap((o) => o.items);
  for (const item of allItems) {
    if (!ELIGIBLE_CANCEL_STATUSES.includes(item.status)) {
      throw new ApiError(
        400,
        "Order cannot be cancelled. One or more items have already been shipped or progressed further."
      );
    }
  }

  const session = await Order.startSession();
  try {
    session.startTransaction();

    for (const order of orders) {
      for (const item of order.items) {
        item.status = "CANCELLED";
        item.cancelledAt = new Date();
      }
      await order.save({ session });
      await restoreStock(order.items, session);
    }

    await session.commitTransaction();
    return orders;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Accept a seller's return approval: mark item RETURNED and restore stock
 * exactly once. The item MUST be in RETURN_REQUESTED; RETURNED is terminal
 * for stock.
 */
const approveReturn = async (order, item) => {
  if (item.status !== "RETURN_REQUESTED") {
    throw new ApiError(400, "Return was not requested for this item");
  }

  const session = await Order.startSession();
  try {
    session.startTransaction();

    item.status = "RETURNED";
    item.returnedAt = new Date();
    await order.save({ session });

    await restoreStock([item], session);

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Reject a pending return: the item goes back to DELIVERED and the reason is
 * cleared. Stock must NOT be restored (it was never restored for the request).
 */
const rejectReturn = async (order, item) => {
  if (item.status !== "RETURN_REQUESTED") {
    throw new ApiError(400, "Return was not requested for this item");
  }

  item.status = "DELIVERED";
  item.returnReason = "";
  await order.save();
  return order;
};

/**
 * Submit a customer return request for a single delivered item.
 * Validates the reason and the eligibility of the item before mutating.
 */
const requestItemReturn = async (order, item, reason) => {
  validateReturnReason(reason);
  assertItemReturnEligible(item);

  item.status = "RETURN_REQUESTED";
  item.returnReason = reason.trim();
  await order.save();
  return order;
};

/**
 * Scope a seller's view of order records. Only the seller's own items are
 * exposed; `otherSellerItemsCount` reflects items from other sellers that were
 * part of the same checkout/purchase so the UI can render the group.
 */
const scopeOrdersForSeller = async (orders, sellerId) => {
  const sellerKey = String(sellerId);

  const scoped = orders.map((order) => {
    const ownItems = order.items.filter((i) => String(i.seller) === sellerKey);
    const ownSubtotal = round2(ownItems.reduce((s, i) => s + i.subtotal, 0));
    const plain = order.toJSON ? order.toJSON() : order;
    return {
      ...plain,
      items: ownItems,
      sellerSubtotal: ownSubtotal,
      orderStatus: order.orderStatus,
    };
  });

  const checkoutIds = [...new Set(scoped.map((o) => o.checkoutId).filter(Boolean))];
  if (checkoutIds.length === 0) {
    return scoped.map((o) => ({ ...o, otherSellerItemsCount: 0 }));
  }

  const ownIds = new Set(scoped.map((o) => String(o._id)));
  const siblings = await Order.find({
    checkoutId: { $in: checkoutIds },
    _id: { $nin: [...ownIds] },
  });

  const counts = {};
  for (const s of siblings) {
    for (const item of s.items) {
      if (String(item.seller) !== sellerKey) {
        counts[s.checkoutId] = (counts[s.checkoutId] || 0) + 1;
      }
    }
  }

  return scoped.map((o) => ({ ...o, otherSellerItemsCount: counts[o.checkoutId] || 0 }));
};

/** Fetch the sibling order records of a checkout (same user, same checkoutId). */
const getCheckoutOrders = async (order, userFilter = {}) => {
  const filter = { ...userFilter };
  if (order.checkoutId) {
    filter.checkoutId = order.checkoutId;
  } else {
    filter._id = order._id;
  }
  return Order.find(filter).sort({ createdAt: 1 });
};

module.exports = {
  SHIPPING_FEE,
  ELIGIBLE_CANCEL_STATUSES,
  FULFILLMENT_FLOW,
  round2,
  buildCheckoutId,
  computeOrderStatus,
  computePaymentStatus,
  assertOrderItemLifecycleTransition,
  validateReturnReason,
  assertItemReturnEligible,
  validateStock,
  buildOrderPayload,
  decrementStock,
  restoreStock,
  groupItemsBySeller,
  buildPurchaseView,
  finalizeCartCheckout,
  cancelCheckoutOrders,
  approveReturn,
  rejectReturn,
  requestItemReturn,
  scopeOrdersForSeller,
  getCheckoutOrders,
};