const express = require("express");
const {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
} = require("../validators/authValidator");
const validate = require("../middleware/validate");

const router = express.Router();

router.post("/register", validateRegister, validate, register);
router.post("/login", validateLogin, validate, login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);
router.put("/profile", authenticate, validateUpdateProfile, validate, updateProfile);
router.put("/change-password", authenticate, validateChangePassword, validate, changePassword);

module.exports = router;