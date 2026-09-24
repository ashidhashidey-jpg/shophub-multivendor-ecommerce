const Product = require("../models/Product");
const Category = require("../models/Category");
const Seller = require("../models/Seller");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getPaginationOptions, buildPagination } = require("../utils/paginate");
const mongoose = require("mongoose");

// ---------------- PUBLIC ----------------

// GET /api/products
const getPublicProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const {
    search,
    category,
    seller,
    minPrice,
    maxPrice,
    sort,
  } = req.query;

  const filter = { status: "APPROVED", isActive: true };

  if (search) {
    const quoted = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [{ name: new RegExp(quoted, "i") }, { description: new RegExp(quoted, "i") }];
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    } else {
      const cat = await Category.findOne({ slug: category });
      if (!cat) {
        throw new ApiError(404, "Category not found");
      }
      filter.category = cat._id;
    }
  }

  // Only APPROVED sellers' products are visible publicly. Suspended, rejected,
  // unapproved, or deleted sellers' products are never exposed.
  const approvedSellerIds = await Seller.find({ status: "APPROVED" }).distinct("_id");
  if (approvedSellerIds.length === 0) {
    return sendResponse(res, 200, "Products retrieved", {
      products: [],
      pagination: buildPagination(0, page, limit),
    });
  }
  filter.seller = { $in: approvedSellerIds };

  if (seller) {
    if (!mongoose.Types.ObjectId.isValid(seller)) {
      throw new ApiError(400, "Invalid seller ID");
    }
    if (!approvedSellerIds.some((id) => id.toString() === seller.toString())) {
      return sendResponse(res, 200, "Products retrieved", {
        products: [],
        pagination: buildPagination(0, page, limit),
      });
    }
    filter.seller = seller;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.finalPrice = {};
    if (minPrice !== undefined) {
      const min = Number(minPrice);
      if (Number.isNaN(min)) throw new ApiError(400, "minPrice must be a number");
      filter.finalPrice.$gte = min;
    }
    if (maxPrice !== undefined) {
      const max = Number(maxPrice);
      if (Number.isNaN(max)) throw new ApiError(400, "maxPrice must be a number");
      filter.finalPrice.$lte = max;
    }
  }

  let sortOptions = {};
  switch (sort) {
    case "price_asc":
      sortOptions = { finalPrice: 1 };
      break;
    case "price_desc":
      sortOptions = { finalPrice: -1 };
      break;
    case "newest":
      sortOptions = { createdAt: -1 };
      break;
    case "name_asc":
      sortOptions = { name: 1 };
      break;
    default:
      sortOptions = { createdAt: -1 };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-description")
      .populate("seller", "storeName status approvedAt")
      .populate("category", "name slug")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Products retrieved", {
    products,
    pagination: buildPagination(total, page, limit),
  });
});

// GET /api/products/:id
const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    status: "APPROVED",
    isActive: true,
  })
    .populate("seller", "storeName storeDescription status")
    .populate("category", "name slug");

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // The product's seller must still exist and be APPROVED for the detail to be public.
  const sellerDoc = product.seller;
  if (!sellerDoc || sellerDoc.status !== "APPROVED") {
    throw new ApiError(404, "Product not found");
  }

  sendResponse(res, 200, "Product retrieved", { product });
});

// ---------------- SELLER ----------------

const getOwnedProductOr403 = async (productId, sellerId, { mustBeActive } = {}) => {
  const product = await Product.findById(productId);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (product.seller.toString() !== sellerId.toString()) {
    throw new ApiError(403, "Access denied. Product does not belong to your store.");
  }

  if (mustBeActive && !product.isActive) {
    throw new ApiError(400, "Product is deactivated");
  }

  return product;
};

// POST /api/seller/products
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, discount, stock, images } = req.body;

  const categoryDoc = await Category.findOne({ _id: category, isActive: true });
  if (!categoryDoc) {
    throw new ApiError(400, "Invalid or inactive category");
  }

  const product = await Product.create({
    seller: req.seller._id,
    category,
    name,
    description,
    price,
    discount: discount === undefined || discount === null ? 0 : discount,
    stock,
    images: images || [],
    status: "PENDING",
  });

  sendResponse(res, 201, "Product created successfully. Awaiting admin approval.", {
    product,
  });
});

// GET /api/seller/products
const getMyProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationOptions(req);
  const { search, status } = req.query;

  const filter = { seller: req.seller._id };
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }
  if (status) {
    filter.status = status;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
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

// GET /api/seller/products/:id
const getMyProduct = asyncHandler(async (req, res) => {
  const product = await getOwnedProductOr403(req.params.id, req.seller._id);
  sendResponse(res, 200, "Product retrieved", { product });
});

// PUT /api/seller/products/:id
const updateMyProduct = asyncHandler(async (req, res) => {
  const product = await getOwnedProductOr403(req.params.id, req.seller._id, { mustBeActive: true });

  const { name, description, category, price, discount, stock, images } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (category !== undefined) {
    const categoryDoc = await Category.findOne({ _id: category, isActive: true });
    if (!categoryDoc) throw new ApiError(400, "Invalid or inactive category");
    product.category = category;
  }
  if (price !== undefined) product.price = price;
  if (discount !== undefined) product.discount = discount;
  if (stock !== undefined) product.stock = stock;
  if (images !== undefined) product.images = images;

  // Any edit to an approved product requires re-approval.
  product.status = "PENDING";
  product.rejectionReason = "";

  await product.save();

  sendResponse(res, 200, "Product updated successfully. It will require admin approval again.", {
    product,
  });
});

// DELETE /api/seller/products/:id (soft-deactivate)
const deleteMyProduct = asyncHandler(async (req, res) => {
  const product = await getOwnedProductOr403(req.params.id, req.seller._id);

  product.isActive = false;
  await product.save();

  sendResponse(res, 200, "Product deactivated successfully", { product });
});

module.exports = {
  getPublicProducts,
  getPublicProduct,
  createProduct,
  getMyProducts,
  getMyProduct,
  updateMyProduct,
  deleteMyProduct,
};