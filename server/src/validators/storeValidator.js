const { param } = require("express-validator");
const mongoose = require("mongoose");

const validateStoreId = [
  param("id").custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error("Invalid store ID");
    }
    return true;
  }),
];

module.exports = { validateStoreId };