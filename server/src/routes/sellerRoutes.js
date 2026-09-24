const express = require("express");
const {
  registerSeller,
  getMySellerProfile,
  getSellerStatus,
  updateStore,
  updateKyc,
  getDashboard,
} = require("../controllers/sellerController");
const {
  getSellerOrders,
  getSellerOrder,
  updateSellerOrderItemStatus,
  handleSellerReturn,
  getSellerReturns,
} = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { loadSeller, requireApprovedSeller } = require("../middleware/sellerMiddleware");
const {
  validateSellerRegister,
  validateStoreUpdate,
  validateKycDocuments,
} = require("../validators/sellerValidator");
const { validateObjectIdParam } = require("../validators/orderValidator");
const validate = require("../middleware/validate");

const router = express.Router();

// Anyone (USER or SELLER) can create a seller application for their account.
router.post(
  "/register",
  authenticate,
  authorizeRoles("USER", "SELLER"),
  validateSellerRegister,
  validate,
  registerSeller
);

// Basic info / status: allowed for any authenticated user. The status
// controller handles the "no seller application yet" case (returns null)
// instead of failing, so opening the registration page never 404s.
router.get(
  "/status",
  authenticate,
  authorizeRoles("USER", "SELLER"),
  getSellerStatus
);
router.get(
  "/profile",
  authenticate,
  authorizeRoles("USER", "SELLER"),
  loadSeller,
  getMySellerProfile
);

// Applicants (including PENDING/REJECTED) can update their KYC documents.
router.put(
  "/kyc",
  authenticate,
  authorizeRoles("USER", "SELLER"),
  loadSeller,
  validateKycDocuments,
  validate,
  updateKyc
);

// The following require an APPROVED seller.
router.use(authenticate, authorizeRoles("SELLER"), loadSeller, requireApprovedSeller);

router.get("/dashboard", getDashboard);
router.put("/store", validateStoreUpdate, validate, updateStore);

router.get("/orders", getSellerOrders);
router.get("/orders/:id", validateObjectIdParam("id"), validate, getSellerOrder);
router.patch("/orders/:id/status", validateObjectIdParam("id"), validate, updateSellerOrderItemStatus);
router.patch("/orders/:id/return", validateObjectIdParam("id"), validate, handleSellerReturn);
router.get("/returns", getSellerReturns);

module.exports = router;