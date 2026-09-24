const express = require("express");
const {
  getMyReviews,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const { validateObjectIdParam } = require("../validators/orderValidator");
const { validateCreateReview } = require("../validators/reviewValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.get("/mine", getMyReviews);
router.put("/:id", validateObjectIdParam("id"), validateCreateReview, validate, updateReview);
router.delete("/:id", validateObjectIdParam("id"), validate, deleteReview);

module.exports = router;