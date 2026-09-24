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
  addToCart,
  authHeader,
  User,
  Seller,
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

describe("USER PROFILE + ADDRESSES", () => {
  test("GET profile", async () => {
    const { token } = await registerUser({ email: "prof@test.com" });
    const res = await request(app).get("/api/users/profile").set(authHeader(token));
    expect(res.status).toBe(200);
  });

  test("PUT profile updates name and phone", async () => {
    const { token } = await registerUser({ email: "profup@test.com" });
    const res = await request(app)
      .put("/api/users/profile")
      .set(authHeader(token))
      .send({ name: "New Name", phone: "9888777666" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe("New Name");
  });

  test("address CRUD + default address", async () => {
    const { token } = await registerUser({ email: "addr@test.com" });

    const create1 = await request(app).post("/api/users/addresses").set(authHeader(token)).send({
      name: "Home", phone: "9888777666", addressLine1: "1 MG Road", city: "Pune",
      state: "Maharashtra", postalCode: "411001", country: "India",
    });
    expect(create1.status).toBe(201);
    const addrId = create1.body.data.address._id;
    expect(create1.body.data.address.isDefault).toBe(true);

    const create2 = await request(app).post("/api/users/addresses").set(authHeader(token)).send({
      name: "Office", phone: "9888777666", addressLine1: "2 FC Road", city: "Pune",
      state: "Maharashtra", postalCode: "411004", country: "India", isDefault: true,
    });
    expect(create2.status).toBe(201);
    expect(create2.body.data.address.isDefault).toBe(true);

    // first address no longer default
    const list = await request(app).get("/api/users/addresses").set(authHeader(token));
    const first = list.body.data.addresses.find((a) => a._id === addrId);
    expect(first.isDefault).toBe(false);

    // set default
    const setDef = await request(app).patch(`/api/users/addresses/${addrId}/default`).set(authHeader(token));
    expect(setDef.status).toBe(200);

    // update
    const upd = await request(app)
      .put(`/api/users/addresses/${addrId}`)
      .set(authHeader(token))
      .send({ city: "Mumbai" });
    expect(upd.status).toBe(200);
    expect(upd.body.data.address.city).toBe("Mumbai");

    // delete
    const del = await request(app).delete(`/api/users/addresses/${addrId}`).set(authHeader(token));
    expect(del.status).toBe(200);
  });

  test("cannot access another user's address", async () => {
    const a = await registerUser({ email: "aa@test.com" });
    const b = await registerUser({ email: "bb@test.com" });
    const created = await request(app).post("/api/users/addresses").set(authHeader(a.token)).send({
      name: "Home", phone: "9888777666", addressLine1: "1 MG Road", city: "Pune",
      state: "Maharashtra", postalCode: "411001", country: "India",
    });
    const id = created.body.data.address._id;

    const res = await request(app).delete(`/api/users/addresses/${id}`).set(authHeader(b.token));
    expect(res.status).toBe(404);
  });

  test("invalid address id -> 400", async () => {
    const { token } = await registerUser({ email: "inv@test.com" });
    const res = await request(app).delete("/api/users/addresses/badid").set(authHeader(token));
    expect(res.status).toBe(400);
  });
});

describe("SELLER SYSTEM", () => {
  test("seller registers as PENDING with KYC", async () => {
    const { token } = await registerUser({ email: "sell@test.com" });
    const res = await request(app)
      .post("/api/sellers/register")
      .set(authHeader(token))
      .send({
        storeName: "New Store",
        storeDescription: "A brand new store with amazing products and great service quality.",
        phone: "9888777666",
        address: "5 Lake Road, Chennai 600001",
        kycDocuments: [
          { documentType: "AADHAAR", documentNumber: "111122223333", documentUrl: "https://example.com/aadhaar.pdf" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.seller.status).toBe("PENDING");
  });

  test("duplicate seller registration -> 409", async () => {
    const { token } = await registerUser({ email: "sdup@test.com" });
    const payload = {
      storeName: "Dup Store",
      storeDescription: "A brand new store with amazing products and great service quality.",
      phone: "9888777666",
      address: "5 Lake Road, Chennai 600001",
      kycDocuments: [
        { documentType: "AADHAAR", documentNumber: "111122223333", documentUrl: "https://example.com/aadhaar.pdf" },
      ],
    };
    const first = await request(app).post("/api/sellers/register").set(authHeader(token)).send(payload);
    expect(first.status).toBe(201);
    const second = await request(app).post("/api/sellers/register").set(authHeader(token)).send(payload);
    expect(second.status).toBe(409);
  });

  // MANDATORY TEST 4: PENDING seller dashboard -> 403
  test("PENDING seller cannot access dashboard -> 403", async () => {
    const { user, sellerToken } = await makeSeller({ status: "PENDING" });
    expect(user._id).toBeTruthy();
    const res = await request(app).get("/api/sellers/dashboard").set(authHeader(sellerToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("APPROVED");
  });

  test("PENDING seller CAN view own application status", async () => {
    const { sellerToken } = await makeSeller({ status: "PENDING" });
    const res = await request(app).get("/api/sellers/status").set(authHeader(sellerToken));
    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe("PENDING");
  });

  test("APPROVED seller can access dashboard with stats", async () => {
    const { sellerToken, seller } = await makeSeller();
    const cat = await makeCategory();
    await makeProduct({ seller, category: cat, price: 500, stock: 5 });

    const res = await request(app).get("/api/sellers/dashboard").set(authHeader(sellerToken));
    expect(res.status).toBe(200);
    const d = res.body.data.dashboard;
    expect(d.totalProducts).toBe(1);
    expect(typeof d.totalSales).toBe("number");
    expect(typeof d.totalEarnings).toBe("number");
  });

  test("SUSPENDED seller cannot access dashboard -> 403", async () => {
    const { sellerToken } = await makeSeller({ status: "SUSPENDED" });
    const res = await request(app).get("/api/sellers/dashboard").set(authHeader(sellerToken));
    expect(res.status).toBe(403);
  });

  test("NON-seller cannot access seller routes -> 403/404", async () => {
    const { token } = await registerUser({ email: "noseller@test.com" });
    const res = await request(app).get("/api/sellers/dashboard").set(authHeader(token));
    expect([403, 404]).toContain(res.status);
  });
});

describe("PRODUCT SYSTEM (seller)", () => {
  test("approved seller creates product -> PENDING", async () => {
    const { sellerToken, seller } = await makeSeller();
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ name: "New Gadget", description: "A shiny new gadget with many features and a long description.", category: cat._id, price: 1500, discount: 10, stock: 20 });
    expect(res.status).toBe(201);
    expect(res.body.data.product.status).toBe("PENDING");
    expect(res.body.data.product.finalPrice).toBe(1350);
  });

  test("PENDING seller cannot create products -> 403", async () => {
    const { sellerToken } = await makeSeller({ status: "PENDING" });
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ name: "nope", description: "This should be blocked by the pending gate.", category: cat._id, price: 100, stock: 1 });
    expect(res.status).toBe(403);
  });

  test("produvalidation: bad price -> 422", async () => {
    const { sellerToken } = await makeSeller();
    const cat = await makeCategory();
    const res = await request(app)
      .post("/api/seller/products")
      .set(authHeader(sellerToken))
      .send({ name: "Bad", description: "Description is required to be long enough here ok.", category: cat._id, price: -5, stock: 5 });
    expect(res.status).toBe(422);
  });

  // MANDATORY TEST 2: Seller A editing Seller B's product -> 403
  test("Seller A cannot modify Seller B's product -> 403", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const productB = await makeProduct({ seller: sellerB.seller, category: cat, price: 2000, stock: 9 });

    const res = await request(app)
      .put(`/api/seller/products/${productB._id}`)
      .set(authHeader(sellerA.sellerToken))
      .send({ price: 99 });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("does not belong");

    const after = await Product.findById(productB._id);
    expect(after.price).toBe(2000); // unchanged
  });

  test("owner CAN update own product and it resets to PENDING", async () => {
    const { sellerToken, seller } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat, price: 1000 });

    const res = await request(app)
      .put(`/api/seller/products/${prod._id}`)
      .set(authHeader(sellerToken))
      .send({ price: 500, stock: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.status).toBe("PENDING");
    expect(res.body.data.product.price).toBe(500);
  });

  test("seller can list and delete (deactivate) own products", async () => {
    const { sellerToken, seller } = await makeSeller();
    const cat = await makeCategory();
    const prod = await makeProduct({ seller, category: cat });

    const list = await request(app).get("/api/seller/products").set(authHeader(sellerToken));
    expect(list.status).toBe(200);
    expect(list.body.data.products.length).toBe(1);

    const del = await request(app).delete(`/api/seller/products/${prod._id}`).set(authHeader(sellerToken));
    expect(del.status).toBe(200);
    expect(del.body.data.product.isActive).toBe(false);
  });

  test("invalid product id on seller edit -> 400", async () => {
    const { sellerToken } = await makeSeller();
    const res = await request(app).put("/api/seller/products/badid").set(authHeader(sellerToken)).send({ price: 1 });
    expect(res.status).toBe(400);
  });
});

describe("PUBLIC PRODUCT MARKETPLACE", () => {
  test("only APPROVED + ACTIVE products are public", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const approved = await makeProduct({ seller, category: cat, name: "Visible Product", status: "APPROVED" });
    await makeProduct({ seller, category: cat, name: "Pending Product", status: "PENDING" });
    await makeProduct({ seller, category: cat, name: "Inactive Product", status: "APPROVED", isActive: false });

    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    const names = res.body.data.products.map((p) => p.name);
    expect(names).toContain("Visible Product");
    expect(names).not.toContain("Pending Product");
    expect(names).not.toContain("Inactive Product");
  });

  test("public search filters by query, category and price", async () => {
    const catElectronics = await makeCategory();
    const catBooks = await makeCategory();
    const { seller } = await makeSeller();
    await makeProduct({ seller, category: catElectronics, name: "Smartphone Pro", price: 20000, stock: 5 });
    await makeProduct({ seller, category: catElectronics, name: "Phone Case", price: 299, stock: 50 });
    await makeProduct({ seller, category: catBooks, name: "Programming Book", price: 799, stock: 30 });

    const bySearch = await request(app).get("/api/products?search=phone");
    expect(bySearch.body.data.products.length).toBe(2);

    const byCategory = await request(app).get(`/api/products?category=${catElectronics._id}`);
    expect(byCategory.body.data.products.length).toBe(2);

    const byPrice = await request(app).get("/api/products?minPrice=500&maxPrice=1000");
    expect(byPrice.body.data.products.every((p) => p.finalPrice >= 500 && p.finalPrice <= 1000)).toBe(true);
  });

  test("product detail hides non-approved product (404)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const pending = await makeProduct({ seller, category: cat, status: "PENDING" });
    const res = await request(app).get(`/api/products/${pending._id}`);
    expect(res.status).toBe(404);
  });
});

describe("CART + WISHLIST", () => {
  test("cart add/update/remove with stock respected", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 500, stock: 5 });
    const { token } = await registerUser({ email: "cart@test.com" });

    const add = await addToCart(token, prod._id, 2);
    expect(add.status).toBe(201);
    expect(add.body.data.cart.items[0].quantity).toBe(2);

    // exceeding stock on update
    const over = await request(app)
      .put(`/api/cart/items/${prod._id}`)
      .set(authHeader(token))
      .send({ quantity: 99 });
    expect(over.status).toBe(400);
    expect(over.body.message).toContain("Insufficient stock");

    // remove
    const rem = await request(app).delete(`/api/cart/items/${prod._id}`).set(authHeader(token));
    expect(rem.status).toBe(200);
    expect(rem.body.data.cart.items.length).toBe(0);
  });

  test("cannot add non-approved product to cart", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const pending = await makeProduct({ seller, category: cat, status: "PENDING" });
    const { token } = await registerUser({ email: "cart2@test.com" });

    const res = await addToCart(token, pending._id, 1);
    expect(res.status).toBe(404);
  });

  test("wishlist add/remove + duplicates prevented", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });
    const { token } = await registerUser({ email: "wish@test.com" });

    const first = await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(token));
    expect(first.status).toBe(201);
    const second = await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(token));
    expect(second.status).toBe(201); // idempotent

    const list = await request(app).get("/api/wishlist").set(authHeader(token));
    expect(list.body.data.wishlist.products.length).toBe(1);

    const rem = await request(app).delete(`/api/wishlist/${prod._id}`).set(authHeader(token));
    expect(rem.status).toBe(200);
  });
});