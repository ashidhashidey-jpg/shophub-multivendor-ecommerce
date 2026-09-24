const express = require("express");
const {
  uploadImage,
  uploadImages,
  uploadDocument,
} = require("../controllers/uploadController");
const { authenticate } = require("../middleware/authMiddleware");
const {
  uploadSingle,
  uploadImages: uploadImageArray,
  uploadDocument: uploadDocumentSingle,
  handleUploadErrors,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/image", authenticate, uploadSingle, handleUploadErrors, uploadImage);
router.post("/images", authenticate, uploadImageArray, handleUploadErrors, uploadImages);
router.post("/document", authenticate, uploadDocumentSingle, handleUploadErrors, uploadDocument);

module.exports = router;