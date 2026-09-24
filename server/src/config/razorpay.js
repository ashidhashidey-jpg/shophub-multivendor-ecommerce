const Razorpay = require("razorpay");

let instance = null;

const configure = () => {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("Razorpay configured");
  } else {
    console.warn(
      "Razorpay credentials not configured. Payment endpoints will return a clear configuration error (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)."
    );
  }
};

const isConfigured = () => instance !== null;

const getRazorpay = () => {
  if (!instance) {
    const error = new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the environment."
    );
    error.statusCode = 503;
    error.isOperational = true;
    throw error;
  }
  return instance;
};

// Test-only hook: lets isolated test suites swap in a stub gateway without
// touching credentials. Production code never calls this.
const __setRazorpayInstance = (fake) => {
  instance = fake;
};

module.exports = { configure, isConfigured, getRazorpay, __setRazorpayInstance };