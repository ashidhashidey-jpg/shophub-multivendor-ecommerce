const User = require("../models/User");
const Seller = require("../models/Seller");
const Address = require("../models/Address");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");

const helpers = { User, Seller, Address, Cart, Wishlist, Order, Review, Product, Category, mongoose };

const validateMongoId = (id, label = "ID") => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }
};

module.exports = { helpers, validateMongoId };