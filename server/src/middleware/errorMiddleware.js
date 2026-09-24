const ApiError = require("../utils/ApiError");

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (error.name === "CastError") {
    error = new ApiError(400, `Invalid ${error.path || "ID"} format`);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "field";
    const value = error.keyValue ? error.keyValue[field] : "";
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists${
      value ? `: ${value}` : ""
    }`;
    error = new ApiError(409, message);
  }

  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    error = new ApiError(422, "Validation failed", messages);
  }

  if (error.name === "JsonWebTokenError") {
    error = new ApiError(401, "Not authorized, invalid token");
  }

  if (error.name === "TokenExpiredError") {
    error = new ApiError(401, "Not authorized, token expired");
  }

  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${error.stack || error.message}`);
  }

  const body = {
    success: false,
    message: error.message || "Server error",
  };

  if (error.errors && error.errors.length) {
    body.errors = error.errors;
  }

  return res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };