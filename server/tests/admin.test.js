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
  Product,
  Order,
  Review,
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

const makeAdmin = async () => {
  const creds = await registerUser({ email: `admin_${Math.random().toString(36).slice(2, 8)}@test.com` });
  await User.findByIdAndUpdate(creds.user._id, { role: "ADMIN" });
  return creds.token;
};

const makeSellerViaAdmin = async (options = {}) => {
  const creds = await registerUser({ email: `sv_${Math.random().toString(36).slice(2, 8)}@test.com` });
  const payload = {
    storeName: options.storeName || "Pending Store",
    storeDescription: "A pending store with plenty of exciting goods and services all around.",
    phone: "9888777666",
    address: "10 Test Road, Delhi 110001",
    kycDocuments: [
      { documentType: "PAN", documentNumber: "ABCDE1234F", documentUrl: "https://example.com/pan.pdf" },
    ],
  };
  await request(app).post("/api/sellers/register").set(authHeader(creds.token)).send(payload);
  const seller = await Seller.findOne({ user: creds.user._id });
  return { creds, seller };
};

describe("ADMIN", () => {
  test("SELLER accessing ADMIN API -> 403", async () => {
    const { sellerToken } = await makeSeller();
    const res = await request(app).get("/api/admin/dashboard").set(authHeader(sellerToken));
    expect(res.status).toBe(403);
  });

  test("admin dashboard returns stats", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    await makeProduct({ seller, category: cat, status: "PENDING" });
    await makeProduct({ seller, category: cat, status: "APPROVED" });

    const res = await request(app).get("/api/admin/dashboard").set(authHeader(adminToken));
    expect(res.status).toBe(200);
    const d = res.body.data.dashboard;
    expect(d.totalSellers).toBe(1);
    expect(d.totalUsers).toBeGreaterThanOrEqual(1);
    expect(d.totalProducts).toBe(2);
    expect(d.pendingProductApprovals).toBe(1);
    expect(typeof d.totalRevenue).toBe("number");
  });

  test("admin seller verification lifecycle: approve -> reject -> suspend -> reactivate", async () => {
    const adminToken = await makeAdmin();
    const { seller } = await makeSellerViaAdmin();
    expect(seller.status).toBe("PENDING");

    const approve = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/approve`)
      .set(authHeader(adminToken));
    expect(approve.status).toBe(200);
    expect(approve.body.data.seller.status).toBe("APPROVED");

    // Now the seller user's role should be SELLER
    const sellerUser = await User.findById(seller.user);
    expect(sellerUser.role).toBe("SELLER");

    const suspend = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/suspend`)
      .set(authHeader(adminToken))
      .send({ reason: "Fraud" });
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.seller.status).toBe("SUSPENDED");

    const reactivate = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/reactivate`)
      .set(authHeader(adminToken));
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.seller.status).toBe("APPROVED");

    const reject = await request(app)
      .patch(`/api/admin/sellers/${seller._id}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: "Bad docs" });
    expect(reject.status).toBe(200);
    expect(reject.body.data.seller.status).toBe("REJECTED");
  });

  test("product moderation: pending -> approve -> visible; reject", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { seller } = await makeSellerViaAdmin();
    await request(app).patch(`/api/admin/sellers/${seller._id}/approve`).set(authHeader(adminToken));

    const { sellerToken } = await makeSellerWithProductAdmin({ adminToken, seller, cat });

    const prod = await Product.findOne({ seller: seller._id });
    expect(prod.status).toBe("PENDING");

    // not visible publicly yet
    const pub = await request(app).get("/api/products");
    expect(pub.body.data.products.map((p) => String(p._id))).not.toContain(String(prod._id));

    const approve = await request(app)
      .patch(`/api/admin/products/${prod._id}/approve`)
      .set(authHeader(adminToken));
    expect(approve.status).toBe(200);
    expect(approve.body.data.product.status).toBe("APPROVED");

    const pub2 = await request(app).get("/api/products");
    expect(pub2.body.data.products.map((p) => String(p._id))).toContain(String(prod._id));

    const deactivate = await request(app)
      .patch(`/api/admin/products/${prod._id}/deactivate`)
      .set(authHeader(adminToken));
    expect(deactivate.status).toBe(200);

    const pub3 = await request(app).get("/api/products");
    expect(pub3.body.data.products.map((p) => String(p._id))).not.toContain(String(prod._id));
  });

  test("blocked user cannot perform protected operations (MANDATORY TEST 10)", async () => {
    const adminToken = await makeAdmin();
    const buyer = await registerUser({ email: "blockme@test.com" });

    const block = await request(app)
      .patch(`/api/admin/users/${buyer.user._id}/block`)
      .set(authHeader(adminToken));
    expect(block.status).toBe(200);

    const res = await request(app).get("/api/cart").set(authHeader(buyer.token));
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("blocked");
  });

  test("admin cannot block an admin", async () => {
    const adminToken = await makeAdmin();
    const anotherAdmin = await User.create({
      name: "Second Admin",
      email: `admin2_${Math.random().toString(36).slice(2, 8)}@test.com`,
      password: "Admin@12345",
      role: "ADMIN",
    });
    const res = await request(app)
      .patch(`/api/admin/users/${anotherAdmin._id}/block`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });

  test("user management list + search", async () => {
    const adminToken = await makeAdmin();
    await registerUser({ email: "lookup1@test.com", name: "Alpha Person" });

    const list = await request(app).get("/api/admin/users?search=Alpha").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.users.some((u) => u.name === "Alpha Person")).toBe(true);
  });

  test("category admin CRUD", async () => {
    const adminToken = await makeAdmin();

    const create = await request(app)
      .post("/api/admin/categories")
      .set(authHeader(adminToken))
      .send({ name: "Gaming" });
    expect(create.status).toBe(201);
    const id = create.body.data.category._id;

    const publicList = await request(app).get("/api/categories");
    expect(publicList.body.data.categories.some((c) => c.name === "Gaming")).toBe(true);

    const update = await request(app)
      .put(`/api/admin/categories/${id}`)
      .set(authHeader(adminToken))
      .send({ name: "Video Games" });
    expect(update.status).toBe(200);
    expect(update.body.data.category.name).toBe("Video Games");

    const del = await request(app).delete(`/api/admin/categories/${id}`).set(authHeader(adminToken));
    expect(del.status).toBe(200);
  });

  test("admin reviews list + delete", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser({ email: "revuser@test.com" });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    await Order.updateOne({ _id: orderRes.body.data.order._id }, { $set: { "items.0.status": "DELIVERED" } });

    await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 3, comment: "Okay" });

    const list = await request(app).get("/api/admin/reviews").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.reviews.length).toBe(1);

    const reviewId = list.body.data.reviews[0]._id;
    const del = await request(app).delete(`/api/admin/reviews/${reviewId}`).set(authHeader(adminToken));
    expect(del.status).toBe(200);
  });

  test("admin order management + refund", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });

    const buyer = await registerUser({ email: "adminord@test.com" });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    const list = await request(app).get("/api/admin/orders").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.orders.length).toBe(1);

    // mark delivered via admin
    const setStatus = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set(authHeader(adminToken))
      .send({ productId: String(prod._id), status: "DELIVERED" });
    expect(setStatus.status).toBe(200);

    // return request then refund
    await request(app)
      .patch(`/api/orders/${orderId}/return`)
      .set(authHeader(buyer.token))
      .send({ productId: String(prod._id), reason: "Return" });
    await request(app)
      .patch(`/api/sellers/orders/${orderId}/return`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), action: "APPROVE" });

    const refund = await request(app)
      .patch(`/api/admin/orders/${orderId}/refund`)
      .set(authHeader(adminToken))
      .send({ productId: String(prod._id) });
    expect(refund.status).toBe(200);
    expect((await Order.findById(orderId)).paymentStatus).toBe("REFUNDED");
    expect((await Product.findById(prod._id)).stock).toBe(5);
  });
});

// Helper used above — creates an approved seller + a pending product.
async function makeSellerWithProductAdmin({ adminToken, seller, cat }) {
  const user = await User.findById(seller.user);
  user.role = "SELLER";
  await user.save();

  const loginRes = await request(app).post("/api/auth/login").send({
    email: user.email,
    password: "Pass1234",
  });
  const sellerToken = loginRes.body.data.token;

  await request(app)
    .post("/api/seller/products")
    .set(authHeader(sellerToken))
    .send({
      name: "Moderated Product",
      description: "This product goes through admin moderation before going live to the public market.",
      category: cat._id,
      price: 500,
      stock: 10,
    });

  return { sellerToken };
}