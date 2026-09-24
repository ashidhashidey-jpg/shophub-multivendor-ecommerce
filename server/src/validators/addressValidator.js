const { body } = require("express-validator");

const requiredAddressChecks = {
  name: body("name").trim().notEmpty().withMessage("Recipient name is required"),
  phone: body("phone").trim().notEmpty().withMessage("Recipient phone is required"),
  addressLine1: body("addressLine1").trim().notEmpty().withMessage("Address line 1 is required"),
  city: body("city").trim().notEmpty().withMessage("City is required"),
  state: body("state").trim().notEmpty().withMessage("State is required"),
  postalCode: body("postalCode").trim().notEmpty().withMessage("Postal code is required"),
};

const validateCreateAddress = [
  ...Object.values(requiredAddressChecks),
  body("addressLine2").optional({ checkFalsy: false }).trim(),
  body("country").optional().trim(),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be a boolean"),
];

const validateUpdateAddress = [
  body("name").optional().trim().notEmpty().withMessage("Recipient name cannot be empty"),
  body("phone").optional().trim().notEmpty().withMessage("Recipient phone cannot be empty"),
  body("addressLine1").optional().trim().notEmpty().withMessage("Address line 1 cannot be empty"),
  body("addressLine2").optional().trim(),
  body("city").optional().trim().notEmpty().withMessage("City cannot be empty"),
  body("state").optional().trim().notEmpty().withMessage("State cannot be empty"),
  body("postalCode").optional().trim().notEmpty().withMessage("Postal code cannot be empty"),
  body("country").optional().trim(),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be a boolean"),
];

module.exports = { validateCreateAddress, validateUpdateAddress };