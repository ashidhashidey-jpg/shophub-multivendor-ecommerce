const multer = require("multer");
const ApiError = require("../utils/ApiError");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Only JPEG, PNG, WEBP, GIF, or PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const uploadSingle = upload.single("file");
const uploadImages = upload.array("images", 8);
const uploadDocument = upload.single("document");

const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "File too large. Maximum size is 5MB."));
    }
    return next(new ApiError(400, `Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = { uploadSingle, uploadImages, uploadDocument, handleUploadErrors };