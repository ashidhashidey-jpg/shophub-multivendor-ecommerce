const { uploadBuffer, isConfigured, deleteByUrl } = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

const dataUrlToBuffer = (req) => {
  if (req.file && req.file.buffer) {
    return { buffer: req.file.buffer, mimeType: req.file.mimetype };
  }
  if (req.body && req.body.file) {
    const m = /^data:(.*?);base64,(.*)$/.exec(req.body.file);
    if (m) {
      return { buffer: Buffer.from(m[2], "base64"), mimeType: m[1] };
    }
  }
  throw new ApiError(400, "No file found. Use multipart field 'file' or base64 'file'");
};

// POST /api/uploads/image
const uploadImage = asyncHandler(async (req, res) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Image uploads are disabled. Configure Cloudinary first.");
  }

  const { buffer, mimeType } = dataUrlToBuffer(req);
  const folder = req.body.folder === "seller-kyc" ? "multivendor/kyc" : "multivendor/products";

  const url = await uploadBuffer(buffer, { folder, resourceType: mimeType.startsWith("image") ? "image" : "auto" });

  sendResponse(res, 200, "File uploaded successfully", { url });
});

// POST /api/uploads/images
const uploadImages = asyncHandler(async (req, res) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Image uploads are disabled. Configure Cloudinary first.");
  }

  const files = req.files || [];
  if (files.length === 0) {
    throw new ApiError(400, "No images found");
  }

  const urls = [];
  for (const file of files) {
    const url = await uploadBuffer(file.buffer, {
      folder: "multivendor/products",
      resourceType: file.mimetype.startsWith("image") ? "image" : "auto",
    });
    urls.push(url);
  }

  sendResponse(res, 200, "Images uploaded successfully", { urls });
});

// POST /api/uploads/document
const uploadDocument = asyncHandler(async (req, res) => {
  if (!isConfigured()) {
    throw new ApiError(503, "Document uploads are disabled. Configure Cloudinary first.");
  }

  const { buffer, mimeType } = dataUrlToBuffer(req);
  const url = await uploadBuffer(buffer, {
    folder: "multivendor/kyc",
    resourceType: mimeType === "application/pdf" ? "raw" : "image",
  });

  sendResponse(res, 200, "Document uploaded successfully", { url });
});

module.exports = { uploadImage, uploadImages, uploadDocument, deleteByUrl };