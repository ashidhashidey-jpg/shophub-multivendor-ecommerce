const User = require("../models/User");
const Seller = require("../models/Seller");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");
const mongoose = require("mongoose");
const orderService = require("../services/orderService");
const refundService = require("../services/refundService");
const emailService = require("../services/emailService");

const validateId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label}`);
  }
};

// GET /api/admin/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalSellers,
    totalProducts,
    totalOrders,
    revenueAgg,
    pendingSellerApprovals,
    pendingProductApprovals,
    pendingReturns,
    totalRefunded,
  ] = await Promise.all([
    User.countDocuments(),
    Seller.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { paymentStatus: "PAID" } },
      { $group: { _id: null, revenue: { $sum: "$total" } } },
    ]),
    Seller.countDocuments({ status: "PENDING" }),
    Product.countDocuments({ status: "PENDING" }),
    Order.countDocuments({ "items.status": "RETURN_REQUESTED" }),
    Order.countDocuments({ paymentStatus: "REFUNDED" }),
  ]);

  sendResponse(res, 200, "Dashboard retrieved", {
    dashboard: {
      totalUsers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue: revenueAgg.length ? revenueAgg[0].revenue : 0,
      pendingSellerApprovals,
      pendingProductApprovals,
      pendingReturns,
      pendingRefunds: totalRefunded,
    },
  });
});

// ---------------- USERS ----------------

// GET /api/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { search, role, blocked } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (role) filter.role = role;
  if (blocked !== undefined) filter.isBlocked = blocked === "true";

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-password"),
    User.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Users retrieved", {
    users,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/admin/users/:id
const getUserById = asyncHandler(async (req, res) => {
  validateId(req.params.id, "user ID");
  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new ApiError(404, "User not found");
  sendResponse(res, 200, "User retrieved", { user });
});

// PATCH /api/admin/users/:id/block
const blockUser = asyncHandler(async (req, res) => {
  validateId(req.params.id, "user ID");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (user.role === "ADMIN") {
    throw new ApiError(400, "Cannot block an admin");
  }

  user.isBlocked = true;
  user.blockedAt = new Date();
  await user.save();

  if (user.role === "SELLER") {
    await Seller.updateOne({ user: user._id }, { status: "SUSPENDED", suspendedReason: "Account blocked by admin" });
  }

  sendResponse(res, 200, "User blocked", { user: user.toSafeObject() });
});

// PATCH /api/admin/users/:id/unblock
const unblockUser = asyncHandler(async (req, res) => {
  validateId(req.params.id, "user ID");
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  user.isBlocked = false;
  user.blockedAt = null;
  await user.save();

  sendResponse(res, 200, "User unblocked", { user: user.toSafeObject() });
});

// ---------------- SELLERS ----------------

// GET /api/admin/sellers
const getAllSellers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { search, status } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [{ storeName: { $regex: search, $options: "i" } }];
  }

  const [sellers, total] = await Promise.all([
    Seller.find(filter)
      .populate("user", "name email phone isBlocked")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Seller.countDocuments(filter),
  ]);

  // Keep sensitive KYC details out of the list response; just report whether KYC was submitted.
  const safeSellers = sellers.map((s) => {
    const plain = s.toObject();
    const { kycDocuments, ...rest } = plain;
    return { ...rest, kycSubmitted: (kycDocuments || []).length > 0 };
  });

  sendResponse(res, 200, "Sellers retrieved", {
    sellers: safeSellers,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/admin/sellers/:id
const getSellerById = asyncHandler(async (req, res) => {
  validateId(req.params.id, "seller ID");
  const seller = await Seller.findById(req.params.id).populate("user", "name email phone isBlocked");

  if (!seller) throw new ApiError(404, "Seller not found");

  const stats = await Promise.all([
    Product.countDocuments({ seller: seller._id }),
    Product.countDocuments({ seller: seller._id, status: "APPROVED" }),
    Order.countDocuments({ "items.seller": seller._id }),
  ]);

  sendResponse(res, 200, "Seller retrieved", {
    seller,
    stats: { totalProducts: stats[0], approvedProducts: stats[1], totalOrders: stats[2] },
  });
});

// PATCH /api/admin/sellers/:id/approve
const approveSeller = asyncHandler(async (req, res) => {
  validateId(req.params.id, "seller ID");
  const seller = await Seller.findById(req.params.id);
  if (!seller) throw new ApiError(404, "Seller not found");

  if (seller.status === "APPROVED") {
    throw new ApiError(400, "Seller is already approved");
  }

  seller.status = "APPROVED";
  seller.approvedAt = new Date();
  seller.rejectedReason = "";
  seller.suspendedReason = "";
  await seller.save();

  await User.findByIdAndUpdate(seller.user, { role: "SELLER", isBlocked: false });

  const user = await User.findById(seller.user);
  emailService.sendSellerApproved(user.email, seller.storeName);

  sendResponse(res, 200, "Seller approved", { seller });
});

// PATCH /api/admin/sellers/:id/reject
const rejectSeller = asyncHandler(async (req, res) => {
  validateId(req.params.id, "seller ID");
  const seller = await Seller.findById(req.params.id);
  if (!seller) throw new ApiError(404, "Seller not found");

  seller.status = "REJECTED";
  seller.rejectedReason = req.body.reason || "Application rejected";
  seller.suspendedReason = "";
  await seller.save();

  const user = await User.findById(seller.user);
  if (user && user.role === "SELLER") {
    user.role = "USER";
    await user.save();
  }
  emailService.sendSellerRejected(user.email, seller.storeName, seller.rejectedReason);

  sendResponse(res, 200, "Seller rejected", { seller });
});

// PATCH /api/admin/sellers/:id/suspend
const suspendSeller = asyncHandler(async (req, res) => {
  validateId(req.params.id, "seller ID");
  const seller = await Seller.findById(req.params.id);
  if (!seller) throw new ApiError(404, "Seller not found");
  if (seller.status === "PENDING") {
    throw new ApiError(400, "Pending sellers cannot be suspended");
  }

  seller.status = "SUSPENDED";
  seller.suspendedReason = req.body.reason || "Suspended by admin";
  await seller.save();

  sendResponse(res, 200, "Seller suspended", { seller });
});

// PATCH /api/admin/sellers/:id/reactivate
const reactivateSeller = asyncHandler(async (req, res) => {
  validateId(req.params.id, "seller ID");
  const seller = await Seller.findById(req.params.id);
  if (!seller) throw new ApiError(404, "Seller not found");

  seller.status = "APPROVED";
  seller.approvedAt = new Date();
  seller.suspendedReason = "";
  await seller.save();

  await User.findByIdAndUpdate(seller.user, { role: "SELLER" });

  sendResponse(res, 200, "Seller reactivated", { seller });
});

// ---------------- PRODUCTS ----------------

// GET /api/admin/products
const getAllProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { search, status, category, seller } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) {
    if (!mongoose.Types.ObjectId.isValid(category)) throw new ApiError(400, "Invalid category ID");
    filter.category = category;
  }
  if (seller) {
    if (!mongoose.Types.ObjectId.isValid(seller)) throw new ApiError(400, "Invalid seller ID");
    filter.seller = seller;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("seller", "storeName")
      .populate("category", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Products retrieved", {
    products,
    pagination: buildPagination(total, page, limit),
  });
});

const getAdminProduct = async (req, res, next) => {
  validateId(req.params.id, "product ID");
  const product = await Product.findById(req.params.id)
    .populate("seller", "storeName")
    .populate("category", "name slug");
  if (!product) throw new ApiError(404, "Product not found");
  return product;
};

// PATCH /api/admin/products/:id/approve
const approveProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProduct(req, res);
  product.status = "APPROVED";
  product.isActive = true;
  product.rejectionReason = "";
  await product.save();
  sendResponse(res, 200, "Product approved", { product });
});

// PATCH /api/admin/products/:id/reject
const rejectProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProduct(req, res);
  product.status = "REJECTED";
  product.rejectionReason = req.body.reason || "Rejected by admin";
  await product.save();
  sendResponse(res, 200, "Product rejected", { product });
});

// PATCH /api/admin/products/:id/activate
const activateProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProduct(req, res);
  if (product.status === "REJECTED") {
    throw new ApiError(400, "Rejected products cannot be activated. Approve or edit first.");
  }
  product.isActive = true;
  await product.save();
  sendResponse(res, 200, "Product activated", { product });
});

// PATCH /api/admin/products/:id/deactivate
const deactivateProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProduct(req, res);
  product.isActive = false;
  await product.save();
  sendResponse(res, 200, "Product deactivated", { product });
});

// ---------------- ORDERS ----------------

// GET /api/admin/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { status, paymentStatus } = req.query;

  const filter = {};
  if (status) filter["items.status"] = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .populate("items.seller", "storeName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Orders retrieved", { orders, pagination: buildPagination(total, page, limit) });
});

// GET /api/admin/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
  validateId(req.params.id, "order ID");
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("items.seller", "storeName");
  if (!order) throw new ApiError(404, "Order not found");
  sendResponse(res, 200, "Order retrieved", { order });
});

// PATCH /api/admin/orders/:id/status  { productId?, status }
const updateOrderStatus = asyncHandler(async (req, res) => {
  validateId(req.params.id, "order ID");
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { productId, status } = req.body;
  if (!status) {
    throw new ApiError(400, "status is required");
  }

  if (productId) {
    const item = order.items.find((i) => i.product.toString() === productId);
    if (!item) throw new ApiError(404, "Order item not found");
    orderService.assertOrderItemLifecycleTransition(item.status, status);
    item.status = status;
  } else {
    if (order.items.length === 0) throw new ApiError(400, "Order has no items");
    for (const item of order.items) {
      orderService.assertOrderItemLifecycleTransition(item.status, status);
      item.status = status;
    }
  }

  await order.save();
  sendResponse(res, 200, "Order status updated", { order });
});

// PATCH /api/admin/orders/:id/refund  { productId? }
// Initiates/manages the refund for a RETURNED or CANCELLED item (or every
// eligible item when productId is omitted). RAZORPAY refunds go through the
// real gateway when configured and never fake success; COD orders are marked
// refunded without a gateway call. The amount is computed server-side from the
// stored order snapshot.
const refundOrder = asyncHandler(async (req, res) => {
  validateId(req.params.id, "order ID");
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { productId } = req.body;
  const outcome = await refundService.refundOrderItems(order, { productId });

  sendResponse(res, 200, "Refund processed", {
    order: outcome.order,
    refundResult:
      outcome.results && outcome.results.length > 0
        ? { refunds: outcome.results, count: outcome.results.length }
        : { duplicate: true, refundId: outcome.refundId || undefined },
  });
});

// GET /api/admin/returns — every pending return request across all sellers,
// flattened per item with customer, seller, product, quantity, reason and
// order/payment status.
const getAdminReturns = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);

  const [orders, total] = await Promise.all([
    Order.find({ "items.status": "RETURN_REQUESTED" })
      .populate("user", "name email")
      .populate("items.seller", "storeName")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments({ "items.status": "RETURN_REQUESTED" }),
  ]);

  const returns = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (item.status !== "RETURN_REQUESTED") continue;
      returns.push({
        orderId: order._id,
        checkoutId: order.checkoutId,
        product: item.product,
        productName: item.name,
        image: item.image || "",
        quantity: item.quantity,
        amount: item.subtotal,
        returnReason: item.returnReason || "",
        customer: order.user,
        seller: item.seller,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
    }
  }

  sendResponse(res, 200, "Returns retrieved", {
    returns,
    pagination: buildPagination(total, page, limit),
  });
});

// PATCH /api/admin/orders/:id/return  { productId, action: APPROVE|REJECT }
// Admin-level return decision for the cases where admin intervention is needed.
const handleAdminReturn = asyncHandler(async (req, res) => {
  validateId(req.params.id, "order ID");
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { productId, action } = req.body;
  const item = order.items.find((i) => i.product.toString() === productId);
  if (!item) throw new ApiError(404, "Order item not found");

  let updated;
  if (action === "APPROVE") {
    updated = await orderService.approveReturn(order, item);
  } else if (action === "REJECT") {
    updated = await orderService.rejectReturn(order, item);
  } else {
    throw new ApiError(400, "action must be APPROVE or REJECT");
  }

  sendResponse(res, 200, action === "APPROVE" ? "Return approved. Stock restored." : "Return request rejected", {
    order: updated,
  });
});

// ---------------- REVIEWS ----------------

// GET /api/admin/reviews
const getAllReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);

  const [reviews, total] = await Promise.all([
    Review.find({})
      .populate("user", "name email")
      .populate("product", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments({}),
  ]);

  sendResponse(res, 200, "Reviews retrieved", { reviews, pagination: buildPagination(total, page, limit) });
});

// PATCH /api/admin/reviews/:id/approve
const approveReview = asyncHandler(async (req, res) => {
  validateId(req.params.id, "review ID");
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, "Review not found");
  review.isApproved = true;
  await review.save();
  sendResponse(res, 200, "Review approved", { review });
});

// DELETE /api/admin/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  validateId(req.params.id, "review ID");
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, "Review not found");
  sendResponse(res, 200, "Review deleted", {});
});

module.exports = {
  getDashboard,
  getAllUsers,
  getUserById,
  blockUser,
  unblockUser,
  getAllSellers,
  getSellerById,
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
  getAllProducts,
  approveProduct,
  rejectProduct,
  activateProduct,
  deactivateProduct,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  refundOrder,
  getAdminReturns,
  handleAdminReturn,
  getAllReviews,
  approveReview,
  deleteReview,
};