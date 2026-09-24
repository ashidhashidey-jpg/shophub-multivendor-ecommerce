/**
 * Controlled initial Admin setup
 * --------------------------------
 *   npm run create-admin
 *
 * Interactively asks for the Admin name, email and password, validates the
 * input against the project's existing rules, reuses the existing User model
 * (with its bcrypt pre-save hashing), and creates one ADMIN user in MongoDB.
 *
 * Safety guarantees:
 *   - Never runs automatically at server startup.
 *   - Never drops the database or deletes any existing data.
 *   - Rejects creation if ANY admin already exists.
 *   - Rejects an email that is already registered to any user.
 *   - The password is hashed by the User model (bcrypt) and is never printed.
 */
const dotenv = require("dotenv");
dotenv.config();

const readline = require("readline");
const User = require("../models/User");
const { connectDB, disconnectDB } = require("../config/db");

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Mirrors src/validators/authValidator.js password rules.
const isStrongPassword = (password) =>
  typeof password === "string" &&
  password.length >= 6 &&
  /[A-Za-z]/.test(password) &&
  /[0-9]/.test(password);

/**
 * Validates the admin input against the project's existing rules.
 * Throws an Error listing every failing rule.
 */
function validateInput({ name, email, password }) {
  const errors = [];

  if (typeof name !== "string" || !name.trim() || name.trim().length < 2) {
    errors.push("Name is required and must be at least 2 characters");
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    errors.push("Please provide a valid email");
  }

  if (!isStrongPassword(password)) {
    errors.push("Password must be at least 6 characters and contain a letter and a number");
  }

  if (errors.length) {
    const error = new Error(errors.join("; "));
    error.validationErrors = errors;
    throw error;
  }
}

/**
 * Creates a single ADMIN user. Reuses the existing User model so bcrypt
 * hashing, email uniqueness and role storage are handled by the same code the
 * rest of the app uses. Requires an open mongoose connection.
 *
 * @returns {Promise<{ user: import("mongoose").HydratedDocument }>}
 */
async function createAdminUser({ name, email, password }) {
  validateInput({ name, email, password });

  const adminCount = await User.countDocuments({ role: "ADMIN" });
  if (adminCount > 0) {
    throw new Error("An admin account already exists. No duplicate admin was created.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error("A user with this email already exists. Choose a different email.");
  }

  const admin = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: "ADMIN",
  });

  return { user: admin.toSafeObject() };
}

function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function promptHidden(rl, question) {
  return new Promise((resolve) => {
    let masking = true;
    const original = rl._writeToOutput.bind(rl);
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (!masking || stringToWrite.startsWith(question)) {
        return original(stringToWrite);
      }
      return rl.output.write(stringToWrite.replace(/[^\n]/g, "*"));
    };
    rl.question(question, (answer) => {
      rl._writeToOutput = original;
      rl.output.write("\n");
      resolve(answer.trim());
    });
  });
}

async function runCLI() {
  let name, email, password, confirm;

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    name = await prompt(rl, "Admin name: ");
    email = await prompt(rl, "Admin email: ");
    password = await promptHidden(rl, "Admin password (input is hidden): ");
    confirm = await promptHidden(rl, "Confirm admin password (input is hidden): ");
  } else {
    const rl = readline.createInterface({ input: process.stdin });
    const lines = [];
    for await (const line of rl) lines.push(line.trim());
    if (lines.length < 4) {
      throw new Error("Expected name, email, password and confirmation on stdin (one per line). No admin was created.");
    }
    [name, email, password, confirm] = lines;
  }

  if (password !== confirm) {
    throw new Error("Passwords do not match. No admin was created.");
  }

  await connectDB();
  try {
    const { user } = await createAdminUser({ name, email, password });
    console.log(`\nAdmin account created successfully:`);
    console.log(`  Name:  ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role:  ${user.role}`);
    console.log(`\nSign in with this email and password at /login — the existing login flow will grant ADMIN access.`);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  runCLI()
    .then(() => process.exit(0))
    .catch((error) => {
      const tests = error.validationErrors;
      console.error(tests ? `\nValidation failed:\n  - ${tests.join("\n  - ")}` : `\nError: ${error.message}`);
      console.error("No admin account was created.");
      process.exit(1);
    });
}

module.exports = { createAdminUser, validateInput };