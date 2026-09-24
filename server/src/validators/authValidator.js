const { body } = require("express-validator");

const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^[+]?[\d\s-]{7,15}$/).withMessage("Please provide a valid phone number"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/.*[A-Za-z].*/).withMessage("Password must contain a letter")
    .matches(/.*[0-9].*/).withMessage("Password must contain a number"),
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please provide a valid email"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

const validateUpdateProfile = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("Please provide a valid email")
    .normalizeEmail(),
  body("phone")
    .optional({ checkFalsy: true })
    .matches(/^[+]?[\d\s-]{7,15}$/).withMessage("Please provide a valid phone number"),
];

const validateChangePassword = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),
  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
};