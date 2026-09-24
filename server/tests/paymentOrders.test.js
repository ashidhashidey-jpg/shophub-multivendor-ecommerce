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
  installRazorpayMock,
  restoreRazorpay,
  makePaymentSignature,
  User,
  Seller,
  Product,
  Order,
  Payment,
  Cart,
} = require("./helpers");

const SECRET = process.env.RAZORPAY_KEY_SECRET;
const PUBLIC_KEY = process.env.RAZORPAY_KEY_ID;

beforeAll(async () => {
  await setup();
  installRazorpayMock();
});

afterEach(async () => {
  await cleanup();
});

afterAll(async () => {
  restoreRazorpay();
  await teardown();
});

const makeAdmin = async () => {
  const creds = await registerUser({ email: `admin_${Math.random().toString(36).slice(2, 8)}@test.com` });
  await User.findByIdAndUpdate(creds.user._id, { role: "ADMIN" });
  return creds.token;
};

const buildBuyerWithCart = async ({ productId, qty = 1 } = {}) => {
  const buyer = await registerUser({ email: `buyer_${Math.random().toString(36).slice(2, 8)}@test.com` });
  await addToCart(buyer.token, productId, qty);
  const addrRes = await addAddress(buyer.token);
  return { buyer, addressId: addrRes.body.data.address._id };
};

const createRzOrder = async (token, addressId, extra = {}) =>
  request(app).post("/api/payment/create-order").set(authHeader(token)).send({ addressId, ...extra });

const verifyRz = async (token, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) =>
  request(app)
    .post("/api/payment/verify")
    .set(authHeader(token))
    .send({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

const verifySignature = (orderId) => makePaymentSignature(orderId, `pay_mock_${Date.now()}`);

describe("PAYMENT ORDER CREATION", () => {
  test("unauthenticated payment-order creation -> 401", async () => {
    const res = await request(app).post("/api/payment/create-order").send({ addressId: "x".repeat(24) });
    expect(res.status).toBe(401);
  });

  test("unauthenticated orders list -> 401", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  test("SELLER cannot create a payment order or list orders -> 403", async () => {
    const { sellerToken } = await makeSeller();
    const res1 = await request(app).post("/api/payment/create-order").send({ addressId: "x".repeat(24) });
    expect(res1.status).toBe(401); // no auth header at all
    const res2 = await request(app).get("/api/orders").set(authHeader(sellerToken));
    expect(res2.status).toBe(403);
  });

  test("empty cart -> 400", async () => {
    const buyer = await registerUser({ email: `ec_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const addr = await addAddress(buyer.token);
    const res = await createRzOrder(buyer.token, addr.body.data.address._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cart is empty/i);
  });

  test("missing or malformed addressId -> 400; foreign address -> 404", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });

    const missing = await createRzOrder(buyer.token, undefined);
    expect(missing.status).toBe(400);
    expect(missing.body.message).toMatch(/validation/i);

    const badId = await createRzOrder(buyer.token, "not-an-object-id");
    expect(badId.status).toBe(400);

    const other = await registerUser({ email: `oo_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const otherAddr = await addAddress(other.token);
    const foreign = await createRzOrder(buyer.token, otherAddr.body.data.address._id);
    expect(foreign.status).toBe(404);
  });

  test("cart is revalidated before payment order creation (inactive product -> 400)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 500, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });

    await Product.updateOne({ _id: prod._id }, { $set: { isActive: false } });

    const res = await createRzOrder(buyer.token, addressId);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot be purchased/i);
  });

  test("server computes amount in paise; client cannot forge the amount", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 1000, stock: 20 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const res = await createRzOrder(buyer.token, addressId, { amount: 1, total: 1, amountPaise: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(2000);
    expect(res.body.data.amountPaise).toBe(200000);
    expect(res.body.data.currency).toBe("INR");

    // the stub gateway received exactly the server-computed paise amount
    const payment = await Payment.findOne({ razorpayOrderId: res.body.data.razorpayOrderId });
    expect(payment.amountPaise).toBe(200000);
    expect(payment.amount).toBe(2000);
    expect(payment.user.toString()).toBe(String(buyer.user._id));
  });

  test("only the public Razorpay key is returned: the secret never leaves the server", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });

    const res = await createRzOrder(buyer.token, addressId);
    expect(res.status).toBe(201);
    expect(typeof res.body.data.keyId).toBe("string");
    expect(res.body.data.keyId).toBe(PUBLIC_KEY);

    const walk = (node, name = "") => {
      if (node && typeof node === "object") {
        for (const k of Object.keys(node)) {
          expect(k.toLowerCase()).not.toMatch(/secret/);
          walk(node[k], k);
        }
      } else if (typeof node === "string") {
        if (SECRET) expect(node).not.toContain(SECRET);
      }
    };
    walk(res.body.data);
    expect(JSON.stringify(res.body)).not.toContain("RAZORPAY_KEY_SECRET");
  });
});

describe("PAYMENT VERIFICATION + ORDER CREATION", () => {
  test("malformed verify payload -> 422; unknown order id -> 400", async () => {
    const buyer = await registerUser({ email: `vp_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const empty = await verifyRz(buyer.token, { razorpayOrderId: "", razorpayPaymentId: "", razorpaySignature: "" });
    expect(empty.status).toBe(422);

    const unknown = await verifyRz(buyer.token, {
      razorpayOrderId: "order_unknown",
      razorpayPaymentId: "pay_unknown",
      razorpaySignature: makePaymentSignature("order_unknown", "pay_unknown"),
    });
    expect(unknown.status).toBe(400);
  });

  test("invalid signature -> 400: no order, stock unchanged, cart intact, payment FAILED", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 500, stock: 3 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const created = await createRzOrder(buyer.token, addressId);
    expect(created.status).toBe(201);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_mock_1",
      razorpaySignature: "f".repeat(64),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);

    expect(await Order.countDocuments({})).toBe(0);
    expect((await Product.findById(prod._id)).stock).toBe(3);
    expect((await Cart.findOne({ user: buyer.user._id })).items.length).toBe(1);
    const payment = await Payment.findOne({ razorpayOrderId });
    expect(payment.status).toBe("FAILED");
  });

  test("valid signature -> order created, stock reduced, cart cleared, PAID", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 500, stock: 3 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_mock_1",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_mock_1"),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.order.paymentStatus).toBe("PAID");
    expect(res.body.data.order.orderStatus).toBe("PENDING");
    expect(res.body.data.order.items[0].quantity).toBe(2);
    expect(res.body.data.order.items[0].status).toBe("PENDING");
    expect(res.body.data.order.total).toBe(1000);
    expect(res.body.data.order.sellerCount).toBe(1);
    expect(res.body.data.orders.length).toBe(1);

    expect((await Product.findById(prod._id)).stock).toBe(1);
    expect((await Cart.findOne({ user: buyer.user._id })).items.length).toBe(0);

    const payment = await Payment.findOne({ razorpayOrderId });
    expect(payment.status).toBe("PAID");
    expect(payment.razorpayPaymentId).toBe("pay_mock_1");
  });

  test("order total equals the verified payment amount", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 999.99, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 3 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_equal",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_equal"),
    });

    expect(res.status).toBe(201);
    const payment = await Payment.findOne({ razorpayOrderId });
    expect(Math.round(res.body.data.order.total * 100)).toBe(payment.amountPaise);
    expect(res.body.data.order.total).toBe(2999.97);
  });

  test("payment belonging to another user is rejected", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const attacker = await registerUser({ email: `atk_${Math.random().toString(36).slice(2, 8)}@test.com` });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(attacker.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_steal",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_steal"),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not found for this account/i);
    expect(await Order.countDocuments({})).toBe(0);
  });

  test("amount mismatch (price changed) -> 400, no order, stock unchanged, cart intact", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 1000, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    // price changes between quote and payment -> must be rejected
    await Product.updateOne({ _id: prod._id }, { $set: { price: 2000, finalPrice: 2000 } });

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_mismatch",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_mismatch"),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/amount changed|price manipulation/i);

    expect(await Order.countDocuments({})).toBe(0);
    expect((await Product.findById(prod._id)).stock).toBe(5);
    expect((await Cart.findOne({ user: buyer.user._id })).items.length).toBe(1);
  });

  test("cart changed between quote and payment -> 400, no order", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 1000, stock: 20 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 1 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    await addToCart(buyer.token, prod._id, 1); // quantity now 2

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_cartchange",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_cartchange"),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cart changed/i);
    expect(await Order.countDocuments({})).toBe(0);
  });

  test("gateway amount mismatch -> 400 (money-safe), no order", async () => {
    const tg = installRazorpayMock(); // fresh stub for this test
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 700, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });

    tg.mock.payments.fetch = async () => ({ id: "pay_under", amount: 69999, currency: "INR", status: "captured" });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;
    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_under",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_under"),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
    expect(await Order.countDocuments({})).toBe(0);

    // do not let the overridden fetch leak into other tests
    installRazorpayMock();
  });

  test("insufficient stock at verification -> 400, no order, no decrement, cart intact", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 3 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    await Product.updateOne({ _id: prod._id }, { $set: { stock: 1 } });

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_lowstock",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_lowstock"),
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/insufficient stock/i);

    expect(await Order.countDocuments({})).toBe(0);
    expect((await Product.findById(prod._id)).stock).toBe(1);
    expect((await Cart.findOne({ user: buyer.user._id })).items.length).toBe(1);
  });

  test("concurrent/oversell safety: two buyers race for last unit; loser kept safe", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 1 });

    const b1 = await buildBuyerWithCart({ productId: prod._id, qty: 1 });
    const b2 = await buildBuyerWithCart({ productId: prod._id, qty: 1 });

    const o1 = await createRzOrder(b1.buyer.token, b1.addressId);
    const o2 = await createRzOrder(b2.buyer.token, b2.addressId);

    const ok = await verifyRz(b1.buyer.token, {
      razorpayOrderId: o1.body.data.razorpayOrderId,
      razorpayPaymentId: "pay_r1",
      razorpaySignature: makePaymentSignature(o1.body.data.razorpayOrderId, "pay_r1"),
    });
    expect(ok.status).toBe(201);

    const loser = await verifyRz(b2.buyer.token, {
      razorpayOrderId: o2.body.data.razorpayOrderId,
      razorpayPaymentId: "pay_r2",
      razorpaySignature: makePaymentSignature(o2.body.data.razorpayOrderId, "pay_r2"),
    });
    expect(loser.status).toBe(400);
    expect(loser.body.message).toMatch(/insufficient stock/i);

    expect((await Product.findById(prod._id)).stock).toBe(0);
    expect(await Order.countDocuments({})).toBe(1); // only buyer 1 got an order
    expect((await Cart.findOne({ user: b2.buyer.user._id })).items.length).toBe(1);
  });

  test("duplicate callback creates no duplicate orders", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 1 });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const first = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_dup",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_dup"),
    });
    expect(first.status).toBe(201);

    const second = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_dup",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_dup"),
    });
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    expect(await Order.countDocuments({})).toBe(1);
    expect(await Payment.countDocuments({})).toBe(1);
    expect((await Product.findById(prod._id)).stock).toBe(4);
  });

  test("RAZORPAY is rejected via POST /api/orders with a clear message", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const res = await request(app)
      .post("/api/orders")
      .set(authHeader(buyer.token))
      .send({ addressId, paymentMethod: "RAZORPAY" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payment\/create-order/i);
  });
});

describe("MULTI-SELLER ORDERS", () => {
  test("one payment -> one order record per seller; sellers isolated; customer sees complete purchase", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "A Product", price: 100, stock: 10 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "B Product", price: 200, stock: 10 });

    const buyer = await registerUser({ email: `ms_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 1);
    await addToCart(buyer.token, prodB._id, 2);
    const addr = await addAddress(buyer.token);

    const created = await createRzOrder(buyer.token, addr.body.data.address._id);
    expect(created.status).toBe(201);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_multiseller",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_multiseller"),
    });

    expect(res.status).toBe(201);
    const { orders, purchase } = res.body.data;
    expect(orders.length).toBe(2);
    expect(purchase.total).toBe(500);
    expect(purchase.items.length).toBe(2);
    expect(purchase.sellerCount).toBe(2);

    const sellerIds = orders.map((o) => String(o.seller)).sort();
    expect(sellerIds).toEqual([String(sellerA.seller._id), String(sellerB.seller._id)].sort());

    const orderA = orders.find((o) => String(o.seller) === String(sellerA.seller._id));
    const orderB = orders.find((o) => String(o.seller) === String(sellerB.seller._id));
    expect(orderA.items.map((i) => i.name)).toEqual(["A Product"]);
    expect(orderA.total).toBe(100);
    expect(orderB.items.map((i) => i.name)).toEqual(["B Product"]);
    expect(orderB.items[0].quantity).toBe(2);
    expect(orderB.total).toBe(400);

    // seller views
    const ordersA = await request(app).get("/api/sellers/orders").set(authHeader(sellerA.sellerToken));
    expect(ordersA.status).toBe(200);
    expect(ordersA.body.data.orders.length).toBe(1);
    expect(ordersA.body.data.orders[0].items.map((i) => i.name)).toEqual(["A Product"]);
    expect(ordersA.body.data.orders[0].otherSellerItemsCount).toBe(1);
    expect(ordersA.body.data.orders[0].sellerSubtotal).toBe(100);

    const ordersB = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    expect(ordersB.body.data.orders.length).toBe(1);
    expect(ordersB.body.data.orders[0].items.map((i) => i.name)).toEqual(["B Product"]);
    expect(ordersB.body.data.orders[0].otherSellerItemsCount).toBe(1);

    // Seller B cannot open Seller A's order record
    const cross = await request(app)
      .get(`/api/sellers/orders/${orderA._id}`)
      .set(authHeader(sellerB.sellerToken));
    expect(cross.status).toBe(404);
  });

  test("no separate payment per seller: one Payment record for a multi-seller checkout", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, price: 50, stock: 5 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, price: 50, stock: 5 });

    const buyer = await registerUser({ email: `mp_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 1);
    await addToCart(buyer.token, prodB._id, 1);
    const addr = await addAddress(buyer.token);

    const created = await createRzOrder(buyer.token, addr.body.data.address._id);
    const razorpayOrderId = created.body.data.razorpayOrderId;

    const res = await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_one",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_one"),
    });
    expect(res.status).toBe(201);
    expect(res.body.data.order.sellerCount).toBe(2);
    expect(await Payment.countDocuments({ razorpayOrderId })).toBe(1);
  });
});

describe("ORDER ACCESS CONTROL + SNAPSHOTS", () => {
  test("customer cannot access another customer's order", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });

    const b1 = await buildBuyerWithCart({ productId: prod._id });
    const b2 = await buildBuyerWithCart({ productId: prod._id });

    const o1 = await createRzOrder(b1.buyer.token, b1.addressId);
    await verifyRz(b1.buyer.token, {
      razorpayOrderId: o1.body.data.razorpayOrderId,
      razorpayPaymentId: "pay_iso1",
      razorpaySignature: makePaymentSignature(o1.body.data.razorpayOrderId, "pay_iso1"),
    });

    const o2 = await createRzOrder(b2.buyer.token, b2.addressId);
    await verifyRz(b2.buyer.token, {
      razorpayOrderId: o2.body.data.razorpayOrderId,
      razorpayPaymentId: "pay_iso2",
      razorpaySignature: makePaymentSignature(o2.body.data.razorpayOrderId, "pay_iso2"),
    });

    const b1List = await request(app).get("/api/orders").set(authHeader(b1.buyer.token));
    expect(b1List.status).toBe(200);
    expect(b1List.body.data.orders.length).toBe(1);
    const b1OrderId = b1List.body.data.orders[0]._id;

    const steal = await request(app).get(`/api/orders/${b1OrderId}`).set(authHeader(b2.buyer.token));
    expect(steal.status).toBe(404);
  });

  test("admin can access order/payment data", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const adminToken = await makeAdmin();

    const created = await createRzOrder(buyer.token, addressId);
    await verifyRz(buyer.token, {
      razorpayOrderId: created.body.data.razorpayOrderId,
      razorpayPaymentId: "pay_admin",
      razorpaySignature: makePaymentSignature(created.body.data.razorpayOrderId, "pay_admin"),
    });

    const list = await request(app).get("/api/admin/orders").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.orders.length).toBe(1);
    expect(list.body.data.orders[0].paymentStatus).toBe("PAID");
    expect(list.body.data.orders[0].total).toBe(100);

    const pay = await request(app).get("/api/admin/orders").set(authHeader(buyer.token));
    expect(pay.status).toBe(403);
  });

  test("historical snapshots survive product changes", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, name: "Snapshot Original", price: 1234.5, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });

    const created = await createRzOrder(buyer.token, addressId);
    const razorpayOrderId = created.body.data.razorpayOrderId;
    await verifyRz(buyer.token, {
      razorpayOrderId,
      razorpayPaymentId: "pay_snap",
      razorpaySignature: makePaymentSignature(razorpayOrderId, "pay_snap"),
    });

    // the product changes after purchase
    await Product.updateOne(
      { _id: prod._id },
      { $set: { name: "Renamed Product", price: 99999, finalPrice: 99999, images: ["https://new.example.com/x.png"] } }
    );

    const list = await request(app).get("/api/orders").set(authHeader(buyer.token));
    const purchase = list.body.data.orders[0];
    expect(purchase.items[0].name).toBe("Snapshot Original");
    expect(purchase.items[0].price).toBe(1234.5);
    expect(purchase.total).toBe(1234.5);

    const detail2 = await request(app).get(`/api/orders/${purchase._id}`).set(authHeader(buyer.token));
    expect(detail2.status).toBe(200);
    expect(detail2.body.data.order.items[0].name).toBe("Snapshot Original");
    expect(detail2.body.data.order.total).toBe(1234.5);
  });

  test("COD orders keep the existing flow and initial PENDING payment state", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 250, stock: 4 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });

    const res = await placeCodOrder(buyer.token, addressId);
    expect(res.status).toBe(201);
    expect(res.body.data.order.paymentStatus).toBe("PENDING");
    expect(res.body.data.order.items[0].status).toBe("PENDING");
    expect(res.body.data.order.total).toBe(500);
    expect((await Product.findById(prod._id)).stock).toBe(2);

    const list = await request(app).get("/api/orders").set(authHeader(buyer.token));
    expect(list.status).toBe(200);
    expect(list.body.data.orders.length).toBe(1);
    expect(list.body.data.orders[0].paymentMethod).toBe("COD");
  });
});