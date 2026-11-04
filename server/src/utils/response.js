const ApiError = require('./ApiError')

function sendResponse(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

function createError(statusCode, message, errors = []) {
  return new ApiError(statusCode, message, errors)
}

module.exports = { sendResponse, createError }
