const Seller = require("../models/Seller");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const loadSeller = asyncHandler(async (req, res, next) => {
  const seller = await Seller.findOne({ user: req.user._id });

  if (!seller) {
    throw new ApiError(404, "Seller profile not found");
  }

  req.seller = seller;
  next();
});

const requireApprovedSeller = (req, res, next) => {
  if (!req.seller) {
    return next(new ApiError(404, "Seller profile not found"));
  }

  if (req.seller.status !== "APPROVED") {
    return next(
      new ApiError(
        403,
        `Your seller account is ${req.seller.status}. Only APPROVED sellers can access this feature.`
      )
    );
  }
  next();
};

module.exports = { loadSeller, requireApprovedSeller };