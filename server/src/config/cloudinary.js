const cloudinary = require("cloudinary").v2;
const path = require("path");

let configured = false;

const configure = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    configured = true;
    console.log("Cloudinary configured");
  } else {
    console.warn(
      "Cloudinary credentials not configured. Uploads will be disabled (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)."
    );
  }
};

const isConfigured = () => configured;

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {Object} options { folder, publicId, resourceType }
 * @returns {Promise<string>} secure URL
 */
const uploadBuffer = async (buffer, options = {}) => {
  if (!configured) {
    const error = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
    error.statusCode = 503;
    throw error;
  }

  const folder = options.folder || "multivendor";
  const resourceType = options.resourceType || "auto";
  const publicId = options.publicId;

  return new Promise((resolve, reject) => {
    const uploadOptions = { folder, resource_type: resourceType };
    if (publicId) uploadOptions.public_id = publicId;

    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
};

const deleteByUrl = async (secureUrl) => {
  if (!configured || !secureUrl) return;
  const parts = secureUrl.split("/");
  const publicId = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // best effort
  }
};

module.exports = { configure, isConfigured, uploadBuffer, deleteByUrl, cloudinary };