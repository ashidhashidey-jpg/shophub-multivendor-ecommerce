const { body } = require("express-validator");

const KYC_TYPES = ["PASSPORT", "DRIVING_LICENSE", "AADHAAR", "PAN", "OTHER"];

// Format checks follow the standard Indian document numbering schemes.
const DOCUMENT_PATTERNS = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  AADHAAR: /^\d{12}$/,
  PASSPORT: /^[A-PR-WY][0-9]{7}$/,
  DRIVING_LICENSE: /^[A-Z]{2}[0-9]{2}[0-9]{4,11}$/,
  OTHER: /^.{3,}$/,
};

// Wildcard chains report their `path` (e.g. "kycDocuments.0.documentNumber")
// so the 422 response identifies the exact failing field.
const kycIndex = (path) => Number((String(path || "").match(/\d+/) || [0])[0]);

const validateKycDocuments = [
  body("kycDocuments")
    .isArray({ min: 1 })
    .withMessage("At least one KYC document is required"),
  body("kycDocuments")
    .custom((docs) => {
      if (docs.length > 5) {
        throw new Error("Maximum 5 KYC documents allowed");
      }
      if (docs.some((d) => !d || typeof d !== "object" || Array.isArray(d))) {
        throw new Error("Each KYC document must be an object");
      }
      return true;
    }),
  body("kycDocuments.*.documentType")
    .custom((type, { path }) => {
      const n = kycIndex(path) + 1;
      if (!KYC_TYPES.includes(type)) {
        throw new Error(`KYC document #${n} has an invalid documentType`);
      }
      return true;
    }),
  body("kycDocuments.*.documentNumber")
    .custom((num, { req, path }) => {
      const n = kycIndex(path) + 1;
      const value = String(num || "").trim();
      if (!value) {
        throw new Error(`KYC document #${n} requires a documentNumber`);
      }
      const docs = req.body.kycDocuments || [];
      const type = docs[kycIndex(path)]?.documentType;
      const pattern = DOCUMENT_PATTERNS[type];
      if (pattern && !pattern.test(value.toUpperCase())) {
        throw new Error(`KYC document #${n} has an invalid ${type} document number`);
      }
      return true;
    }),
  body("kycDocuments.*.documentUrl")
    .custom((url, { path }) => {
      const n = kycIndex(path) + 1;
      if (!url || !String(url).trim()) {
        throw new Error(`KYC document #${n} requires a valid documentUrl`);
      }
      return true;
    }),
];

const validateSellerRegister = [
  ...validateKycDocuments,
  body("storeName")
    .trim()
    .notEmpty().withMessage("Store name is required")
    .isLength({ min: 3 }).withMessage("Store name must be at least 3 characters"),
  body("storeDescription")
    .trim()
    .notEmpty().withMessage("Store description is required")
    .isLength({ min: 10 }).withMessage("Store description must be at least 10 characters"),
  body("phone")
    .trim()
    .notEmpty().withMessage("Contact phone is required")
    .matches(/^[+]?[\d\s-]{7,15}$/).withMessage("Please provide a valid phone number"),
  body("address")
    .trim()
    .notEmpty().withMessage("Store address is required"),
];

const validateStoreUpdate = [
  body("storeName")
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage("Store name must be at least 3 characters"),
  body("storeDescription")
    .optional()
    .trim()
    .isLength({ min: 10 }).withMessage("Store description must be at least 10 characters"),
  body("phone")
    .optional()
    .trim()
    .matches(/^[+]?[\d\s-]{7,15}$/).withMessage("Please provide a valid phone number"),
  body("address")
    .optional()
    .trim()
    .notEmpty().withMessage("Store address is required"),
];

module.exports = { validateSellerRegister, validateStoreUpdate, validateKycDocuments };