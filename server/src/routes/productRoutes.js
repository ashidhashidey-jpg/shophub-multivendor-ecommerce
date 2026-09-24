const express = require("express");
const {
  getPublicProducts,
  getPublicProduct,
} = require("../controllers/productController");
const {
  createReview,
  getProductReviews,
  getReviewEligibility,
} = require("../controllers/reviewController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
  validateProductId,
} = require("../validators/productValidator");
const { validateCreateReview } = require("../validators/reviewValidator");

const router = express.Router();

router.get("/", getPublicProducts);
router.get("/:id", validateProductId, validate, getPublicProduct);

// Reviews on a product
router.get("/:productId/reviews", validateProductId, validate, getProductReviews);
router.get(
  "/:productId/reviews/eligibility",
  authenticate,
  authorizeRoles("USER"),
  validateProductId,
  validate,
  getReviewEligibility
);
router.post(
  "/:productId/reviews",
  authenticate,
  authorizeRoles("USER"),
  validateProductId,
  validateCreateReview,
  validate,
  createReview
);

module.exports = router;