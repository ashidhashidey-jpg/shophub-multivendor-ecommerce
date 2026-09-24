const express = require("express");
const { getCheckoutSummary } = require("../controllers/checkoutController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER"));

router.get("/summary", getCheckoutSummary);

module.exports = router;