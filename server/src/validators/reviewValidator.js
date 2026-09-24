const { body } = require("express-validator");

const validateCreateReview = [
  body("rating")
    .notEmpty().withMessage("Rating is required")
    .isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Comment cannot exceed 1000 characters"),
];

module.exports = { validateCreateReview };