const Product = require("../models/Product");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { getOrCreateCart, enrichCart } = require("../services/cartService");

const productAvailable = (product) =>
  Boolean(
    product &&
      product.status === "APPROVED" &&
      product.isActive === true &&
      product.seller &&
      product.seller.status === "APPROVED"
  );

const loadAvailableProduct = async (productId) => {
  let product;
  try {
    product = await Product.findById(productId).populate("seller", "storeName status");
  } catch (err) {
    if (err.name === "CastError") {
      throw new ApiError(400, "Invalid product ID");
    }
    throw err;
  }
  return product;
};

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const view = await enrichCart(cart);

  sendResponse(res, 200, "Cart retrieved", { cart: view });
});

// POST /api/cart/items
const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const qty = quantity === undefined || quantity === null ? 1 : Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    throw new ApiError(422, "Quantity must be a positive integer");
  }

  const product = await loadAvailableProduct(productId);

  if (!product || !productAvailable(product)) {
    throw new ApiError(404, "Product not found or is not available");
  }

  const cart = await getOrCreateCart(req.user._id);

  const existingIndex = cart.items.findIndex((i) => String(i.product) === productId);
  const currentQty = existingIndex === -1 ? 0 : Number(cart.items[existingIndex].quantity);
  const newQty = currentQty + qty;

  if (newQty > product.stock) {
    throw new ApiError(400, `Insufficient stock for "${product.name}". Available: ${product.stock}`);
  }

  const snapshot = {
    product: product._id,
    seller: product.seller._id,
    name: product.name,
    image: product.images && product.images.length ? product.images[0] : "",
    price: product.finalPrice,
    quantity: newQty,
  };

  if (existingIndex === -1) {
    cart.items.push(snapshot);
  } else {
    cart.items[existingIndex] = { ...cart.items[existingIndex], ...snapshot };
  }

  await cart.save();
  const view = await enrichCart(cart);

  sendResponse(res, 201, "Item added to cart", { cart: view });
});

// PUT /api/cart/items/:productId
const updateQuantity = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new ApiError(422, "Quantity must be at least 1");
  }

  const cart = await getOrCreateCart(req.user._id);

  const existingIndex = cart.items.findIndex((i) => String(i.product) === productId);
  if (existingIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  const product = await loadAvailableProduct(productId);

  if (!product || !productAvailable(product)) {
    throw new ApiError(404, "Product not found or is not available");
  }

  if (qty > product.stock) {
    throw new ApiError(400, `Insufficient stock for "${product.name}". Available: ${product.stock}`);
  }

  cart.items[existingIndex].quantity = qty;
  cart.items[existingIndex].price = product.finalPrice;
  cart.items[existingIndex].name = product.name;
  cart.items[existingIndex].image = product.images && product.images.length ? product.images[0] : "";
  await cart.save();

  const view = await enrichCart(cart);
  sendResponse(res, 200, "Cart updated", { cart: view });
});

// DELETE /api/cart/items/:productId
const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await getOrCreateCart(req.user._id);

  const targetIndex = cart.items.findIndex((i) => String(i.product) === productId);
  if (targetIndex === -1) {
    throw new ApiError(404, "Item not found in cart");
  }

  cart.items.splice(targetIndex, 1);
  await cart.save();

  const view = await enrichCart(cart);
  sendResponse(res, 200, "Item removed from cart", { cart: view });
});

// DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();

  sendResponse(res, 200, "Cart cleared", { cart: await enrichCart(cart) });
});

module.exports = { getCart, addItem, updateQuantity, removeItem, clearCart };