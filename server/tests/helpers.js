const dotenv = require("dotenv");
dotenv.config();
process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");

const crypto = require("crypto");
const razorpayConfig = require("../src/config/razorpay");

const User = require("../src/models/User");
const Seller = require("../src/models/Seller");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Address = require("../src/models/Address");
const Cart = require("../src/models/Cart");
const Order = require("../src/models/Order");
const Payment = require("../src/models/Payment");
const Review = require("../src/models/Review");
const Wishlist = require("../src/models/Wishlist");

const ALL_MODELS = [User, Seller, Category, Product, Address, Cart, Order, Payment, Review, Wishlist];

// Capture the original URI once so repeated calls never compound a database name.
const ORIGINAL_URI = process.env.MONGO_URI;

function replaceDbName(uri, newDb) {
  const qIndex = uri.indexOf("?");
  const base = qIndex === -1 ? uri : uri.slice(0, qIndex);
  const query = qIndex === -1 ? "" : uri.slice(qIndex);
  const slash = base.lastIndexOf("/");
  const authority = slash === -1 ? base : base.slice(0, slash);
  return `${authority}/${newDb}${query}`;
}

const buildTestUri = () => {
  if (!ORIGINAL_URI) {
    throw new Error("MONGO_URI is required to run tests");
  }
  return replaceDbName(ORIGINAL_URI, "multivendor_test");
};

const setup = async () => {
  process.env.MONGO_URI = buildTestUri();
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
};

const teardown = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

const cleanup = async () => {
  for (const model of ALL_MODELS) {
    await model.deleteMany({});
  }
};

const unique = () => Math.random().toString(36).slice(2, 10);

const registerUser = async (overrides = {}) => {
  const email = overrides.email || `u_${unique()}@test.com`;
  const password = overrides.password || "Pass1234";
  const res = await request(app)
    .post("/api/auth/register")
    .send({
      name: overrides.name || "Test User",
      email,
      password,
      phone: overrides.phone || "9876543210",
    });

  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return {
    res,
    token: res.body.data.token,
    email,
    password,
    name: overrides.name || "Test User",
    user: res.body.data.user,
  };
};

const login = async (email, password) => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res;
};

const makeCategory = async (name) => {
  const catName = name || `Cat ${unique()}`;
  return Category.create({ name: catName });
};

const makeProduct = async ({ seller, category, ...overrides }) => {
  return Product.create({
    seller: seller._id || seller,
    category: category._id || category,
    name: overrides.name || `Product ${unique()}`,
    description: overrides.description || "A high quality product with a long detailed description suitable for all use.",
    price: overrides.price === undefined ? 1000 : overrides.price,
    discount: overrides.discount === undefined ? 0 : overrides.discount,
    stock: overrides.stock === undefined ? 10 : overrides.stock,
    status: overrides.status === undefined ? "APPROVED" : overrides.status,
    isActive: overrides.isActive === undefined ? true : overrides.isActive,
    images: overrides.images || [],
  });
};

const makeSeller = async (overrides = {}) => {
  const creds = await registerUser({
    name: overrides.name || "Seller Name",
    password: overrides.password || "Seller1234",
  });
  const user = await User.findById(creds.user._id);
  user.role = "SELLER";
  await user.save();

  const seller = await Seller.create({
    user: user._id,
    storeName: overrides.storeName || `Store ${unique()}`,
    storeDescription: overrides.storeDescription || "A well curated store with excellent customer service and genuine products.",
    phone: overrides.phone || "9876543210",
    address: overrides.address || "123 Test Street, Test City, 100001",
    kycDocuments: [
      {
        documentType: "PAN",
        documentNumber: `ABCDE${String(Math.floor(1000 + Math.random() * 9000))}F`,
        documentUrl: "https://example.com/doc.pdf",
      },
    ],
    status: overrides.status || "APPROVED",
    approvedAt: !overrides.status || overrides.status === "APPROVED" ? new Date() : null,
  });

  return { user, seller, sellerToken: creds.token, email: creds.email, password: creds.password };
};

const addAddress = async (token, overrides = {}) => {
  const res = await request(app)
    .post("/api/users/addresses")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: overrides.name || "Home",
      phone: overrides.phone || "9876543210",
      addressLine1: overrides.addressLine1 || "221 Test Lane",
      city: overrides.city || "Mumbai",
      state: overrides.state || "Maharashtra",
      postalCode: overrides.postalCode || "400001",
      country: "India",
    });
  return res;
};

const addToCart = async (token, productId, quantity = 1) => {
  return request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productId, quantity });
};

const placeCodOrder = async (token, addressId) => {
  return request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ addressId, paymentMethod: "COD" });
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// Install a stub Razorpay gateway (tests never hit the real network or move
// money). Tracks calls and echoes back an order id. `payments.fetch` returns
// the amount that was quoted when the order was created.
const installRazorpayMock = () => {
  const calls = { orders: [], payments: [], refunds: [] };
  const mock = {
    orders: {
      create: async (opts) => {
        calls.orders.push(opts);
        calls.lastAmountPaise = opts.amount;
        return { id: `order_mock_${Math.random().toString(36).slice(2, 10)}`, amount: opts.amount, currency: opts.currency };
      },
    },
    payments: {
      fetch: async (id) => {
        calls.payments.push(id);
        return { id, amount: calls.lastAmountPaise || 0, currency: "INR", status: "captured" };
      },
      refund: async (id) => {
        calls.refunds.push(id);
        return { id: `ref_${Math.random().toString(36).slice(2, 8)}` };
      },
    },
  };
  razorpayConfig.__setRazorpayInstance(mock);
  return { calls, mock };
};

const restoreRazorpay = () => {
  razorpayConfig.configure();
  if (!razorpayConfig.isConfigured()) {
    razorpayConfig.__setRazorpayInstance(null);
  }
};

// Razorpay's official HMAC signature for { orderId, paymentId } using the
// server secret. Only usable inside tests against the isolated test DB. The
// secret mirrors whatever .env holds (may be blank in CI); the check is
// consistent with what verifyPaymentSignature computes on the server.
const makePaymentSignature = (orderId, paymentId) =>
  crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "").update(`${orderId}|${paymentId}`).digest("hex");

module.exports = {
  app,
  request,
  setup,
  teardown,
  cleanup,
  unique,
  registerUser,
  login,
  makeCategory,
  makeProduct,
  makeSeller,
  addAddress,
  addToCart,
  placeCodOrder,
  authHeader,
  installRazorpayMock,
  restoreRazorpay,
  makePaymentSignature,
  User,
  Seller,
  Category,
  Product,
  Address,
  Cart,
  Order,
  Payment,
  Review,
  Wishlist,
  mongoose,
};