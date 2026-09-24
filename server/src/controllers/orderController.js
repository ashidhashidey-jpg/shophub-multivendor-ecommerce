const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");
const orderService = require("../services/orderService");
const emailService = require("../services/emailService");

// GET /api/orders (user's purchases — grouped by checkout, newest first)
const getUserOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);

  const filter = { user: req.user._id };
  if (req.query.status) {
    filter["items.status"] = req.query.status;
  }

  const docs = await Order.find(filter).sort({ createdAt: -1 });

  // Group seller-specific records into purchases by checkoutId.
  const byCheckout = new Map();
  for (const doc of docs) {
    const key = doc.checkoutId || `ord:${String(doc._id)}`;
    if (!byCheckout.has(key)) byCheckout.set(key, { createdAt: doc.createdAt, docs: [] });
    byCheckout.get(key).docs.push(doc);
  }

  const purchases = [...byCheckout.values()]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((g) => orderService.buildPurchaseView(g.docs));

  const total = purchases.length;
  const pageItems = purchases.slice(skip, skip + limit);

  sendResponse(res, 200, "Orders retrieved", {
    orders: pageItems,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/orders/:id (a purchase — any of its seller records identifiers the group)
const getUserOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const docs = await orderService.getCheckoutOrders(order, { user: req.user._id });
  const purchase = orderService.buildPurchaseView(docs);

  sendResponse(res, 200, "Order retrieved", {
    order: purchase,
    orders: docs,
    purchase,
  });
});

// POST /api/orders  (COD only — Razorpay orders flow through the payment API)
const createOrder = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;

  if (paymentMethod === "RAZORPAY") {
    throw new ApiError(
      400,
      "Razorpay orders are created via POST /api/payment/create-order and confirmed via POST /api/payment/verify."
    );
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  const address = await Address.findOne({ _id: req.body.addressId, user: req.user._id });
  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  const checkoutId = orderService.buildCheckoutId();

  const { orders, purchase } = await orderService.finalizeCartCheckout({
    cart,
    address,
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    checkoutId,
  });

  emailService.sendOrderConfirmation(req.user.email, purchase.checkoutId, purchase.total);

  sendResponse(res, 201, "Order placed successfully", {
    order: purchase,
    orders,
    purchase,
  });
});

// PATCH /api/orders/:id/cancel (cancels the whole checkout group)
const cancelUserOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const docs = await orderService.getCheckoutOrders(order, { user: req.user._id });
  const cancelled = await orderService.cancelCheckoutOrders(docs);

  sendResponse(res, 200, "Order cancelled successfully. Stock has been restored.", {
    order: orderService.buildPurchaseView(cancelled),
    orders: cancelled,
    purchase: orderService.buildPurchaseView(cancelled),
  });
});

// PATCH /api/orders/:id/return  { productId, reason }
const requestReturn = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const docs = await orderService.getCheckoutOrders(order, { user: req.user._id });

  const { productId, reason } = req.body;
  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  let item = null;
  let ownerDoc = null;
  for (const doc of docs) {
    const found = doc.items.find((i) => i.product.toString() === productId);
    if (found) {
      item = found;
      ownerDoc = doc;
      break;
    }
  }
  if (!item || !ownerDoc) {
    throw new ApiError(404, "Order item not found");
  }

  await orderService.requestItemReturn(ownerDoc, item, reason);

  sendResponse(res, 200, "Return request submitted", {
    order: orderService.buildPurchaseView(docs),
  });
});

// ---------------- SELLER ----------------

// GET /api/seller/orders
const getSellerOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { status, search } = req.query;

  const filter = { "items.seller": req.seller._id };
  if (status) {
    filter["items.status"] = status;
  }
  if (search) {
    const order = await Order.findById(search);
    if (order) {
      filter._id = order._id;
    } else {
      return sendResponse(res, 200, "Orders retrieved", { orders: [], pagination: buildPagination(0, page, limit) });
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  const scoped = await orderService.scopeOrdersForSeller(orders, req.seller._id);

  sendResponse(res, 200, "Orders retrieved", {
    orders: scoped,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/seller/orders/:id
const getSellerOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, "items.seller": req.seller._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const scoped = await orderService.scopeOrdersForSeller([order], req.seller._id);
  sendResponse(res, 200, "Order retrieved", { order: scoped[0] });
});

const findSellerItem = (order, sellerId, productId) => {
  const item = order.items.find(
    (i) => i.seller.toString() === sellerId.toString() && i.product.toString() === productId
  );
  return item || null;
};

// PATCH /api/seller/orders/:id/status
const updateSellerOrderItemStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const { productId, status } = req.body;
  if (!productId || !status) {
    throw new ApiError(400, "productId and status are required");
  }

  const item = findSellerItem(order, req.seller._id, productId);
  if (!item) {
    throw new ApiError(403, "This order item does not belong to your store");
  }

  orderService.assertOrderItemLifecycleTransition(item.status, status);

  item.status = status;
  await order.save();

  sendResponse(res, 200, "Order item status updated", { order });
});

// PATCH /api/seller/orders/:id/return  { productId, action: APPROVE|REJECT }
const handleSellerReturn = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const { productId, action } = req.body;

  const item = findSellerItem(order, req.seller._id, productId);
  if (!item) {
    throw new ApiError(403, "This order item does not belong to your store");
  }

  if (action === "APPROVE") {
    const updated = await orderService.approveReturn(order, item);
    return sendResponse(res, 200, "Return approved. Stock restored.", { order: updated });
  }

  if (action === "REJECT") {
    const updated = await orderService.rejectReturn(order, item);
    return sendResponse(res, 200, "Return request rejected", { order: updated });
  }

  throw new ApiError(400, "action must be APPROVE or REJECT");
});

// GET /api/seller/returns (list of return requests for this seller)
const getSellerReturns = asyncHandler(async (req, res) => {
  const orders = await Order.find({ "items.seller": req.seller._id, "items.status": "RETURN_REQUESTED" })
    .sort({ updatedAt: -1 })
    .populate("user", "name email");

  const scoped = await orderService.scopeOrdersForSeller(orders, req.seller._id);

  sendResponse(res, 200, "Returns retrieved", { returns: scoped });
});

module.exports = {
  createOrder,
  getUserOrders,
  getUserOrder,
  cancelUserOrder,
  requestReturn,
  getSellerOrders,
  getSellerOrder,
  updateSellerOrderItemStatus,
  handleSellerReturn,
  getSellerReturns,
};