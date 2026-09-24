const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
} = require("../controllers/paymentController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
  validateCreatePaymentOrder,
  validateVerifyPayment,
} = require("../validators/paymentValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.post("/create-order", validateCreatePaymentOrder, validate, createPaymentOrder);
router.post("/verify", validateVerifyPayment, validate, verifyPayment);

module.exports = router;