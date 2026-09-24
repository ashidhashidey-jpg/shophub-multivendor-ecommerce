const Cart = require("../models/Cart");
const Product = require("../models/Product");

const PRODUCT_SELECT = "name price finalPrice stock discount status isActive images";
const SELLER_SELECT = "storeName status";

const round2 = (n) => Number(Number(n || 0).toFixed(2));

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

/**
 * Build the authoritative, current cart view straight from the database.
 * Old snapshot data (name/image/price) is only used to keep an item readable
 * after its product is gone; money values never come from the frontend.
 */
const enrichCart = async (cart) => {
  const rawItems = cart && cart.items ? cart.items : [];
  const ids = rawItems.map((i) => i.product);

  const products = await Product.find({ _id: { $in: ids } })
    .select(PRODUCT_SELECT)
    .populate("seller", SELLER_SELECT);

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const items = rawItems.map((item) => {
    const id = String(item.product);
    const product = productMap.get(id) || null;
    const seller = product ? product.seller : null;

    const available = Boolean(
      product &&
        seller &&
        product.status === "APPROVED" &&
        product.isActive === true &&
        seller.status === "APPROVED"
    );

    let unavailableReason;
    if (!product) {
      unavailableReason = "Product is no longer available";
    } else if (product.status !== "APPROVED") {
      unavailableReason = "Product is not approved for sale";
    } else if (product.isActive !== true) {
      unavailableReason = "Product is currently inactive";
    } else if (!seller || seller.status !== "APPROVED") {
      unavailableReason = "Seller is not currently available";
    }

    const listPrice = product ? product.price : Number(item.price || 0);
    const finalPrice = product ? product.finalPrice : Number(item.price || 0);
    const quantity = Number(item.quantity) || 0;

    return {
      productId: id,
      name: product ? product.name : item.name,
      image: product && product.images && product.images.length ? product.images[0] : item.image || "",
      price: listPrice,
      finalPrice,
      quantity,
      stock: product ? product.stock : 0,
      availability: available,
      unavailableReason: available ? undefined : unavailableReason,
      seller: seller
        ? { _id: seller._id, storeName: seller.storeName, status: seller.status }
        : null,
      lineTotal: available ? round2(finalPrice * quantity) : 0,
      lineDiscount: available ? round2((listPrice - finalPrice) * quantity) : 0,
    };
  });

  const availableItems = items.filter((i) => i.availability);

  const totals = {
    itemCount: items.length,
    totalQuantity: round2(items.reduce((s, i) => s + i.quantity, 0)),
    subtotal: round2(availableItems.reduce((s, i) => s + i.price * i.quantity, 0)),
    discount: round2(availableItems.reduce((s, i) => s + (i.price - i.finalPrice) * i.quantity, 0)),
    shipping: 0,
    total: round2(availableItems.reduce((s, i) => s + i.finalPrice * i.quantity, 0)),
  };

  return { items, totals };
};

module.exports = { PRODUCT_SELECT, SELLER_SELECT, round2, getOrCreateCart, enrichCart };