const Category = require("../models/Category");
const Product = require("../models/Product");
const { uploadBuffer, deleteByUrl, isConfigured } = require("../config/cloudinary");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");

// GET /api/categories
const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  sendResponse(res, 200, "Categories retrieved", { categories });
});

// GET /api/admin/categories
const getAdminCategories = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  const categories = await Category.find(filter).sort({ name: 1 });
  sendResponse(res, 200, "Categories retrieved", { categories });
});

// POST /api/admin/categories
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;

  let imageUrl = "";
  if (req.file && isConfigured()) {
    imageUrl = await uploadBuffer(req.file.buffer, {
      folder: "multivendor/categories",
      resourceType: req.file.mimetype.startsWith("image") ? "image" : "auto",
    });
  }

  const category = await Category.create({
    name,
    description,
    image: imageUrl,
    isActive: isActive === undefined ? true : isActive,
  });

  sendResponse(res, 201, "Category created", { category });
});

// PUT /api/admin/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const { name, description, isActive, removeImage } = req.body;

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (isActive !== undefined) category.isActive = isActive;

  // Handle image removal
  if (removeImage === "true" && category.image) {
    await deleteByUrl(category.image);
    category.image = "";
  }

  // Handle image upload/replacement
  if (req.file && isConfigured()) {
    if (category.image) {
      await deleteByUrl(category.image);
    }
    category.image = await uploadBuffer(req.file.buffer, {
      folder: "multivendor/categories",
      resourceType: req.file.mimetype.startsWith("image") ? "image" : "auto",
    });
  }

  await category.save();
  sendResponse(res, 200, "Category updated", { category });
});

// DELETE /api/admin/categories/:id
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw new ApiError(400, `Cannot delete category with ${productCount} product(s). Deactivate it instead.`);
  }

  // Delete associated image from Cloudinary
  if (category.image) {
    await deleteByUrl(category.image);
  }

  await category.deleteOne();
  sendResponse(res, 200, "Category deleted", {});
});

module.exports = {
  getPublicCategories,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};