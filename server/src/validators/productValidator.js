const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const validateObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error("Invalid product ID");
  }
  return true;
};

const validateProductId = [
  param("id").optional({ values: "falsy" }).custom(validateObjectId),
  param("productId").optional({ values: "falsy" }).custom(validateObjectId),
];

const validateCreateProduct = [
  body("name")
    .trim()
    .notEmpty().withMessage("Product name is required")
    .isLength({ min: 3 }).withMessage("Product name must be at least 3 characters"),
  body("description")
    .trim()
    .notEmpty().withMessage("Product description is required")
    .isLength({ min: 10 }).withMessage("Product description must be at least 10 characters"),
  body("category")
    .notEmpty().withMessage("Category is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid category ID"),
  body("price")
    .notEmpty().withMessage("Price is required")
    .isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),
  body("stock")
    .notEmpty().withMessage("Stock is required")
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("images")
    .optional()
    .isArray().withMessage("Images must be an array")
    .custom((arr) => arr.length <= 8).withMessage("A product can have at most 8 images"),
  body("images.*")
    .optional()
    .isString().withMessage("Image URL must be a string")
    .isURL().withMessage("Each image must be a valid URL"),
];

const validateUpdateProduct = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid product ID");
    }
    return true;
  }),
  body("name")
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage("Product name must be at least 3 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage("Product description must be at least 10 characters"),
  body("category")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value)).withMessage("Invalid category ID"),
  body("price")
    .optional()
    .isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  body("discount")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Discount must be between 0 and 100"),
  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  body("images")
    .optional()
    .isArray().withMessage("Images must be an array")
    .custom((arr) => arr.length <= 8).withMessage("A product can have at most 8 images"),
  body("images.*")
    .optional()
    .isString().withMessage("Image URL must be a string")
    .isURL().withMessage("Each image must be a valid URL"),
];

module.exports = {
  validateProductId,
  validateCreateProduct,
  validateUpdateProduct,
};