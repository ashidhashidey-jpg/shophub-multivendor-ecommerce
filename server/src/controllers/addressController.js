const Address = require("../models/Address");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { sendResponse } = require("../utils/ApiResponse");

const ADDRESS_FIELDS = [
  "name",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "isDefault",
];

const pickAddressFields = (body) => {
  const out = {};
  for (const key of ADDRESS_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};

// GET /api/users/addresses
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  sendResponse(res, 200, "Addresses retrieved", { addresses });
});

const unsetOtherDefaults = async (userId, exceptId, session) => {
  await Address.updateMany(
    { user: userId, _id: { $ne: exceptId }, isDefault: true },
    { $set: { isDefault: false } },
    session ? { session } : {}
  );
};

// POST /api/users/addresses
const createAddress = asyncHandler(async (req, res) => {
  const data = pickAddressFields(req.body);

  const count = await Address.countDocuments({ user: req.user._id });
  const makeDefault = data.isDefault === true || count === 0;

  if (makeDefault) {
    await unsetOtherDefaults(req.user._id, null);
  }

  const address = await Address.create({
    user: req.user._id,
    ...data,
    country: data.country || "India",
    isDefault: makeDefault,
  });

  sendResponse(res, 201, "Address created", { address });
});

// PUT /api/users/addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const data = pickAddressFields(req.body);

  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    data,
    { returnDocument: "after", runValidators: true }
  );

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  if (data.isDefault === true) {
    await unsetOtherDefaults(req.user._id, address._id);
    address.isDefault = true;
    await address.save();
  }

  sendResponse(res, 200, "Address updated", { address });
});

// DELETE /api/users/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  if (address.isDefault) {
    const next = await Address.findOne({ user: req.user._id });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  sendResponse(res, 200, "Address deleted", {});
});

// PATCH /api/users/addresses/:id/default
const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  await unsetOtherDefaults(req.user._id, address._id);
  address.isDefault = true;
  await address.save();

  sendResponse(res, 200, "Default address updated", { address });
});

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress };