const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { uploadSingle, handleUploadErrors } = require("../middleware/uploadMiddleware");
const {
  getPublicCategories,
} = require("../controllers/categoryController");
const {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

// Public endpoint
router.get("/", getPublicCategories);

module.exports = router;