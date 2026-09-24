const Category = require("../models/Category");
const Product = require("../models/Product");
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
  const { name, description, image, isActive } = req.body;

  const category = await Category.create({
    name,
    description,
    image,
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

  const { name, description, image, isActive } = req.body;
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (isActive !== undefined) category.isActive = isActive;

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