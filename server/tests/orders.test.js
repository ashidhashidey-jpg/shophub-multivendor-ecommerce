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
  Order,
  Product,
  Seller,
  Cart,
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

const buildBuyerWithCart = async ({ productId, qty = 1 } = {}) => {
  const buyer = await registerUser({ email: `b_${Math.random().toString(36).slice(2, 8)}@test.com` });
  await addToCart(buyer.token, productId, qty);
  const addrRes = await addAddress(buyer.token);
  const addressId = addrRes.body.data.address._id;
  return { buyer, addressId };
};

describe("ORDERS — CRITICAL BUSINESS LOGIC", () => {
  test("order requires existing cart (empty cart -> 400)", async () => {
    const buyer = await registerUser({ email: "emptycart@test.com" });
    const addrRes = await addAddress(buyer.token);
    const res = await placeCodOrder(buyer.token, addrRes.body.data.address._id);
    expect(res.status).toBe(400);
  });

  test("order with multiple products and valid stock succeeds + stock decremented", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });

    const buyer = await registerUser({ email: "okorder@test.com" });
    await addToCart(buyer.token, prod._id, 2);
    const addr = await addAddress(buyer.token);
    const addressId = addr.body.data.address._id;

    const res = await placeCodOrder(buyer.token, addressId);
    expect(res.status).toBe(201);
    expect(res.body.data.order.items[0].quantity).toBe(2);
    expect(res.body.data.order.total).toBe(200);

    const after = await Product.findById(prod._id);
    expect(after.stock).toBe(3);
    // cart cleared
    const cartRes = await request(app).get("/api/cart").set(authHeader(buyer.token));
    expect(cartRes.body.data.cart.items.length).toBe(0);
  });

  // MANDATORY TEST 1: stock=5, request 6 -> 400, no order, stock unchanged
  test("stock 5 + quantity 6 -> 400, order NOT created, stock stays 5", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 50, stock: 5 });

    const buyer = await registerUser({ email: `stock_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await Cart.create({
      user: buyer.user._id,
      items: [
        {
          product: prod._id,
          seller: seller._id,
          name: prod.name,
          image: "",
          price: prod.finalPrice,
          quantity: 6,
        },
      ],
    });
    const addr = await addAddress(buyer.token);

    const res = await placeCodOrder(buyer.token, addr.body.data.address._id);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Insufficient stock");

    const [after, orderCount] = await Promise.all([
      Product.findById(prod._id),
      Order.countDocuments({}),
    ]);
    expect(after.stock).toBe(5);
    expect(orderCount).toBe(0);
  });

  test("server never trusts frontend price (uses DB price)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 5 });

    const buyer = await registerUser({ email: "pricesafe@test.com" });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);

    const res = await placeCodOrder(buyer.token, addr.body.data.address._id);
    expect(res.body.data.order.items[0].price).toBe(100);
    expect(res.body.data.order.total).toBe(100);
  });

  // MANDATORY TEST 9: multi-seller isolation
  test("multi-seller order: Seller A sees only A items, Seller B only B items", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "A Product", price: 100, stock: 10 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "B Product", price: 200, stock: 10 });

    const buyer = await registerUser({ email: `multi_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 1);
    await addToCart(buyer.token, prodB._id, 2);
    const addr = await addAddress(buyer.token);

    const res = await placeCodOrder(buyer.token, addr.body.data.address._id);
    expect(res.status).toBe(201);
    expect(res.body.data.order.items.length).toBe(2);
    expect(res.body.data.order.total).toBe(500);

    const ordersA = await request(app).get("/api/sellers/orders").set(authHeader(sellerA.sellerToken));
    expect(ordersA.status).toBe(200);
    expect(ordersA.body.data.orders.length).toBe(1);
    const itemsA = ordersA.body.data.orders[0].items;
    expect(itemsA.map((i) => i.name)).toEqual(["A Product"]);
    expect(itemsA[0].seller).toBe(String(sellerA.seller._id));
    expect(ordersA.body.data.orders[0].otherSellerItemsCount).toBe(1);

    const ordersB = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    const itemsB = ordersB.body.data.orders[0].items;
    expect(itemsB.map((i) => i.name)).toEqual(["B Product"]);
    expect(itemsB[0].quantity).toBe(2);
  });

  // MANDATORY TEST 8: cancellation restores stock exactly once
  test("cancel order restores stock to original value", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });

    const buyer = await registerUser({ email: `cancel_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prod._id, 3);
    const addr = await addAddress(buyer.token);

    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    expect(orderRes.status).toBe(201);
    expect((await Product.findById(prod._id)).stock).toBe(7);

    const orderId = orderRes.body.data.order._id;
    const cancel = await request(app).patch(`/api/orders/${orderId}/cancel`).set(authHeader(buyer.token));
    expect(cancel.status).toBe(200);
    expect((await Product.findById(prod._id)).stock).toBe(10);

    // second cancel rejected -> stock NOT restored twice
    const second = await request(app).patch(`/api/orders/${orderId}/cancel`).set(authHeader(buyer.token));
    expect(second.status).toBe(400);
    expect((await Product.findById(prod._id)).stock).toBe(10);
  });

  test("cannot cancel a shipped/delivered order", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });

    const buyer = await registerUser({ email: `nocancel_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    await Order.updateOne({ _id: orderId }, { $set: { "items.0.status": "SHIPPED" } });

    const cancel = await request(app).patch(`/api/orders/${orderId}/cancel`).set(authHeader(buyer.token));
    expect(cancel.status).toBe(400);
  });

  test("seller updates own item status (CONFIRMED -> SHIPPED -> DELIVERED)", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 50, stock: 10 });

    const buyer = await registerUser({ email: `status_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    const res = await request(app)
      .patch(`/api/sellers/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), status: "DELIVERED" });
    expect(res.status).toBe(200);
    expect(res.body.data.order.items[0].status).toBe("DELIVERED");
  });

  test("seller cannot set invalid transitions (e.g. CANCELLED)", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 50, stock: 10 });

    const buyer = await registerUser({ email: `badstatus_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    const res = await request(app)
      .patch(`/api/sellers/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), status: "CANCELLED" });
    expect(res.status).toBe(400);
  });

  test("seller cannot update another seller's order item", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, price: 50, stock: 10 });

    const buyer = await registerUser({ email: `steal_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodB._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;

    const res = await request(app)
      .patch(`/api/sellers/orders/${orderId}/status`)
      .set(authHeader(sellerA.sellerToken))
      .send({ productId: String(prodB._id), status: "DELIVERED" });
    expect(res.status).toBe(403);
  });

  test("user return request workflow + seller approval restores stock", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });

    const buyer = await registerUser({ email: `ret_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prod._id, 2);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const orderId = orderRes.body.data.order._id;
    expect((await Product.findById(prod._id)).stock).toBe(3);

    // deliver via seller
    await request(app)
      .patch(`/api/sellers/orders/${orderId}/status`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), status: "DELIVERED" });

    // user requests return
    const ret = await request(app)
      .patch(`/api/orders/${orderId}/return`)
      .set(authHeader(buyer.token))
      .send({ productId: String(prod._id), reason: "Changed my mind" });
    expect(ret.status).toBe(200);
    expect(ret.body.data.order.items[0].status).toBe("RETURN_REQUESTED");

    // return before delivery not possible
    const notShipped = await request(app)
      .patch(`/api/orders/${orderId}/return`)
      .set(authHeader(buyer.token))
      .send({ productId: String(prod._id) });
    expect(notShipped.status).toBe(400);

    // seller approves -> stock restored
    const approve = await request(app)
      .patch(`/api/sellers/orders/${orderId}/return`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), action: "APPROVE" });
    expect(approve.status).toBe(200);
    expect((await Product.findById(prod._id)).stock).toBe(5);

    // double approve -> 400 (stock restored once)
    const double = await request(app)
      .patch(`/api/sellers/orders/${orderId}/return`)
      .set(authHeader(sellerToken))
      .send({ productId: String(prod._id), action: "APPROVE" });
    expect(double.status).toBe(400);
    expect((await Product.findById(prod._id)).stock).toBe(5);
  });

  test("user can view own orders only (isolation)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prodA = await makeProduct({ seller, category: cat, price: 10, stock: 10 });
    const prodB = await makeProduct({ seller, category: cat, price: 20, stock: 10 });

    const buyer1 = await registerUser({ email: "iso1@test.com" });
    const buyer2 = await registerUser({ email: "iso2@test.com" });

    const makeOrder = async (buyer, prod) => {
      await addToCart(buyer.token, prod._id, 1);
      const addr = await addAddress(buyer.token);
      return placeCodOrder(buyer.token, addr.body.data.address._id);
    };
    await makeOrder(buyer1, prodA);
    await makeOrder(buyer2, prodB);

    const list1 = await request(app).get("/api/orders").set(authHeader(buyer1.token));
    expect(list1.body.data.orders.length).toBe(1);
    expect(list1.body.data.orders[0].items[0].product).toBe(String(prodA._id));

    const steal = await request(app).get(`/api/orders/${list1.body.data.orders[0]._id}`).set(authHeader(buyer2.token));
    expect(steal.status).toBe(404);
  });
});

describe("REVIEWS — PURCHASE VERIFICATION", () => {
  const deliverOrder = async (orderId) => {
    await Order.updateOne({ _id: orderId }, { $set: { "items.0.status": "DELIVERED" } });
  };

  // MANDATORY TEST 5: non-purchaser review -> 403
  test("non-purchaser cannot review a product -> 403", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const stranger = await registerUser({ email: "stranger@test.com" });
    const res = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(stranger.token))
      .send({ rating: 5, comment: "Great" });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("purchased");
  });

  test("review requires DELIVERED order", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser({ email: "notdeliv@test.com" });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);

    // status still PENDING -> not delivered
    const res = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 4, comment: "so far so good" });
    expect(res.status).toBe(403);
  });

  test("purchaser CAN review after delivery; duplicates rejected (409)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser({ email: "canreview@test.com" });
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    await deliverOrder(orderRes.body.data.order._id);

    const ok = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5, comment: "Excellent product!" });
    expect(ok.status).toBe(201);

    const dup = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 1 });
    expect(dup.status).toBe(409);

    const list = await request(app).get(`/api/products/${prod._id}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.data.reviews.length).toBe(1);
    expect(list.body.data.ratingSummary.averageRating).toBe(5);
  });

  test("review validation: rating out of range -> 422", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const res = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader((await registerUser({ email: "badrat@test.com" })).token))
      .send({ rating: 7 });
    expect(res.status).toBe(422);
  });
});