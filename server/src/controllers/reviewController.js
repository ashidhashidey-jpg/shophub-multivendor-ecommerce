const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");
const mongoose = require("mongoose");

// POST /api/products/:productId/reviews
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, comment } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.status !== "APPROVED") {
    throw new ApiError(400, "This product is not available for reviews");
  }

  // A user can only review a product they purchased AND received (DELIVERED).
  const order = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    "items.status": "DELIVERED",
  });

  if (!order) {
    throw new ApiError(
      403,
      "You can only review products you have purchased and delivered"
    );
  }

  const deliveredItem = order.items.find(
    (i) => i.product.toString() === productId && i.status === "DELIVERED"
  );

  if (!deliveredItem) {
    throw new ApiError(403, "You have not received this product yet");
  }

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) {
    throw new ApiError(409, "You have already reviewed this product");
  }

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    seller: deliveredItem.seller,
    order: order._id,
    rating,
    comment,
  });

  sendResponse(res, 201, "Review submitted successfully", { review });
});

// GET /api/products/:productId/reviews/eligibility
// Server-authoritative eligibility for the review form. The frontend only shows
// the form when canReview is true; the create endpoint re-verifies everything.
const getReviewEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const baseline = {
    productId,
    purchased: false,
    delivered: false,
    alreadyReviewed: false,
    canReview: false,
    myReviewId: null,
    reason: "",
  };

  if (product.status !== "APPROVED" || !product.isActive) {
    baseline.reason = "This product is not available for reviews";
    return sendResponse(res, 200, "Review eligibility retrieved", { eligibility: baseline });
  }

  const deliveredOrder = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    "items.status": "DELIVERED",
  });
  const deliveredItem = deliveredOrder?.items?.find(
    (i) => i.product.toString() === productId && i.status === "DELIVERED"
  );

  baseline.purchased = Boolean(
    deliveredOrder || (await Order.exists({ user: req.user._id, "items.product": productId }))
  );
  baseline.delivered = Boolean(deliveredItem);

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  baseline.alreadyReviewed = Boolean(existing);
  baseline.myReviewId = existing ? existing._id : null;

  if (baseline.alreadyReviewed) {
    baseline.reason = "You have already reviewed this product";
  } else if (!baseline.purchased) {
    baseline.reason = "You can review this product after purchasing and receiving it";
  } else if (!baseline.delivered) {
    baseline.reason = "You can review this product once your order is delivered";
  }

  baseline.canReview = baseline.purchased && baseline.delivered && !baseline.alreadyReviewed;
  sendResponse(res, 200, "Review eligibility retrieved", { eligibility: baseline });
});

// GET /api/products/:productId/reviews
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page, limit, skip } = getPaginationOptions(req);

  const filter = { product: new mongoose.Types.ObjectId(String(productId)), isApproved: true };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
  ]);

  const avg = await Review.aggregate([
    { $match: filter },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  sendResponse(res, 200, "Reviews retrieved", {
    reviews,
    ratingSummary: avg.length ? { averageRating: Number(avg[0].avg.toFixed(1)), count: avg[0].count } : { averageRating: 0, count: 0 },
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/reviews/mine - reviews by the logged-in user
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate("product", "name images")
    .sort({ createdAt: -1 });

  sendResponse(res, 200, "Reviews retrieved", { reviews });
});

// PUT /api/reviews/:id
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.comment !== undefined) review.comment = req.body.comment;

  await review.save();
  sendResponse(res, 200, "Review updated", { review });
});

// DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!review) {
    throw new ApiError(404, "Review not found");
  }
  sendResponse(res, 200, "Review deleted", {});
});

module.exports = {
  createReview,
  getReviewEligibility,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
};