const express = require("express");
const {
  getProfile,
  updateProfile,
  changePassword,
} = require("../controllers/userController");
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/addressController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const {
  validateUpdateProfile,
  validateChangePassword,
} = require("../validators/authValidator");
const { validateObjectIdParam } = require("../validators/orderValidator");
const {
  validateCreateAddress,
  validateUpdateAddress,
} = require("../validators/addressValidator");

const router = express.Router();

router.use(authenticate, authorizeRoles("USER", "SELLER", "ADMIN"));

router.get("/profile", getProfile);
router.put("/profile", validateUpdateProfile, validate, updateProfile);
router.put("/change-password", validateChangePassword, validate, changePassword);

// Addresses
router.get("/addresses", getAddresses);
router.post("/addresses", validateCreateAddress, validate, createAddress);
router.put("/addresses/:id", validateObjectIdParam("id"), validateUpdateAddress, validate, updateAddress);
router.delete("/addresses/:id", validateObjectIdParam("id"), validate, deleteAddress);
router.patch("/addresses/:id/default", validateObjectIdParam("id"), validate, setDefaultAddress);

module.exports = router;