const rateLimit = require("express-rate-limit");
const ApiError = require("../utils/ApiError");
const { ipKeyGenerator } = require("express-rate-limit");

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = "Too many requests from this IP, please try again later.",
    statusCode = 429,
    standardHeaders = true,
    legacyHeaders = false,
    keyGenerator = ipKeyGenerator,
    skip = () => process.env.NODE_ENV === "test",
    handler = (req, res, next) => {
      next(new ApiError(statusCode, message));
    },
  } = options;

  return rateLimit({
    windowMs,
    max,
    message,
    statusCode,
    standardHeaders,
    legacyHeaders,
    keyGenerator,
    skip,
    handler,
  });
};

// Auth-specific rate limiters
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes per IP
  message: "Too many login attempts. Please try again after 15 minutes.",
});

const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: "Too many registration attempts. Please try again after an hour.",
});

const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 payment attempts per hour per IP
  message: "Too many payment attempts. Please try again after an hour.",
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes per IP
  message: "Too many requests. Please try again later.",
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  paymentRateLimiter,
  apiRateLimiter,
};