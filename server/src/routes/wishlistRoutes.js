const express = require("express");
const {
  getWishlist,
  addProduct,
  removeProduct,
} = require("../controllers/wishlistController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const { validateObjectIdParam } = require("../validators/orderValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.get("/", getWishlist);
router.post("/:productId", validateObjectIdParam("productId"), validate, addProduct);
router.delete("/:productId", validateObjectIdParam("productId"), validate, removeProduct);

module.exports = router;