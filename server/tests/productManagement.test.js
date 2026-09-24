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
  authHeader,
  User,
  Seller,
  Category,
  Product,
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

const validProduct = (catId) => ({
  name: "Premium Widget",
  description: "A premium widget with excellent build quality and great customer reviews.",
  category: catId,
  price: 1000,
  discount: 10,
  stock: 25,
  images: ["https://example.com/w1.jpg"],
});

describe("TASK 4 — PRODUCT CREATION GATES", () => {
  test("approved seller creates product -> 201, status PENDING", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    expect(res.status).toBe(201);
    expect(res.body.data.product.status).toBe("PENDING");
    expect(res.body.data.product.seller.toString()).toBe((await Seller.findOne({}).lean())._id.toString());
  });

  test("PENDING seller cannot create product -> 403", async () => {
    const { sellerToken } = await makeSeller({ status: "PENDING" });
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    expect(res.status).toBe(403);
  });

  test("REJECTED seller cannot create product -> 403", async () => {
    const { sellerToken } = await makeSeller({ status: "REJECTED" });
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    expect(res.status).toBe(403);
  });

  test("SUSPENDED seller cannot create product -> 403", async () => {
    const { sellerToken } = await makeSeller({ status: "SUSPENDED" });
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    expect(res.status).toBe(403);
  });

  test("USER role cannot create products -> 403", async () => {
    const { token } = await registerUser({ email: `usr_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(token))
      .send(validProduct(cat._id));
    expect(res.status).toBe(403);
  });
});

describe("TASK 4 — PRODUCT VALIDATION", () => {
  test("invalid price (<=0) -> 422", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ ...validProduct(cat._id), price: 0 });
    expect(res.status).toBe(422);
  });

  test("invalid discount (>100 or negative) -> 422", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const over = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ ...validProduct(cat._id), discount: 150 });
    expect(over.status).toBe(422);

    const negative = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ ...validProduct(cat._id), discount: -5 });
    expect(negative.status).toBe(422);
  });

  test("negative stock -> 422", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ ...validProduct(cat._id), stock: -1 });
    expect(res.status).toBe(422);
  });

  test("malformed category ID -> 400", async () => {
    const { sellerToken } = await makeSeller();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct("not-an-object-id"));
    expect(res.status).toBe(400);
  });

  test("nonexistent category ID -> 400", async () => {
    const { sellerToken } = await makeSeller();
    const { mongoose } = require("./helpers");
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(fakeId.toString()));
    expect(res.status).toBe(400);
  });

  test("inactive category cannot be used for new product -> 400", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    await Category.findByIdAndUpdate(cat._id, { isActive: false });
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("category");
  });

  test("more than 8 images -> 422", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const manyImages = Array.from({ length: 9 }, (_, i) => `https://example.com/img${i}.jpg`);
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ ...validProduct(cat._id), images: manyImages });
    expect(res.status).toBe(422);
  });
});

describe("TASK 4 — ADMIN PRODUCT MODERATION", () => {
  test("admin approve -> product becomes publicly visible; detail 200", async () => {
    const adminToken = await makeAdminToken();
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const created = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    const id = created.body.data.product._id;

    const hidden = await request(app).get(`/api/products/${id}`);
    expect(hidden.status).toBe(404);

    const approve = await request(app)
      .patch(`/api/admin/products/${id}/approve`)
      .set(authHeader(adminToken));
    expect(approve.status).toBe(200);
    expect(approve.body.data.product.status).toBe("APPROVED");

    const listed = await request(app).get("/api/products");
    expect(listed.body.data.products.some((p) => p._id === id)).toBe(true);

    const detail = await request(app).get(`/api/products/${id}`);
    expect(detail.status).toBe(200);
  });

  test("admin reject -> product hidden from public + rejection reason stored", async () => {
    const adminToken = await makeAdminToken();
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const created = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send(validProduct(cat._id));
    const id = created.body.data.product._id;

    const reject = await request(app)
      .patch(`/api/admin/products/${id}/reject`)
      .set(authHeader(adminToken))
      .send({ reason: "Misleading description" });
    expect(reject.status).toBe(200);
    expect(reject.body.data.product.status).toBe("REJECTED");
    expect(reject.body.data.product.rejectionReason).toBe("Misleading description");

    const listed = await request(app).get("/api/products");
    expect(listed.body.data.products.some((p) => p._id === id)).toBe(false);
    const detail = await request(app).get(`/api/products/${id}`);
    expect(detail.status).toBe(404);
  });

  test("admin deactivate hides approved product; activate restores it", async () => {
    const adminToken = await makeAdminToken();
    const { seller } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat });
    const id = prod._id.toString();

    const deactivate = await request(app)
      .patch(`/api/admin/products/${id}/deactivate`)
      .set(authHeader(adminToken));
    expect(deactivate.status).toBe(200);
    expect(deactivate.body.data.product.isActive).toBe(false);

    const hidden = await request(app).get(`/api/products/${id}`);
    expect(hidden.status).toBe(404);

    const activate = await request(app)
      .patch(`/api/admin/products/${id}/activate`)
      .set(authHeader(adminToken));
    expect(activate.status).toBe(200);
    expect(activate.body.data.product.isActive).toBe(true);

    const visible = await request(app).get(`/api/products/${id}`);
    expect(visible.status).toBe(200);
  });

  test("seller cannot moderate products (self-approve) -> 403", async () => {
    const { seller, sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat });

    const approve = await request(app)
      .patch(`/api/admin/products/${prod._id}/approve`)
      .set(authHeader(sellerToken));
    expect(approve.status).toBe(403);

    const list = await request(app).get("/api/admin/products").set(authHeader(sellerToken));
    expect(list.status).toBe(403);
  });

  test("invalid product ID on admin action -> 400", async () => {
    const adminToken = await makeAdminToken();
    const res = await request(app)
      .patch("/api/admin/products/not-a-valid-id/approve")
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });

  test("admin product list supports search + status filter", async () => {
    const adminToken = await makeAdminToken();
    const { seller } = await makeSeller();
    const cat = await makeCategory();
    await makeProduct({ seller, category: cat, name: "Alphabet Soup", status: "PENDING" });
    await makeProduct({ seller, category: cat, name: "Beta Blaster", status: "APPROVED" });

    const pending = await request(app).get("/api/admin/products?status=PENDING").set(authHeader(adminToken));
    expect(pending.status).toBe(200);
    expect(pending.body.data.products.length).toBe(1);
    expect(pending.body.data.products[0].name).toBe("Alphabet Soup");

    const search = await request(app).get("/api/admin/products?search=beta").set(authHeader(adminToken));
    expect(search.body.data.products.length).toBe(1);
    expect(search.body.data.products[0].name).toBe("Beta Blaster");
  });

  test("admin category list endpoint works", async () => {
    const adminToken = await makeAdminToken();
    const active = await makeCategory("Active Cat");
    const inactive = await makeCategory("Hidden Cat");
    await Category.findByIdAndUpdate(inactive._id, { isActive: false });

    const res = await request(app).get("/api/admin/categories").set(authHeader(adminToken));
    expect(res.status).toBe(200);
    const names = res.body.data.categories.map((c) => c.name);
    expect(names).toContain("Active Cat");
    expect(names).toContain("Hidden Cat");
  });
});

describe("TASK 4 — OWNERSHIP ISOLATION (A not B)", () => {
  test("Seller A cannot modify or delete Seller B's product", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const productB = await makeProduct({ seller: sellerB.seller, category: cat, price: 2000, stock: 9 });

    const update = await request(app)
      .put(`/api/seller/products/${productB._id}`)
      .set(authHeader(sellerA.sellerToken))
      .send({ price: 99 });
    expect(update.status).toBe(403);

    const del = await request(app)
      .delete(`/api/seller/products/${productB._id}`)
      .set(authHeader(sellerA.sellerToken));
    expect(del.status).toBe(403);

    const after = await Product.findById(productB._id);
    expect(after.price).toBe(2000);
    expect(after.isActive).toBe(true);
  });
});

describe("TASK 4 — PUBLIC LISTING SAFETY", () => {
  test("products of a SUSPENDED seller disappear from public listings", async () => {
    const adminToken = await makeAdminToken();
    const { seller } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat, name: "Seller Specific Item" });
    const id = prod._id.toString();

    const before = await request(app).get("/api/products");
    expect(before.body.data.products.some((p) => p._id === id)).toBe(true);

    await request(app).patch(`/api/admin/sellers/${seller._id}/suspend`).set(authHeader(adminToken)).send({ reason: "Policy violation" });

    const after = await request(app).get("/api/products");
    expect(after.body.data.products.some((p) => p._id === id)).toBe(false);

    const detail = await request(app).get(`/api/products/${id}`);
    expect(detail.status).toBe(404);
  });

  test("products of a DELETED seller are not exposed", async () => {
    const { seller } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat, name: "Ghost Item" });
    await Seller.deleteOne({ _id: seller._id });

    const listed = await request(app).get("/api/products");
    expect(listed.body.data.products.some((p) => p._id === prod._id.toString())).toBe(false);

    const detail = await request(app).get(`/api/products/${prod._id}`);
    expect(detail.status).toBe(404);
  });

  test("empty database public listing returns 200 with empty array", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([]);
    expect(res.body.data.pagination.totalItems).toBe(0);
  });

  test("invalid public product ID -> 400", async () => {
    const res = await request(app).get("/api/products/not-a-valid-id");
    expect(res.status).toBe(400);
  });
});