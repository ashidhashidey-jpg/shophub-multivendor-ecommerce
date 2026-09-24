const mongoose = require("mongoose");

const kycDocumentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["PASSPORT", "DRIVING_LICENSE", "AADHAAR", "PAN", "OTHER"],
      default: "OTHER",
      trim: true,
    },
    documentNumber: {
      type: String,
      trim: true,
    },
    documentUrl: {
      type: String,
      required: [true, "Document URL is required"],
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const sellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      minlength: [3, "Store name must be at least 3 characters"],
    },
    storeDescription: {
      type: String,
      required: [true, "Store description is required"],
      trim: true,
      minlength: [10, "Store description must be at least 10 characters"],
    },
    phone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Store address is required"],
      trim: true,
    },
    kycDocuments: {
      type: [kycDocumentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedReason: {
      type: String,
      trim: true,
    },
    suspendedReason: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seller", sellerSchema);