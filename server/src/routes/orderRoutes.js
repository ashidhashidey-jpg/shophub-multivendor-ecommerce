const express = require("express");
const {
  createOrder,
  getUserOrders,
  getUserOrder,
  cancelUserOrder,
  requestReturn,
} = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
  validateOrderId,
  validateCreateOrder,
} = require("../validators/orderValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.post("/", validateCreateOrder, validate, createOrder);
router.get("/", getUserOrders);
router.get("/:id", validateOrderId, validate, getUserOrder);
router.patch("/:id/cancel", validateOrderId, validate, cancelUserOrder);
router.patch("/:id/return", validateOrderId, validate, requestReturn);

module.exports = router;