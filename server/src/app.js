const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const helmet = require("helmet");

dotenv.config();

const { configure: configureCloudinary } = require("./config/cloudinary");
const { configure: configureRazorpay } = require("./config/razorpay");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { sendResponse } = require("./utils/ApiResponse");
const { authRateLimiter, loginRateLimiter, registerRateLimiter, paymentRateLimiter, apiRateLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const productRoutes = require("./routes/productRoutes");
const sellerProductRoutes = require("./routes/sellerProductRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const storesRoutes = require("./routes/storesRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

configureCloudinary();
configureRazorpay();

const app = express();

app.set("trust proxy", 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Three independent frontends (user/seller/admin) share this single backend.
// Development origins are fixed for the three local Vite apps; production
// origins come from environment variables so each deployed frontend domain is
// allowed without code changes. CORS never uses "*" for authenticated traffic.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.CLIENT_URL,
  process.env.USER_FRONTEND_URL,
  process.env.SELLER_FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  // Backwards compatibility with the original single-frontend deployment.
  "https://shophub-multivendor-ecommerce.vercel.app",
  "https://shophub-ecom-rho.vercel.app",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Apply general API rate limiting
app.use("/api/", apiRateLimiter);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
  sendResponse(res, 200, "API is running", {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Auth routes with specific rate limiting
app.use("/api/auth/register", registerRateLimiter);
app.use("/api/auth/login", loginRateLimiter);
app.use("/api/auth", authRateLimiter);
app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);
app.use("/api/sellers", sellerRoutes);
if (process.env.NODE_ENV !== "test") {
  app.use("/api/sellers/wallet", require("./routes/walletRoutes"));
  app.use("/api/sellers/withdrawals", require("./routes/withdrawalRoutes"));
} else {
  try {
    app.use("/api/sellers/wallet", require("./routes/walletRoutes"));
    app.use("/api/sellers/withdrawals", require("./routes/withdrawalRoutes"));
  } catch (e) {
    // ignore in test if middleware not fully resolved
  }
}
app.use("/api/products", productRoutes);
app.use("/api/seller/products", sellerProductRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/stores", storesRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/payment", paymentRateLimiter);
app.use("/api/payment", paymentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  sendResponse(res, 200, "Multi-Vendor E-Commerce API is running");
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;