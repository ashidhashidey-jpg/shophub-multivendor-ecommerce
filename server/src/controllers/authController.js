const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");
const { generateToken } = require("../utils/token");
const emailService = require("../services/emailService");

const filterUser = (user) => user.toSafeObject();

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const user = await User.create({ name, email: email.toLowerCase(), phone, password });

  const token = generateToken(user);

  sendResponse(res, 201, "Registration successful", {
    token,
    user: filterUser(user),
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isBlocked) {
    throw new ApiError(403, "Your account has been blocked");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token = generateToken(user);

  sendResponse(res, 200, "Login successful", {
    token,
    user: filterUser(user),
  });
});

// POST /api/auth/logout (stateless JWT)
const logout = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Logged out successfully");
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "Profile retrieved", { user: req.user });
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  const user = await User.findById(req.user._id);

  if (email && email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }
    user.email = email.toLowerCase();
  }
  if (name) {
    user.name = name;
  }
  if (phone !== undefined) {
    if (phone && !/^[+]?[\d\s-]{7,15}$/.test(phone)) {
      throw new ApiError(422, "Please provide a valid phone number");
    }
    user.phone = phone;
  }

  await user.save();

  sendResponse(res, 200, "Profile updated successfully", { user: user.toSafeObject() });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, 200, "Password changed successfully");
});

module.exports = { register, login, logout, getMe, updateProfile, changePassword };