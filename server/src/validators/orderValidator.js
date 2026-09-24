const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const validateOrderId = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid order ID");
    }
    return true;
  }),
];

const validateCreateOrder = [
  body("addressId")
    .notEmpty().withMessage("Address ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid address ID"),
  body("paymentMethod")
    .notEmpty().withMessage("Payment method is required")
    .isIn(["RAZORPAY", "COD"]).withMessage("Payment method must be RAZORPAY or COD"),
];

const validateCartAdd = [
  body("productId")
    .notEmpty().withMessage("Product ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid product ID"),
  body("quantity")
    .optional()
    .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const validateCartUpdate = [
  param("productId")
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid product ID"),
  body("quantity")
    .notEmpty().withMessage("Quantity is required")
    .isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];

const validateObjectIdParam = (name) => [
  param(name).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error(`Invalid ${name}`);
    }
    return true;
  }),
];

module.exports = {
  validateOrderId,
  validateCreateOrder,
  validateCartAdd,
  validateCartUpdate,
  validateObjectIdParam,
};