const express = require("express");
const {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
} = require("../controllers/cartController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
  validateCartAdd,
  validateCartUpdate,
  validateObjectIdParam,
} = require("../validators/orderValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.get("/", getCart);
router.post("/items", validateCartAdd, validate, addItem);
router.put("/items/:productId", validateCartUpdate, validate, updateQuantity);
router.delete("/items/:productId", validateObjectIdParam("productId"), validate, removeItem);
router.delete("/", clearCart);

module.exports = router;