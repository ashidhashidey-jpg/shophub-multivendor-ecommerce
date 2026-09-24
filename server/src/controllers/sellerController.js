const Seller = require("../models/Seller");
const Order = require("../models/Order");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");

// POST /api/sellers/register
const registerSeller = asyncHandler(async (req, res) => {
  const existing = await Seller.findOne({ user: req.user._id });

  if (existing && existing.status !== "REJECTED") {
    throw new ApiError(409, "Seller profile already exists for this account");
  }

  // A rejected applicant can reapply: update the existing profile in place
  // and re-enter the review queue instead of creating a duplicate account.
  if (existing) {
    existing.storeName = req.body.storeName;
    existing.storeDescription = req.body.storeDescription;
    existing.phone = req.body.phone;
    existing.address = req.body.address;
    existing.kycDocuments = req.body.kycDocuments || [];
    existing.status = "PENDING";
    existing.approvedAt = null;
    existing.rejectedReason = "";
    existing.suspendedReason = "";
    await existing.save();
    return sendResponse(res, 201, "Seller application resubmitted successfully", { seller: existing });
  }

  const seller = await Seller.create({
    user: req.user._id,
    storeName: req.body.storeName,
    storeDescription: req.body.storeDescription,
    phone: req.body.phone,
    address: req.body.address,
    kycDocuments: req.body.kycDocuments || [],
  });

  sendResponse(res, 201, "Seller registration submitted successfully", { seller });
});

// PUT /api/sellers/kyc
const updateKyc = asyncHandler(async (req, res) => {
  if (!req.seller) {
    throw new ApiError(404, "Seller profile not found");
  }

  req.seller.kycDocuments = req.body.kycDocuments || [];

  // Rejected applicants can fix their documents and re-enter review.
  if (req.seller.status === "REJECTED") {
    req.seller.status = "PENDING";
    req.seller.approvedAt = null;
    req.seller.rejectedReason = "";
    req.seller.suspendedReason = "";
  }

  await req.seller.save();

  sendResponse(res, 200, "KYC documents updated", { seller: req.seller });
});

// GET /api/sellers/profile
const getMySellerProfile = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id }).populate("user", "name email phone");

  if (!seller) {
    throw new ApiError(404, "Seller profile not found");
  }

  sendResponse(res, 200, "Seller profile retrieved", { seller });
});

// GET /api/sellers/status
const getSellerStatus = asyncHandler(async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id }, "storeName status approvedAt rejectedReason suspendedReason");

  // No seller application yet is a legitimate state (e.g. the registration
  // page is open). Return an explicit null instead of a 404 so the frontend
  // knows the user simply has not applied.
  sendResponse(res, 200, "Seller status retrieved", { seller: seller || null });
});

// PUT /api/sellers/store
const updateStore = asyncHandler(async (req, res) => {
  if (!req.seller) {
    throw new ApiError(404, "Seller profile not found");
  }

  const { storeName, storeDescription, phone, address } = req.body;

  if (storeName !== undefined) req.seller.storeName = storeName;
  if (storeDescription !== undefined) req.seller.storeDescription = storeDescription;
  if (phone !== undefined) req.seller.phone = phone;
  if (address !== undefined) req.seller.address = address;

  await req.seller.save();

  sendResponse(res, 200, "Store updated successfully", { seller: req.seller });
});

// GET /api/sellers/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  if (req.seller.status !== "APPROVED") {
    throw new ApiError(
      403,
      `Your seller account is ${req.seller.status}. Only APPROVED sellers can access the dashboard.`
    );
  }

  const sellerId = req.seller._id;

  const [totalProducts, totalOrders, pendingOrders, completedOrders, totalSalesAgg, earningsAgg, pendingReturns] =
    await Promise.all([
      Product.countDocuments({ seller: sellerId }),
      Order.countDocuments({ "items.seller": sellerId }),
      Order.countDocuments({ "items.seller": sellerId, "items.status": "PENDING" }),
      Order.countDocuments({ "items.seller": sellerId, "items.status": "DELIVERED" }),
      Order.aggregate([
        { $match: { "items.seller": sellerId, "items.status": { $in: ["DELIVERED", "RETURN_REQUESTED", "RETURNED", "REFUNDED", "SHIPPED"] } } },
        { $unwind: "$items" },
        { $match: { "items.seller": sellerId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$items.subtotal" },
          },
        },
      ]),
      Order.aggregate([
        { $match: { "items.seller": sellerId, "items.status": "DELIVERED" } },
        { $unwind: "$items" },
        { $match: { "items.seller": sellerId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$items.subtotal" },
          },
        },
      ]),
      Order.countDocuments({
        "items.seller": sellerId,
        "items.status": "RETURN_REQUESTED",
      }),
    ]);

  const totalSales = totalSalesAgg.length ? totalSalesAgg[0].total : 0;
  const totalEarnings = earningsAgg.length ? earningsAgg[0].total : 0;

  sendResponse(res, 200, "Dashboard retrieved", {
    dashboard: {
      totalProducts,
      totalOrders,
      pendingOrders,
      completedOrders,
      pendingReturns,
      totalSales: Number(totalSales.toFixed(2)),
      totalEarnings: Number(totalEarnings.toFixed(2)),
    },
  });
});

module.exports = {
  registerSeller,
  getMySellerProfile,
  getSellerStatus,
  updateStore,
  updateKyc,
  getDashboard,
};