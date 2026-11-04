const express = require("express");
const {
  getDashboard,
  getAllUsers,
  getUserById,
  blockUser,
  unblockUser,
  getAllSellers,
  getSellerById,
  approveSeller,
  rejectSeller,
  suspendSeller,
  reactivateSeller,
  getAllProducts,
  approveProduct,
  rejectProduct,
  activateProduct,
  deactivateProduct,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  refundOrder,
  getAdminReturns,
  handleAdminReturn,
  getAllReviews,
  approveReview,
  deleteReview,
} = require("../controllers/adminController");
const {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const {
  adminGetWithdrawals,
  adminGetWithdrawal,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminPayWithdrawal,
} = require("../controllers/withdrawalController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const validate = require("../middleware/validate");
const { validateObjectIdParam } = require("../validators/orderValidator");
const { uploadSingle, handleUploadErrors } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles("ADMIN"));

const validateId = validateObjectIdParam("id");

// Dashboard
router.get("/dashboard", getDashboard);

// Users
router.get("/users", getAllUsers);
router.get("/users/:id", validateId, validate, getUserById);
router.patch("/users/:id/block", validateId, validate, blockUser);
router.patch("/users/:id/unblock", validateId, validate, unblockUser);

// Sellers
router.get("/sellers", getAllSellers);
router.get("/sellers/:id", validateId, validate, getSellerById);
router.patch("/sellers/:id/approve", validateId, validate, approveSeller);
router.patch("/sellers/:id/reject", validateId, validate, rejectSeller);
router.patch("/sellers/:id/suspend", validateId, validate, suspendSeller);
router.patch("/sellers/:id/reactivate", validateId, validate, reactivateSeller);

// Products
router.get("/products", getAllProducts);
router.patch("/products/:id/approve", validateId, validate, approveProduct);
router.patch("/products/:id/reject", validateId, validate, rejectProduct);
router.patch("/products/:id/activate", validateId, validate, activateProduct);
router.patch("/products/:id/deactivate", validateId, validate, deactivateProduct);

// Categories (admin)
router.get("/categories", getAdminCategories);
router.post("/categories", uploadSingle, handleUploadErrors, createCategory);
router.put("/categories/:id", uploadSingle, handleUploadErrors, updateCategory);
router.delete("/categories/:id", deleteCategory);

// Orders
router.get("/orders", getAllOrders);
router.get("/orders/:id", validateId, validate, getOrderById);
router.patch("/orders/:id/status", validateId, validate, updateOrderStatus);
router.patch("/orders/:id/refund", validateId, validate, refundOrder);
router.patch("/orders/:id/return", validateId, validate, handleAdminReturn);

// Returns (admin return management)
router.get("/returns", getAdminReturns);

// Withdrawals (admin)
router.get("/withdrawals", adminGetWithdrawals);
router.get("/withdrawals/:id", adminGetWithdrawal);
router.patch("/withdrawals/:id/approve", adminApproveWithdrawal);
router.patch("/withdrawals/:id/reject", adminRejectWithdrawal);
router.patch("/withdrawals/:id/pay", adminPayWithdrawal);

// Reviews
router.get("/reviews", getAllReviews);
router.patch("/reviews/:id/approve", validateId, validate, approveReview);
router.delete("/reviews/:id", validateId, validate, deleteReview);

module.exports = router;