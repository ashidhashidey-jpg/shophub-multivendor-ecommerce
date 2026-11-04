const express = require("express");
const {
  getPublicStores,
  getPublicStore,
} = require("../controllers/storeController");
const validate = require("../middleware/validate");
const { validateStoreId } = require("../validators/storeValidator");

const router = express.Router();

router.get("/", getPublicStores);
router.get("/:id", validateStoreId, validate, getPublicStore);

module.exports = router;