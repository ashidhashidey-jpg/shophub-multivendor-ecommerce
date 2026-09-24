const {
  app,
  request,
  setup,
  teardown,
  cleanup,
  registerUser,
  makeSeller,
  makeCategory,
  makeProduct,
  addAddress,
  addToCart,
  placeCodOrder,
  authHeader,
  User,
  Seller,
  Order,
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

const makeAdminToken = async () => {
  const creds = await registerUser({ email: `adm_${Math.random().toString(36).slice(2, 8)}@test.com` });
  await User.findByIdAndUpdate(creds.user._id, { role: "ADMIN" });
  return creds.token;
};

const registerSellerApp = async (overrides = {}) => {
  const creds = await registerUser({ email: `app_${Math.random().toString(36).slice(2, 8)}@test.com` });
  const payload = {
    storeName: overrides.storeName || "Lifecycle Store",
    storeDescription: "A store moving through the full seller verification lifecycle.",
    phone: "9888777666",
    address: "42 Test Avenue, Bengaluru 560001",
    kycDocuments: [{ documentType: "PAN", documentNumber: "ABCDE1234F", documentUrl: "https://example.com/pan.pdf" }],
  };
  const res = await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(payload);
  return { creds, res };
};

describe("SELLER APPLICATION + KYC VALIDATION", () => {
  test("registration without KYC documents -> 422", async () => {
    const { creds } = await registerSellerApp();
    const res = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send({
        storeName: "No KYC Store",
        storeDescription: "This application should fail because KYC is missing entirely.",
        phone: "9888777666",
        address: "1 Empty Road, Pune 411001",
      });
    expect(res.status).toBe(422);
  });

  test("registration with invalid documentType -> 422", async () => {
    const { creds } = await registerSellerApp();
    const res = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send({
        storeName: "Bad Type Store",
        storeDescription: "This application should fail because the KYC type is invalid.",
        phone: "9888777666",
        address: "2 Bad Road, Pune 411001",
        kycDocuments: [{ documentType: "VOTER_CARD", documentNumber: "ABC123", documentUrl: "https://example.com/v.jpg" }],
      });
    expect(res.status).toBe(422);
  });

  test("registration with badly formatted PAN number -> 422", async () => {
    const { creds } = await registerSellerApp();
    const res = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send({
        storeName: "Bad PAN Store",
        storeDescription: "This application should fail because the PAN number is malformed.",
        phone: "9888777666",
        address: "3 Bad Road, Pune 411001",
        kycDocuments: [{ documentType: "PAN", documentNumber: "PAN12345", documentUrl: "https://example.com/p.jpg" }],
      });
    expect(res.status).toBe(422);
  });

  test("valid KYC application is created as PENDING (role stays USER)", async () => {
    const { creds, res } = await registerSellerApp();
    expect(res.status).toBe(201);
    expect(res.body.data.seller.status).toBe("PENDING");
    const user = await User.findById(creds.user._id);
    expect(user.role).toBe("USER");

    const status = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(status.status).toBe(200);
    expect(status.body.data.seller.status).toBe("PENDING");
  });

  test("existing PENDING/APPROVED profile still rejects duplicate registration -> 409", async () => {
    const { creds, res } = await registerSellerApp();
    expect(res.status).toBe(201);
    const again = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send({
        storeName: "Dup Store",
        storeDescription: "A second application for the same account should be blocked.",
        phone: "9888777666",
        address: "4 Dup Road, Pune 411001",
        kycDocuments: [{ documentType: "PAN", documentNumber: "ABCDE1234F", documentUrl: "https://example.com/pan.pdf" }],
      });
    expect(again.status).toBe(409);
  });
});

describe("SELLER APPROVAL LIFECYCLE", () => {
  test("admin approval grants dashboard access with truthful zero stats", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();
    const seller = await Seller.findOne({ user: creds.user._id });

    const approve = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/approve`)
      .set(authHeader(adminToken));
    expect(approve.status).toBe(200);
    expect(approve.body.data.seller.status).toBe("APPROVED");

    const user = await User.findById(creds.user._id);
    expect(user.role).toBe("SELLER");

    const dash = await request(app).get("/api/sellers/dashboard").set(authHeader(creds.token));
    expect(dash.status).toBe(200);
    const d = dash.body.data.dashboard;
    expect(d.totalProducts).toBe(0);
    expect(d.totalOrders).toBe(0);
    expect(d.totalSales).toBe(0);
    expect(d.totalEarnings).toBe(0);
  });

  test("rejected seller is downgraded to USER and loses dashboard access", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();
    const seller = await Seller.findOne({ user: creds.user._id });

    await request(app).patch(`/api/admin/sellers/${seller._id}/approve`).set(authHeader(adminToken));
    const reject = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: "Incomplete store information" });
    expect(reject.status).toBe(200);
    expect(reject.body.data.seller.status).toBe("REJECTED");
    expect(reject.body.data.seller.rejectedReason).toContain("Incomplete");

    const user = await User.findById(creds.user._id);
    expect(user.role).toBe("USER");

    const dash = await request(app).get("/api/sellers/dashboard").set(authHeader(creds.token));
    expect(dash.status).toBe(403);

    const status = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(status.status).toBe(200);
    expect(status.body.data.seller.status).toBe("REJECTED");
    expect(status.body.data.seller.rejectedReason).toBe("Incomplete store information");
  });

  test("rejected seller can reapply and re-enter the review queue", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();
    const seller = await Seller.findOne({ user: creds.user._id });

    await request(app).patch(`/api/admin/sellers/${seller._id}/reject`).set(authHeader(adminToken)).send({ reason: "Resubmit" });

    const reapply = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(creds.token))
      .send({
        storeName: "Improved Store",
        storeDescription: "A much better store after the applicant fixed their information.",
        phone: "9888777666",
        address: "42 Test Avenue, Bengaluru 560001",
        kycDocuments: [{ documentType: "AADHAAR", documentNumber: "111122223333", documentUrl: "https://example.com/aa.pdf" }],
      });
    expect(reapply.status).toBe(201);
    expect(reapply.body.data.seller.status).toBe("PENDING");
    expect(reapply.body.data.seller.rejectedReason).toBe("");

    const sellerDoc = await Seller.findById(seller._id);
    expect(sellerDoc.status).toBe("PENDING");
    expect(sellerDoc.kycDocuments[0].documentType).toBe("AADHAAR");
  });

  test("suspended seller loses access (403); reactivation restores it", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();
    const seller = await Seller.findOne({ user: creds.user._id });

    await request(app).patch(`/api/admin/sellers/${seller._id}/approve`).set(authHeader(adminToken));

    const suspend = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/suspend`)
      .set(authHeader(adminToken))
      .send({ reason: "Suspected policy violation" });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.seller.status).toBe("SUSPENDED");

    const dash = await request(app).get("/api/sellers/dashboard").set(authHeader(creds.token));
    expect(dash.status).toBe(403);

    const status = await request(app).get("/api/sellers/status").set(authHeader(creds.token));
    expect(status.body.data.seller.status).toBe("SUSPENDED");
    expect(status.body.data.seller.suspendedReason).toBe("Suspected policy violation");

    const reactivate = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/reactivate`)
      .set(authHeader(adminToken));
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.seller.status).toBe("APPROVED");

    const dash2 = await request(app).get("/api/sellers/dashboard").set(authHeader(creds.token));
    expect(dash2.status).toBe(200);
  });

  test("KYC update endpoint replaces documents and re-opens review when rejected", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();
    const seller = await Seller.findOne({ user: creds.user._id });

    const update = await request(app)
      .put("/api/sellers/kyc")
      .set(authHeader(creds.token))
      .send({
        kycDocuments: [{ documentType: "AADHAAR", documentNumber: "111122223333", documentUrl: "https://example.com/new.pdf" }],
      });
    expect(update.status).toBe(200);
    expect(update.body.data.seller.kycDocuments[0].documentType).toBe("AADHAAR");

    const bad = await request(app)
      .put("/api/sellers/kyc")
      .set(authHeader(creds.token))
      .send({ kycDocuments: [] });
    expect(bad.status).toBe(422);

    await request(app).patch(`/api/admin/sellers/${seller._id}/reject`).set(authHeader(adminToken)).send({ reason: "Bad doc" });

    const fixed = await request(app)
      .put("/api/sellers/kyc")
      .set(authHeader(creds.token))
      .send({
        kycDocuments: [{ documentType: "PAN", documentNumber: "XYZAB1234K", documentUrl: "https://example.com/fixed.pdf" }],
      });
    expect(fixed.status).toBe(200);
    expect(fixed.body.data.seller.status).toBe("PENDING");
  });

  test("invalid seller id on admin actions -> 400 (no crash)", async () => {
    const adminToken = await makeAdminToken();
    const res = await request(app).patch("/api/admin/sellers/not-a-valid-id/approve").set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });
});

describe("SELLER ISOLATION", () => {
  test("Seller A cannot read or update Seller B's order", async () => {
    const adminToken = await makeAdminToken();
    const cat = await makeCategory();
    const sellerA = await makeSeller();

    const { creds: credsB } = await registerSellerApp({ storeName: "Store B" });
    const sellerB = await Seller.findOne({ user: credsB.user._id });
    await request(app).patch(`/api/admin/sellers/${sellerB._id}/approve`).set(authHeader(adminToken));
    const productB = await makeProduct({ seller: sellerB, category: cat, price: 800, stock: 5 });

    const buyer = await registerUser({ email: `buy_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, productB._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    // Owner (Seller B) can read it.
    const own = await request(app).get(`/api/sellers/orders/${orderId}`).set(authHeader(credsB.token));
    expect(own.status).toBe(200);

    // Cross-seller read -> 404.
    const other = await request(app).get(`/api/sellers/orders/${orderId}`).set(authHeader(sellerA.sellerToken));
    expect(other.status).toBe(404);

    // Cross-seller status update -> 403.
    const cross = await request(app)
      .patch(`/api/sellers/orders/${orderId}/status`)
      .set(authHeader(sellerA.sellerToken))
      .send({ productId: String(productB._id), status: "SHIPPED" });
    expect(cross.status).toBe(403);

    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("PENDING");
  });
});

describe("ADMIN ACCESS + LIST EXPOSURE", () => {
  test("USER and SELLER cannot access admin seller endpoints -> 403", async () => {
    const user = await registerUser({ email: `usr_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const userRes = await request(app).get("/api/admin/sellers").set(authHeader(user.token));
    expect(userRes.status).toBe(403);

    const seller = await makeSeller();
    const sellerRes = await request(app).get("/api/admin/sellers").set(authHeader(seller.sellerToken));
    expect(sellerRes.status).toBe(403);
  });

  test("admin seller list shows KYC submitted status but hides KYC documents", async () => {
    const adminToken = await makeAdminToken();
    const { creds } = await registerSellerApp();

    const list = await request(app).get("/api/admin/sellers").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    const s = list.body.data.sellers.find((x) => String(x.user?._id || x.user) === String(creds.user._id));
    expect(s).toBeTruthy();
    expect(s.kycSubmitted).toBe(true);
    expect("kycDocuments" in s).toBe(false);

    const detail = await request(app).get(`/api/admin/sellers/${s._id}`).set(authHeader(adminToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.seller.kycDocuments.length).toBe(1);
  });
});