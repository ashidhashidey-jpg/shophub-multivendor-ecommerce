const mongoose = require("mongoose");
const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getOrCreateCart, enrichCart } = require("../services/cartService");

// GET /api/checkout/summary?addressId=<optional>
const getCheckoutSummary = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  if (!cart.items || cart.items.length === 0) {
    throw new ApiError(400, "Your cart is empty. Add items before checkout.");
  }

  const view = await enrichCart(cart);

  // Every cart line must be purchasable right now. Unavailable lines fail
  // clearly instead of being silently dropped or repriced.
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

  // Authoritative totals are computed by the server from current product data.
  const { items, totals } = view;

  let address = null;
  if (req.query.addressId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.addressId)) {
      throw new ApiError(400, "Invalid address ID");
    }
    address = await Address.findOne({ _id: req.query.addressId, user: req.user._id });
    if (!address) {
      throw new ApiError(404, "Address not found");
    }
  } else {
    address = await Address.findOne({ user: req.user._id, isDefault: true });
  }

  sendResponse(res, 200, "Checkout summary", {
    items,
    totals,
    address,
    paymentMethod: null,
    paymentEnabled: false,
  });
});

module.exports = { getCheckoutSummary };