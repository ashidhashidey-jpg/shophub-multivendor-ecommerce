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

beforeAll(async () => {
  await setup();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await teardown();
});

describe("AUTH", () => {
  test("register a new user returns 201 and a token", async () => {
    const { res } = await registerUser({ email: "alice@test.com" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe("alice@test.com");
    expect(res.body.data.user.password).toBeUndefined();
  });

  test("registration validation: bad email / weak password -> 422", async () => {
    const bad = await request(app).post("/api/auth/register").send({
      name: "Bad",
      email: "not-an-email",
      password: "123",
    });
    expect(bad.status).toBe(422);
    expect(bad.body.success).toBe(false);
  });

  test("duplicate email -> 409", async () => {
    await registerUser({ email: "dup@test.com" });
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup",
      email: "dup@test.com",
      password: "Pass1234",
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("already");
  });

  test("login with valid credentials -> 200 + token", async () => {
    const { email, password } = await registerUser({ email: "login@test.com" });
    const res = await login(email, password);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  test("login with wrong password -> 401", async () => {
    const { email } = await registerUser({ email: "wrong@test.com" });
    const res = await login(email, "WrongPass1");
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("login for unknown email -> 401", async () => {
    const res = await login("ghost@nowhere.com", "Pass1234");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/me returns current user", async () => {
    const { token } = await registerUser({ email: "me@test.com" });
    const res = await request(app).get("/api/auth/me").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("me@test.com");
  });

  test("protected route without token -> 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("protected route with invalid token -> 401", async () => {
    const res = await request(app).get("/api/auth/me").set(authHeader("garbage.token.here"));
    expect(res.status).toBe(401);
  });

  test("logout -> 200 (stateless)", async () => {
    const { token } = await registerUser({ email: "out@test.com" });
    const res = await request(app).post("/api/auth/logout").set(authHeader(token));
    expect(res.status).toBe(200);
  });

  test("change password works with correct current password", async () => {
    const { email, password, token } = await registerUser({ email: "cp@test.com" });
    const res = await request(app)
      .put("/api/auth/change-password")
      .set(authHeader(token))
      .send({ currentPassword: password, newPassword: "NewPass99" });
    expect(res.status).toBe(200);

    const oldLogin = await login(email, password);
    expect(oldLogin.status).toBe(401);
    const newLogin = await login(email, "NewPass99");
    expect(newLogin.status).toBe(200);
  });

  test("change password rejects wrong current password", async () => {
    const { token } = await registerUser({ email: "cp2@test.com" });
    const res = await request(app)
      .put("/api/auth/change-password")
      .set(authHeader(token))
      .send({ currentPassword: "WrongNow", newPassword: "NewPass99" });
    expect(res.status).toBe(400);
  });

  // MANDATORY TEST 3: normal USER accessing ADMIN API -> 403
  test("USER accessing ADMIN API -> 403", async () => {
    const { token } = await registerUser({ email: "useradmin@test.com" });
    const res = await request(app).get("/api/admin/dashboard").set(authHeader(token));
    expect(res.status).toBe(403);
  });

  // MANDATORY TEST 7: invalid ObjectId -> 400 (never 500)
  test("invalid ObjectId on product endpoint -> 400 and server survives", async () => {
    const res = await request(app).get("/api/products/not-a-valid-id");
    expect(res.status).toBe(400);
    const res2 = await request(app).get("/api/products/12345");
    expect(res2.status).toBe(400);
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
  });

  test("blocked user cannot use protected endpoints -> 403", async () => {
    const { token, user } = await registerUser({ email: "blocked@test.com" });
    await User.findByIdAndUpdate(user._id, { isBlocked: true });

    const res = await request(app).get("/api/users/profile").set(authHeader(token));
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("blocked");

    const loginRes = await login("blocked@test.com", "Pass1234");
    expect(loginRes.status).toBe(403);
  });
});