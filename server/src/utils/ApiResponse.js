class ApiResponse {
  constructor(statusCode, message, data) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    if (data !== undefined) this.data = data;
  }

  get body() {
    const body = { success: this.success, message: this.message };
    if (this.data !== undefined) body.data = this.data;
    return body;
  }
}

const sendResponse = (res, statusCode, message, data) => {
  return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
};

const sendError = (res, statusCode, message, errors = []) => {
  const body = { success: false, message };
  if (errors && errors.length) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { ApiResponse, sendResponse, sendError };