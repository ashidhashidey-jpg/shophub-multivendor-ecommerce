const express = require("express");
const {
  createProduct,
  getMyProducts,
  getMyProduct,
  updateMyProduct,
  deleteMyProduct,
} = require("../controllers/productController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { loadSeller, requireApprovedSeller } = require("../middleware/sellerMiddleware");
const validate = require("../middleware/validate");
const {
  validateCreateProduct,
  validateUpdateProduct,
} = require("../validators/productValidator");

const router = express.Router();

// All seller product routes require an APPROVED seller.
router.use(authenticate, authorizeRoles("SELLER"), loadSeller, requireApprovedSeller);

router.post("/", validateCreateProduct, validate, createProduct);
router.get("/", getMyProducts);
router.get("/:id", validateUpdateProduct, validate, getMyProduct);
router.put("/:id", validateUpdateProduct, validate, updateMyProduct);
router.delete("/:id", validateUpdateProduct, validate, deleteMyProduct);

module.exports = router;