const bcrypt = require("bcryptjs");
const {
  app,
  request,
  setup,
  teardown,
  cleanup,
  registerUser,
  login,
  authHeader,
  User,
} = require("./helpers");
const { createAdminUser } = require("../src/scripts/createAdmin");

beforeAll(async () => {
  await setup();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await teardown();
});

describe("createAdmin (controlled initial admin setup)", () => {
  test("creates a valid admin: role ADMIN, password stored hashed", async () => {
    const { user } = await createAdminUser({ name: "Platform Admin", email: "root@admin.com", password: "Admin1234" });

    expect(user.role).toBe("ADMIN");
    expect(user.password).toBeUndefined();

    const stored = await User.findById(user._id).select("+password");
    expect(stored).not.toBeNull();
    expect(stored.role).toBe("ADMIN");
    expect(stored.password).not.toBe("Admin1234");
    expect(stored.password.startsWith("$2")).toBe(true); // bcrypt hash

    const match = await bcrypt.compare("Admin1234", stored.password);
    expect(match).toBe(true);
  });

  test("created admin can log in through the existing auth flow -> 200 + ADMIN token", async () => {
    await createAdminUser({ name: "Platform Admin", email: "boss@admin.com", password: "Admin1234" });

    const res = await login("boss@admin.com", "Admin1234");
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe("ADMIN");

    const wrong = await login("boss@admin.com", "WrongPass1");
    expect(wrong.status).toBe(401);

    const ghost = await login("ghost@admin.com", "Admin1234");
    expect(ghost.status).toBe(401);
  });

  test("rejects a duplicate email (case-insensitive)", async () => {
    await createAdminUser({ name: "Admin One", email: "dup@example.com", password: "Admin1234" });
    await expect(
      createAdminUser({ name: "Admin Two", email: "DUP@EXAMPLE.COM", password: "Admin1234" })
    ).rejects.toThrow(/already exists/i);
  });

  test("rejects a second admin even with a different email (no duplicates)", async () => {
    await createAdminUser({ name: "Admin One", email: "one@example.com", password: "Admin1234" });
    await expect(
      createAdminUser({ name: "Admin Two", email: "two@example.com", password: "Admin1234" })
    ).rejects.toThrow(/admin account already exists/i);
  });

  test("rejects an invalid email", async () => {
    await expect(
      createAdminUser({ name: "Admin", email: "not-an-email", password: "Admin1234" })
    ).rejects.toThrow(/valid email/i);
  });

  test("rejects a weak password (no letter, no number, or too short)", async () => {
    await expect(
      createAdminUser({ name: "Admin", email: "a@example.com", password: "123456" })
    ).rejects.toThrow(/password/i);
    await expect(
      createAdminUser({ name: "Admin", email: "b@example.com", password: "onlyletters" })
    ).rejects.toThrow(/password/i);
    await expect(
      createAdminUser({ name: "Admin", email: "c@example.com", password: "123" })
    ).rejects.toThrow(/password/i);
  });

  test("rejects a blank or too-short name", async () => {
    await expect(
      createAdminUser({ name: " A ", email: "a@example.com", password: "Admin1234" })
    ).rejects.toThrow(/name/i);
    await expect(
      createAdminUser({ name: "X", email: "b@example.com", password: "Admin1234" })
    ).rejects.toThrow(/name/i);
  });

  test("does NOT delete existing users during admin creation (database safety)", async () => {
    const existingUser = await User.create({
      name: "Existing Buyer",
      email: "buyer@example.com",
      password: "Pass1234",
      role: "USER",
    });

    await createAdminUser({ name: "Platform Admin", email: "admin@example.com", password: "Admin1234" });

    const stillThere = await User.findById(existingUser._id);
    expect(stillThere).not.toBeNull();
    expect(stillThere.email).toBe("buyer@example.com");
    expect(stillThere.role).toBe("USER");
  });

  test("createAdmin never touches products/sellers/categories (no data mutation)", async () => {
    await createAdminUser({ name: "Platform Admin", email: "solo@admin.com", password: "Admin1234" });

    const { Product, Seller, Category } = require("./helpers");
    expect(await Product.countDocuments()).toBe(0);
    expect(await Seller.countDocuments()).toBe(0);
    expect(await Category.countDocuments()).toBe(0);
  });
});

describe("ADMIN API authorization (explicit checks)", () => {
  test("admin API without token -> 401", async () => {
    const res = await request(app).get("/api/admin/dashboard");
    expect(res.status).toBe(401);
  });

  test("admin API with a USER token -> 403", async () => {
    const { token } = await registerUser({ email: "notadmin@test.com" });
    const res = await request(app).get("/api/admin/dashboard").set(authHeader(token));
    expect(res.status).toBe(403);
  });

  test("admin API with an ADMIN token -> allowed", async () => {
    await createAdminUser({ name: "Platform Admin", email: "boss2@admin.com", password: "Admin1234" });
    const adminRes = await login("boss2@admin.com", "Admin1234");
    const res = await request(app).get("/api/admin/dashboard").set(authHeader(adminRes.body.data.token));
    expect(res.status).toBe(200);
    expect(res.body.data.dashboard).toMatchObject({
      totalUsers: expect.any(Number),
      totalSellers: expect.any(Number),
      totalProducts: expect.any(Number),
      totalOrders: expect.any(Number),
      totalRevenue: expect.any(Number),
      pendingSellerApprovals: expect.any(Number),
      pendingProductApprovals: expect.any(Number),
    });
  });
});