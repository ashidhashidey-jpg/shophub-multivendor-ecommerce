const Seller = require("../models/Seller");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");

// Public store footer — never exposes phone, address, KYC, or rejected data.
const PUBLIC_FIELDS =
  "_id storeName storeDescription approvedAt";

// GET /api/stores
// Only APPROVED sellers are listed. productCount = approved + active products.
const getPublicStores = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { search } = req.query;

  const filter = { status: "APPROVED" };
  if (search) {
    const quoted = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.storeName = { $regex: quoted, $options: "i" };
  }

  const [total, stores] = await Promise.all([
    Seller.countDocuments(filter),
    Seller.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "products",
          let: { sellerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$seller", "$$sellerId"] },
                    { $eq: ["$status", "APPROVED"] },
                    { $eq: ["$isActive", true] },
                  ],
                },
              },
            },
          ],
          as: "products",
        },
      },
      { $addFields: { productCount: { $size: "$products" } } },
      { $project: { products: 0, kycDocuments: 0, phone: 0, address: 0 } },
      { $sort: { storeName: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
  ]);

  sendResponse(res, 200, "Stores retrieved", {
    stores,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/stores/:id
const getPublicStore = asyncHandler(async (req, res) => {
  const store = await Seller.findOne({ _id: req.params.id, status: "APPROVED" });
  if (!store) {
    throw new ApiError(404, "Store not found");
  }

  const productCount = await Product.countDocuments({
    seller: store._id,
    status: "APPROVED",
    isActive: true,
  });

  sendResponse(res, 200, "Store retrieved", {
    store: {
      _id: store._id,
      id: store._id,
      storeName: store.storeName,
      storeDescription: store.storeDescription,
      approvedAt: store.approvedAt,
      productCount,
    },
  });
});

module.exports = { getPublicStores, getPublicStore };