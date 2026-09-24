const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));

    // Invalid ID/category format errors are client errors -> 400.
    const hasInvalidId = formatted.some((f) => /^Invalid /.test(f.message));
    const statusCode = hasInvalidId ? 400 : 422;

    return next(new ApiError(statusCode, "Validation failed", formatted));
  }
  next();
};

module.exports = validate;