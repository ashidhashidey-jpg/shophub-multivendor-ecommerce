const { body } = require("express-validator");
const mongoose = require("mongoose");

const validateCreatePaymentOrder = [
  body("addressId")
    .notEmpty().withMessage("Address ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid address ID"),
];

const validateVerifyPayment = [
  body("razorpayOrderId")
    .notEmpty().withMessage("Razorpay order ID is required"),
  body("razorpayPaymentId")
    .notEmpty().withMessage("Razorpay payment ID is required"),
  body("razorpaySignature")
    .notEmpty().withMessage("Razorpay signature is required"),
];

module.exports = { validateCreatePaymentOrder, validateVerifyPayment };