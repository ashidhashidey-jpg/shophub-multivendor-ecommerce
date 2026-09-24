const express = require("express");
const { getPublicCategories } = require("../controllers/categoryController");

const router = express.Router();

router.get("/", getPublicCategories);

module.exports = router;