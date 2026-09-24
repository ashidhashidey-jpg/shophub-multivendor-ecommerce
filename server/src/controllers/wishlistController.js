const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, products: [] });
  }
  return wishlist;
};

// GET /api/wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id })
    .populate({
      path: "products",
      // Only products still publicly purchasable are listed. Products that were
      // later deactivated, rejected, or re-pended are dropped from the response
      // (they stay in the user's wishlist document but are rendered unavailable).
      match: { status: "APPROVED", isActive: true },
      select: "name price finalPrice discount stock status isActive images seller",
      populate: { path: "seller", select: "storeName" },
    });

  sendResponse(res, 200, "Wishlist retrieved", {
    wishlist: wishlist ? wishlist : { products: [] },
  });
});

// POST /api/wishlist/:productId
const addProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findOne({ _id: productId, status: "APPROVED", isActive: true });
  if (!product) {
    throw new ApiError(404, "Product not found or is not available");
  }

  const wishlist = await getOrCreateWishlist(req.user._id);

  if (!wishlist.products.some((p) => p.toString() === productId)) {
    wishlist.products.push(product._id);
    await wishlist.save();
  }

  sendResponse(res, 201, "Product added to wishlist", { wishlist });
});

// DELETE /api/wishlist/:productId
const removeProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) {
    throw new ApiError(404, "Wishlist not found");
  }

  wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
  await wishlist.save();

  sendResponse(res, 200, "Product removed from wishlist", { wishlist });
});

module.exports = { getWishlist, addProduct, removeProduct };