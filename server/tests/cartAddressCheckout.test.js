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
  authHeader,
  Product,
  Seller,
  Cart,
  Address,
  mongoose,
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

const makeApprovedProduct = async (overrides = {}) => {
  const cat = await makeCategory();
  const { seller } = await makeSeller();
  return makeProduct({ seller, category: cat, ...overrides });
};

describe("TASK 5 — CART ADD", () => {
  test("authenticated user can add a valid product", async () => {
    const prod = await makeApprovedProduct({ price: 500, stock: 10 });
    const { token } = await registerUser({ email: `add_${Date.now()}@test.com` });

    const res = await addToCart(token, prod._id, 2);
    expect(res.status).toBe(201);
    expect(res.body.data.cart.items).toHaveLength(1);
    expect(res.body.data.cart.items[0].quantity).toBe(2);
    expect(res.body.data.cart.items[0].availability).toBe(true);
    expect(res.body.data.cart.items[0].finalPrice).toBe(500);
  });

  test("unauthenticated user cannot add to cart", async () => {
    const prod = await makeApprovedProduct();
    const res = await request(app).post("/api/cart/items").send({ productId: prod._id, quantity: 1 });
    expect(res.status).toBe(401);
  });

  test("USER cannot add an inactive product", async () => {
    const prod = await makeApprovedProduct({ isActive: false });
    const { token } = await registerUser({ email: `inact_${Date.now()}@test.com` });
    const res = await addToCart(token, prod._id, 1);
    expect(res.status).toBe(404);
  });

  test("USER cannot add a rejected product", async () => {
    const prod = await makeApprovedProduct({ status: "REJECTED" });
    const { token } = await registerUser({ email: `rej_${Date.now()}@test.com` });
    const res = await addToCart(token, prod._id, 1);
    expect(res.status).toBe(404);
  });

  test("USER cannot add a product from an unapproved seller", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller({ status: "PENDING" });
    const prod = await makeProduct({ seller, category: cat, status: "APPROVED" });
    const { token } = await registerUser({ email: `pend_${Date.now()}@test.com` });
    const res = await addToCart(token, prod._id, 1);
    expect(res.status).toBe(404);
  });

  test("insufficient stock is rejected", async () => {
    const prod = await makeApprovedProduct({ stock: 2 });
    const { token } = await registerUser({ email: `stock_${Date.now()}@test.com` });
    const res = await addToCart(token, prod._id, 5);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Insufficient stock");
  });

  test("invalid quantity is rejected", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `qty_${Date.now()}@test.com` });
    const zero = await addToCart(token, prod._id, 0);
    expect(zero.status).toBe(422);
    const negative = await addToCart(token, prod._id, -1);
    expect(negative.status).toBe(422);
  });

  test("invalid product ID returns 400", async () => {
    const { token } = await registerUser({ email: `badid_${Date.now()}@test.com` });
    const res = await addToCart(token, "not-an-id", 1);
    expect(res.status).toBe(400);
  });

  test("duplicate product add updates quantity instead of duplicating the line, and revalidates stock", async () => {
    const prod = await makeApprovedProduct({ stock: 3 });
    const { token } = await registerUser({ email: `dup_${Date.now()}@test.com` });

    const first = await addToCart(token, prod._id, 1);
    expect(first.status).toBe(201);

    const second = await addToCart(token, prod._id, 2);
    expect(second.status).toBe(201);
    expect(second.body.data.cart.items).toHaveLength(1);
    expect(second.body.data.cart.items[0].quantity).toBe(3);

    const cart = await Cart.findOne({});
    expect(cart.items).toHaveLength(1);

    const over = await addToCart(token, prod._id, 1);
    expect(over.status).toBe(400);
    expect(over.body.message).toContain("Insufficient stock");
  });
});

describe("TASK 5 — CART UPDATE / REMOVE / GET", () => {
  test("user can update own cart item", async () => {
    const prod = await makeApprovedProduct({ stock: 10 });
    const { token } = await registerUser({ email: `upd_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);

    const res = await request(app)
      .put(`/api/cart/items/${prod._id}`)
      .set(authHeader(token))
      .send({ quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items[0].quantity).toBe(4);
  });

  test("user cannot update another user's cart item", async () => {
    const prod = await makeApprovedProduct({ stock: 10 });
    const a = await registerUser({ email: `updA_${Date.now()}@test.com` });
    const b = await registerUser({ email: `updB_${Date.now()}@test.com` });
    await addToCart(a.token, prod._id, 1);

    const res = await request(app)
      .put(`/api/cart/items/${prod._id}`)
      .set(authHeader(b.token))
      .send({ quantity: 2 });
    expect(res.status).toBe(404);
  });

  test("user can remove own cart item", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `rm_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);

    const res = await request(app).delete(`/api/cart/items/${prod._id}`).set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toHaveLength(0);
    expect(res.body.data.cart.totals.total).toBe(0);
  });

  test("user cannot remove another user's cart item", async () => {
    const prod = await makeApprovedProduct();
    const a = await registerUser({ email: `rmA_${Date.now()}@test.com` });
    const b = await registerUser({ email: `rmB_${Date.now()}@test.com` });
    await addToCart(a.token, prod._id, 1);

    const res = await request(app).delete(`/api/cart/items/${prod._id}`).set(authHeader(b.token));
    expect(res.status).toBe(404);
  });

  test("GET cart returns only the authenticated user's cart", async () => {
    const prodA = await makeApprovedProduct({ price: 100 });
    const prodB = await makeApprovedProduct({ price: 200 });
    const a = await registerUser({ email: `gA_${Date.now()}@test.com` });
    const b = await registerUser({ email: `gB_${Date.now()}@test.com` });
    await addToCart(a.token, prodA._id, 1);
    await addToCart(b.token, prodB._id, 1);

    const cartA = await request(app).get("/api/cart").set(authHeader(a.token));
    const cartB = await request(app).get("/api/cart").set(authHeader(b.token));

    expect(cartA.status).toBe(200);
    expect(cartA.body.data.cart.items).toHaveLength(1);
    expect(cartA.body.data.cart.items[0].productId).toBe(String(prodA._id));
    expect(cartB.body.data.cart.items[0].productId).toBe(String(prodB._id));
  });

  test("server calculates authoritatively; frontend-supplied price cannot override database price", async () => {
    const prod = await makeApprovedProduct({ price: 1000, discount: 20, stock: 10 }); // finalPrice 800
    const { token } = await registerUser({ email: `price_${Date.now()}@test.com` });

    // Frontend tries to inject a fake price.
    const res = await request(app)
      .post("/api/cart/items")
      .set(authHeader(token))
      .send({ productId: prod._id, quantity: 2, price: 1, finalPrice: 1 });
    expect(res.status).toBe(201);

    const cart = await request(app).get("/api/cart").set(authHeader(token));

    const item = cart.body.data.cart.items[0];
    expect(item.price).toBe(1000);
    expect(item.finalPrice).toBe(800);
    expect(item.lineTotal).toBe(1600);

    const totals = cart.body.data.cart.totals;
    expect(totals.subtotal).toBe(2000);
    expect(totals.discount).toBe(400);
    expect(totals.total).toBe(1600);
    expect(totals.itemCount).toBe(1);
    expect(totals.totalQuantity).toBe(2);

    // Seller changes the price afterwards: the cart must reflect the CURRENT DB price,
    // never the old snapshot stored at add time. (finalPrice is derived by the product
    // hooks; updating both fields mirrors a validated product price edit.)
    await Product.updateOne({ _id: prod._id }, { price: 2000, finalPrice: 2000 });
    const prodDoc = await Product.findById(prod._id).select("price discount finalPrice");
    expect(prodDoc.finalPrice).toBe(2000);

    const cart2 = await request(app).get("/api/cart").set(authHeader(token));
    expect(cart2.body.data.cart.items[0].finalPrice).toBe(2000);
    expect(cart2.body.data.cart.totals.total).toBe(4000);
  });

  test("unavailable items are identified on GET cart", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `unav_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);

    await Product.updateOne({ _id: prod._id }, { isActive: false });

    const cart = await request(app).get("/api/cart").set(authHeader(token));
    expect(cart.body.data.cart.items[0].availability).toBe(false);
    expect(cart.body.data.cart.items[0].unavailableReason).toBe("Product is currently inactive");
    expect(cart.body.data.cart.totals.total).toBe(0);
  });

  test("empty cart has zero totals and works for an authenticated user", async () => {
    const { token } = await registerUser({ email: `empty_${Date.now()}@test.com` });
    const res = await request(app).get("/api/cart").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([]);
    expect(res.body.data.cart.totals.total).toBe(0);
    expect(res.body.data.cart.totals.subtotal).toBe(0);
  });
});

describe("TASK 5 — ADDRESS MANAGEMENT", () => {
  test("authenticated user can create an address; first address becomes default", async () => {
    const { token } = await registerUser({ email: `addr_${Date.now()}@test.com` });
    const res = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({
        name: "Home",
        phone: "9876543210",
        addressLine1: "1 MG Road",
        city: "Pune",
        state: "Maharashtra",
        postalCode: "411001",
        country: "India",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.address.isDefault).toBe(true);
  });

  test("address creation validates required fields", async () => {
    const { token } = await registerUser({ email: `addrreq_${Date.now()}@test.com` });
    const res = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Home" });
    expect(res.status).toBe(422);
  });

  test("at most one default address exists; setting a new default unsets the previous", async () => {
    const { token } = await registerUser({ email: `def_${Date.now()}@test.com` });

    const a1 = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Home", phone: "9876543210", addressLine1: "1 MG Road", city: "Pune", state: "Maharashtra", postalCode: "411001" });
    expect(a1.body.data.address.isDefault).toBe(true);

    const a2 = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Office", phone: "9876543210", addressLine1: "2 FC Road", city: "Pune", state: "Maharashtra", postalCode: "411004", isDefault: true });
    expect(a2.status).toBe(201);
    expect(a2.body.data.address.isDefault).toBe(true);

    const all = await Address.find({ user: a1.body.data.address.user });
    expect(all).toHaveLength(2);
    expect(all.filter((a) => a.isDefault)).toHaveLength(1);
  });

  test("user can edit own address", async () => {
    const { token } = await registerUser({ email: `edit_${Date.now()}@test.com` });
    const created = await addAddress(token);
    const id = created.body.data.address._id;

    const res = await request(app)
      .put(`/api/users/addresses/${id}`)
      .set(authHeader(token))
      .send({ city: "Mumbai", postalCode: "400001" });
    expect(res.status).toBe(200);
    expect(res.body.data.address.city).toBe("Mumbai");
    expect(res.body.data.address.postalCode).toBe("400001");
  });

  test("user cannot edit another user's address", async () => {
    const a = await registerUser({ email: `ea_${Date.now()}@test.com` });
    const b = await registerUser({ email: `eb_${Date.now()}@test.com` });
    const created = await addAddress(a.token);
    const id = created.body.data.address._id;

    const res = await request(app)
      .put(`/api/users/addresses/${id}`)
      .set(authHeader(b.token))
      .send({ city: "Delhi" });
    expect(res.status).toBe(404);
  });

  test("address ownership cannot be transferred by crafting a body user field", async () => {
    const a = await registerUser({ email: `oa_${Date.now()}@test.com` });
    const b = await registerUser({ email: `ob_${Date.now()}@test.com` });
    const created = await addAddress(a.token);
    const id = created.body.data.address._id;

    const res = await request(app)
      .put(`/api/users/addresses/${id}`)
      .set(authHeader(a.token))
      .send({ user: b.user._id, city: "Chennai" });
    expect(res.status).toBe(200);

    const doc = await Address.findById(id);
    expect(String(doc.user)).toBe(String(a.user._id));
    expect(doc.city).toBe("Chennai");
  });

  test("user can delete own address; deleting the default reassigns it", async () => {
    const { token } = await registerUser({ email: `del_${Date.now()}@test.com` });
    const a1 = await addAddress(token);
    const a2 = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Office", phone: "9876543210", addressLine1: "2 FC Road", city: "Pune", state: "Maharashtra", postalCode: "411004", isDefault: true });

    const id1 = a1.body.data.address._id;
    const id2 = a2.body.data.address._id;

    const del = await request(app).delete(`/api/users/addresses/${id2}`).set(authHeader(token));
    expect(del.status).toBe(200);

    const remaining = await Address.findById(id1);
    expect(remaining.isDefault).toBe(true);

    const delRemaining = await request(app).delete(`/api/users/addresses/${id1}`).set(authHeader(token));
    expect(delRemaining.status).toBe(200);

    const empty = await request(app).get("/api/users/addresses").set(authHeader(token));
    expect(empty.body.data.addresses).toEqual([]);
  });

  test("user can set a default address explicitly", async () => {
    const { token } = await registerUser({ email: `setdef_${Date.now()}@test.com` });
    const a1 = await addAddress(token);
    const a2res = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Office", phone: "9876543210", addressLine1: "2 FC Road", city: "Pune", state: "Maharashtra", postalCode: "411004", isDefault: true });
    const id1 = a1.body.data.address._id;
    const id2 = a2res.body.data.address._id;

    const res = await request(app).patch(`/api/users/addresses/${id1}/default`).set(authHeader(token));
    expect(res.status).toBe(200);

    const list = await request(app).get("/api/users/addresses").set(authHeader(token));
    const first = list.body.data.addresses.find((x) => x._id === id1);
    const second = list.body.data.addresses.find((x) => x._id === id2);
    expect(first.isDefault).toBe(true);
    expect(second.isDefault).toBe(false);
  });
});

describe("TASK 5 — CHECKOUT SUMMARY", () => {
  test("checkout summary without auth returns 401", async () => {
    const res = await request(app).get("/api/checkout/summary");
    expect(res.status).toBe(401);
  });

  test("checkout summary rejects an empty cart", async () => {
    const { token } = await registerUser({ email: `csEmpty_${Date.now()}@test.com` });
    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("cart is empty");
  });

  test("checkout summary computes authoritative totals and loads the default address", async () => {
    const prod = await makeApprovedProduct({ price: 1000, discount: 20, stock: 10 }); // final 800
    const { token } = await registerUser({ email: `cs_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 2);
    const addr = await addAddress(token);
    const defaultId = addr.body.data.address._id;

    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.totals.total).toBe(1600);
    expect(res.body.data.totals.discount).toBe(400);
    expect(res.body.data.totals.subtotal).toBe(2000);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].finalPrice).toBe(800);
    expect(res.body.data.address._id).toBe(defaultId);
    expect(res.body.data.address.user).not.toBeUndefined();
  });

  test("checkout summary honours an explicitly selected own address", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `csSel_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);
    const a1 = await addAddress(token);
    const a2 = await request(app)
      .post("/api/users/addresses")
      .set(authHeader(token))
      .send({ name: "Work", phone: "9876543210", addressLine1: "9 Tech Park", city: "Bengaluru", state: "Karnataka", postalCode: "560001" });
    const id2 = a2.body.data.address._id;

    const res = await request(app)
      .get(`/api/checkout/summary?addressId=${id2}`)
      .set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.data.address._id).toBe(id2);
    expect(a1.body.data.address.isDefault).toBe(true);
  });

  test("checkout summary rejects an address belonging to another user", async () => {
    const prod = await makeApprovedProduct();
    const a = await registerUser({ email: `cpA_${Date.now()}@test.com` });
    const b = await registerUser({ email: `cpB_${Date.now()}@test.com` });
    await addToCart(a.token, prod._id, 1);
    await addAddress(b.token);
    const it = await Address.findOne({});
    const bAddr = it._id;

    const res = await request(app)
      .get(`/api/checkout/summary?addressId=${bAddr}`)
      .set(authHeader(a.token));
    expect(res.status).toBe(404);
  });

  test("checkout summary rejects an invalid address ID", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `csBad_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);
    const res = await request(app)
      .get("/api/checkout/summary?addressId=not-an-id")
      .set(authHeader(token));
    expect(res.status).toBe(400);
  });

  test("checkout summary revalidates stock", async () => {
    const prod = await makeApprovedProduct({ stock: 3 });
    const { token } = await registerUser({ email: `csStk_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 2);
    await addAddress(token);

    await Product.updateOne({ _id: prod._id }, { stock: 1 });

    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Insufficient stock");
  });

  test("checkout summary revalidates product status", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `csSt_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);
    await addAddress(token);

    await Product.updateOne({ _id: prod._id }, { isActive: false });
    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("inactive");
  });

  test("checkout summary revalidates seller approval", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });
    const { token } = await registerUser({ email: `csSelr_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);
    await addAddress(token);

    await Seller.updateOne({ _id: seller._id }, { status: "SUSPENDED" });

    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Seller");
  });

  test("checkout summary fails clearly when a product no longer exists", async () => {
    const prod = await makeApprovedProduct();
    const { token } = await registerUser({ email: `csGone_${Date.now()}@test.com` });
    await addToCart(token, prod._id, 1);
    await addAddress(token);

    await Product.deleteOne({ _id: prod._id });

    const res = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("no longer available");
  });

  test("multi-seller cart can contain products from multiple approved sellers", async () => {
    const cat1 = await makeCategory();
    const { seller: s1 } = await makeSeller();
    const prod1 = await makeProduct({ seller: s1, category: cat1, price: 300, stock: 5 });

    const cat2 = await makeCategory();
    const { seller: s2 } = await makeSeller();
    const prod2 = await makeProduct({ seller: s2, category: cat2, price: 700, stock: 5 });

    const { token } = await registerUser({ email: `multi_${Date.now()}@test.com` });

    const add1 = await addToCart(token, prod1._id, 1);
    expect(add1.status).toBe(201);
    const add2 = await addToCart(token, prod2._id, 1);
    expect(add2.status).toBe(201);

    const cart = await request(app).get("/api/cart").set(authHeader(token));
    expect(cart.body.data.cart.items).toHaveLength(2);
    expect(cart.body.data.cart.totals.total).toBe(1000);

    const sellerIds = cart.body.data.cart.items.map((i) => String(i.seller._id)).sort();
    expect(sellerIds).toEqual([String(s1._id), String(s2._id)].sort());

    await addAddress(token);
    const summary = await request(app).get("/api/checkout/summary").set(authHeader(token));
    expect(summary.status).toBe(200);
    expect(summary.body.data.items).toHaveLength(2);
    expect(summary.body.data.totals.total).toBe(1000);
  });
});