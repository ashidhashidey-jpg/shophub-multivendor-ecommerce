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
const razorpayConfig = require("../src/config/razorpay");

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

const createRzOrder = (token, addressId) =>
  request(app).post("/api/payment/create-order").set(authHeader(token)).send({ addressId });

const verifySignature = (orderId) => makePaymentSignature(orderId, `pay_refund_${Date.now()}`);

const payWithRazorpay = async (token, addressId) => {
  const created = await createRzOrder(token, addressId);
  expect(created.status).toBe(201);
  const razorpayOrderId = created.body.data.razorpayOrderId;
  const razorpayPaymentId = `pay_${Math.random().toString(36).slice(2, 10)}`;
  const verified = await request(app)
    .post("/api/payment/verify")
    .set(authHeader(token))
    .send({ razorpayOrderId, razorpayPaymentId, razorpaySignature: makePaymentSignature(razorpayOrderId, razorpayPaymentId) });
  expect(verified.status).toBe(201);
  return verified.body.data.purchase;
};

const deliverItem = (token, orderId, productId) =>
  request(app)
    .patch(`/api/sellers/orders/${orderId}/status`)
    .set(authHeader(token))
    .send({ productId: String(productId), status: "DELIVERED" });

const requestReturn = (token, orderId, productId, reason) =>
  request(app).patch(`/api/orders/${orderId}/return`).set(authHeader(token)).send({ productId: String(productId), reason });

const sellerReturnAction = (token, orderId, productId, action) =>
  request(app).patch(`/api/sellers/orders/${orderId}/return`).set(authHeader(token)).send({ productId: String(productId), action });

const adminRefund = (token, orderId, extra = {}) =>
  request(app).patch(`/api/admin/orders/${orderId}/refund`).set(authHeader(token)).send(extra);

describe("CANCELLATION — ACCESS CONTROL", () => {
  test("unauthenticated cancel -> 401", async () => {
    const res = await request(app).patch("/api/orders/111111111111111111111111/cancel");
    expect(res.status).toBe(401);
  });

  test("unauthenticated return / admin returns -> 401", async () => {
    expect((await request(app).patch("/api/orders/111111111111111111111111/return")).status).toBe(401);
    expect((await request(app).get("/api/admin/returns")).status).toBe(401);
  });

  test("SELLER cannot cancel a customer order or access admin returns -> 403", async () => {
    const { sellerToken } = await makeSeller();
    const res = await request(app).patch("/api/orders/111111111111111111111111/cancel").set(authHeader(sellerToken));
    expect(res.status).toBe(403);
    const admin = await request(app).get("/api/admin/returns").set(authHeader(sellerToken));
    expect(admin.status).toBe(403);
  });

  test("USER cannot access admin returns or refund/return action endpoints -> 403", async () => {
    const buyer = await registerUser({ email: `noadmin_${Math.random().toString(36).slice(2, 8)}@test.com` });
    expect((await request(app).get("/api/admin/returns").set(authHeader(buyer.token))).status).toBe(403);
    expect(
      (await request(app).patch("/api/admin/orders/111111111111111111111111/refund").set(authHeader(buyer.token))).status
    ).toBe(403);
    expect(
      (await request(app).patch("/api/admin/orders/111111111111111111111111/return").set(authHeader(buyer.token))).status
    ).toBe(403);
  });

  test("invalid order ID on cancel/return/refund -> 400", async () => {
    const buyer = await registerUser({ email: `badid_${Math.random().toString(36).slice(2, 8)}@test.com` });
    expect((await request(app).patch("/api/orders/not-an-id/cancel").set(authHeader(buyer.token))).status).toBe(400);
    expect((await request(app).patch("/api/orders/not-an-id/return").set(authHeader(buyer.token))).status).toBe(400);
    const admin = await makeAdmin();
    expect((await adminRefund(admin, "not-an-id", {})).status).toBe(400);
  });
});

describe("CANCELLATION — ELIGIBILITY, IDEMPOTENCY, STOCK", () => {
  test("customer can cancel own COD order once; stock restored exactly once", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 3 });

    const orderRes = await placeCodOrder(buyer.token, addressId);
    expect(orderRes.status).toBe(201);
    expect((await Product.findById(prod._id)).stock).toBe(7);

    const res = await request(app).patch(`/api/orders/${orderRes.body.data.order._id}/cancel`).set(authHeader(buyer.token));
    expect(res.status).toBe(200);
    expect(res.body.data.order.orderStatus).toBe("CANCELLED");
    expect((await Product.findById(prod._id)).stock).toBe(10);

    // second cancellation attempt must NOT double-restore
    const second = await request(app)
      .patch(`/api/orders/${orderRes.body.data.order._id}/cancel`)
      .set(authHeader(buyer.token));
    expect(second.status).toBe(400);
    expect((await Product.findById(prod._id)).stock).toBe(10);
  });

  test("customer cannot cancel another customer's order -> 404", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });
    const b1 = await buildBuyerWithCart({ productId: prod._id });
    const b2 = await buildBuyerWithCart({ productId: prod._id });

    const o1 = await placeCodOrder(b1.buyer.token, b1.addressId);
    const stolen = await request(app).patch(`/api/orders/${o1.body.data.order._id}/cancel`).set(authHeader(b2.buyer.token));
    expect(stolen.status).toBe(404);
    expect((await Order.findById(o1.body.data.order._id)).items[0].status).toBe("PENDING");
  });

  test("cancellation blocked after PROCESSING/SHIPPED/DELIVERED", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;

    for (const status of ["PROCESSING", "SHIPPED", "DELIVERED"]) {
      await Order.updateOne({ _id: orderId }, { $set: { "items.0.status": status } });
      const res = await request(app).patch(`/api/orders/${orderId}/cancel`).set(authHeader(buyer.token));
      expect(res.status).toBe(400);
      expect((await Order.findById(orderId)).items[0].status).toBe(status);
    }
    expect((await Product.findById(prod._id)).stock).toBe(9);
  });

  test("COD cancellation never calls the gateway", async () => {
    const tg = installRazorpayMock();
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 20, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);

    await request(app).patch(`/api/orders/${orderRes.body.data.order._id}/cancel`).set(authHeader(buyer.token));
    expect(tg.calls.refunds.length).toBe(0);
    expect((await Product.findById(prod._id)).stock).toBe(10);
  });

  test("paid cancellation -> CANCELLED refund-eligible -> admin refund via gateway", async () => {
    const tg = installRazorpayMock();
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 100, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 3 });
    const adminToken = await makeAdmin();

    const purchase = await payWithRazorpay(buyer.token, addressId);
    expect(purchase.paymentStatus).toBe("PAID");
    expect((await Product.findById(prod._id)).stock).toBe(7);

    const cancel = await request(app).patch(`/api/orders/${purchase._id}/cancel`).set(authHeader(buyer.token));
    expect(cancel.status).toBe(200);
    const order = await Order.findOne({ _id: purchase._id });
    expect(order.items[0].status).toBe("CANCELLED");
    expect(order.items[0].cancelledAt).toBeTruthy();
    // stock restored exactly once at cancellation
    expect((await Product.findById(prod._id)).stock).toBe(10);
    // still PAID -> refund-eligible; cancel itself issues no gateway refund
    expect(order.paymentStatus).toBe("PAID");
    expect(tg.calls.refunds.length).toBe(0);

    // admin refunds the cancelled paid order
    const refund = await adminRefund(adminToken, purchase._id, { productId: String(prod._id) });
    expect(refund.status).toBe(200);
    const after = await Order.findById(purchase._id);
    expect(after.items[0].status).toBe("REFUNDED");
    expect(after.items[0].refundId).toBeTruthy();
    expect(after.paymentStatus).toBe("REFUNDED");
    expect(tg.calls.refunds.length).toBe(1);
    expect(tg.calls.refunds[0]).toBe(after.razorpayPaymentId);
    // refund does NOT restore stock a second time
    expect((await Product.findById(prod._id)).stock).toBe(10);
  });
});

describe("RETURN REQUESTS — ELIGIBILITY, REASON, OWNERSHIP", () => {
  const prepareDelivered = async ({ token, productId, qty = 1 }) => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;
    const delivered = await deliverItem(sellerToken, orderId, prod._id);
    expect(delivered.status).toBe(200);
    return { buyer, orderId, prod, sellerToken };
  };

  test("delivered order can request return; reason stored (visible to seller + admin)", async () => {
    const { buyer, orderId, prod, sellerToken } = await prepareDelivered({ token: null });
    const res = await requestReturn(buyer.token, orderId, prod._id, "Changed my mind");
    expect(res.status).toBe(200);
    expect(res.body.data.order.items[0].status).toBe("RETURN_REQUESTED");
    expect(res.body.data.order.items[0].returnReason).toBe("Changed my mind");

    // seller sees the pending return with the reason
    const sellerReturns = await request(app).get("/api/sellers/returns").set(authHeader(sellerToken));
    expect(sellerReturns.status).toBe(200);
    expect(sellerReturns.body.data.returns.length).toBe(1);
    expect(sellerReturns.body.data.returns[0].items[0].status).toBe("RETURN_REQUESTED");
    expect(sellerReturns.body.data.returns[0].items[0].returnReason).toBe("Changed my mind");

    // admin sees it with reason + customer + product
    const adminToken = await makeAdmin();
    const adminReturns = await request(app).get("/api/admin/returns").set(authHeader(adminToken));
    expect(adminReturns.status).toBe(200);
    expect(adminReturns.body.data.returns.length).toBe(1);
    expect(adminReturns.body.data.returns[0].returnReason).toBe("Changed my mind");
    expect(adminReturns.body.data.returns[0].productName).toBe(prod.name);
    expect(String(adminReturns.body.data.returns[0].customer._id)).toBe(String(buyer.user._id));
    expect(adminReturns.body.data.returns[0].quantity).toBe(1);
  });

  test("non-delivered order cannot request return -> 400", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const res = await requestReturn(buyer.token, orderRes.body.data.order._id, prod._id, "reason");
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/delivered/i);
  });

  test("duplicate return request blocked -> 400", async () => {
    const { buyer, orderId, prod } = await prepareDelivered({});
    const first = await requestReturn(buyer.token, orderId, prod._id, "reason one");
    expect(first.status).toBe(200);
    const second = await requestReturn(buyer.token, orderId, prod._id, "reason two");
    expect(second.status).toBe(400);
    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("RETURN_REQUESTED");
    expect(order.items[0].returnReason).toBe("reason one");
  });

  test("customer cannot request return for another customer's order -> 404", async () => {
    const { buyer, orderId, prod } = await prepareDelivered({});
    const stranger = await registerUser({ email: `s_${Math.random().toString(36).slice(2, 8)}@test.com` });
    const res = await requestReturn(stranger.token, orderId, prod._id, "reason");
    expect(res.status).toBe(404);
    expect((await Order.findById(orderId)).items[0].status).toBe("DELIVERED");
  });

  test("invalid return reason rejected: empty / whitespace / too long", async () => {
    const { buyer, orderId, prod } = await prepareDelivered({});
    expect((await requestReturn(buyer.token, orderId, prod._id, "")).status).toBe(400);
    expect((await requestReturn(buyer.token, orderId, prod._id, "   ")).status).toBe(400);
    expect((await requestReturn(buyer.token, orderId, prod._id, "x".repeat(2001))).status).toBe(400);
    expect((await Order.findById(orderId)).items[0].status).toBe("DELIVERED");
  });
});

describe("SELLER RETURN MANAGEMENT — ISOLATION + AUTHORIZATION", () => {
  test("seller sees only own return requests; cross-seller action blocked", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "A Returns", price: 80, stock: 5 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "B Returns", price: 80, stock: 5 });

    const buyer = await registerUser({ email: `rets_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 1);
    await addToCart(buyer.token, prodB._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);
    const purchase = orderRes.body.data.order;
    expect(purchase.sellerCount).toBe(2);

    // deliver both, then request return only for A's product
    const ordersA = await request(app).get("/api/sellers/orders").set(authHeader(sellerA.sellerToken));
    const ordersB = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    await deliverItem(sellerA.sellerToken, ordersA.body.data.orders[0]._id, prodA._id);
    await deliverItem(sellerB.sellerToken, ordersB.body.data.orders[0]._id, prodB._id);

    const ret = await requestReturn(buyer.token, purchase._id, prodA._id, "A is broken");
    expect(ret.status).toBe(200);

    // Seller A sees the return request; Seller B must NOT.
    const returnsA = await request(app).get("/api/sellers/returns").set(authHeader(sellerA.sellerToken));
    const returnsB = await request(app).get("/api/sellers/returns").set(authHeader(sellerB.sellerToken));
    expect(returnsA.body.data.returns.length).toBe(1);
    expect(returnsA.body.data.returns[0].items[0].product.toString()).toBe(String(prodA._id));
    expect(returnsB.body.data.returns.length).toBe(0);

    // Seller A CANNOT approve/decide Seller B's item (no pending request there) -> 403
    const cross = await sellerReturnAction(sellerA.sellerToken, ordersB.body.data.orders[0]._id, prodB._id, "APPROVE");
    expect(cross.status).toBe(403);
  });

  test("USER cannot use seller return action -> 403", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    await deliverItem(sellerToken, orderRes.body.data.order._id, prod._id);
    await requestReturn(buyer.token, orderRes.body.data.order._id, prod._id, "reason");

    const asUser = await sellerReturnAction(buyer.token, orderRes.body.data.order._id, prod._id, "APPROVE");
    expect(asUser.status).toBe(403);
  });

  test("seller approve restores stock once; reject returns item to DELIVERED", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;
    await deliverItem(sellerToken, orderId, prod._id);
    await requestReturn(buyer.token, orderId, prod._id, "defective");

    const approve = await sellerReturnAction(sellerToken, orderId, prod._id, "APPROVE");
    expect(approve.status).toBe(200);
    expect((await Order.findById(orderId)).items[0].status).toBe("RETURNED");
    expect((await Product.findById(prod._id)).stock).toBe(5);
    expect((await sellerReturnAction(sellerToken, orderId, prod._id, "APPROVE")).status).toBe(400);
    expect((await Product.findById(prod._id)).stock).toBe(5);

    // reject path on a fresh delivered item
    const prod2 = await makeProduct({ seller, category: cat, name: "Reject Item", price: 10, stock: 5 });
    const b2 = await buildBuyerWithCart({ productId: prod2._id });
    const o2 = await placeCodOrder(b2.buyer.token, b2.addressId);
    await deliverItem(sellerToken, o2.body.data.order._id, prod2._id);
    await requestReturn(b2.buyer.token, o2.body.data.order._id, prod2._id, "changed");
    const rejected = await sellerReturnAction(sellerToken, o2.body.data.order._id, prod2._id, "REJECT");
    expect(rejected.status).toBe(200);
    const after = await Order.findById(o2.body.data.order._id);
    expect(after.items[0].status).toBe("DELIVERED");
    expect(after.items[0].returnReason).toBe("");
    expect((await Product.findById(prod2._id)).stock).toBe(4); // reject leaves stock at fulfilled quantity
  });
});

describe("ADMIN RETURN MANAGEMENT", () => {
  test("admin return decision: APPROVE restores stock, REJECT reverts to DELIVERED", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 80, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;
    await deliverItem(sellerToken, orderId, prod._id);
    await requestReturn(buyer.token, orderId, prod._id, "admin approve");
    expect((await Product.findById(prod._id)).stock).toBe(3);

    const approve = await request(app)
      .patch(`/api/admin/orders/${orderId}/return`)
      .set(authHeader(adminToken))
      .send({ productId: String(prod._id), action: "APPROVE" });
    expect(approve.status).toBe(200);
    expect((await Order.findById(orderId)).items[0].status).toBe("RETURNED");
    expect((await Product.findById(prod._id)).stock).toBe(5);

    const prod2 = await makeProduct({ seller, category: cat, name: "Admin Reject 2", price: 10, stock: 5 });
    const b2 = await buildBuyerWithCart({ productId: prod2._id });
    const o2 = await placeCodOrder(b2.buyer.token, b2.addressId);
    await deliverItem(sellerToken, o2.body.data.order._id, prod2._id);
    await requestReturn(b2.buyer.token, o2.body.data.order._id, prod2._id, "admin reject");
    const reject = await request(app)
      .patch(`/api/admin/orders/${o2.body.data.order._id}/return`)
      .set(authHeader(adminToken))
      .send({ productId: String(prod2._id), action: "REJECT" });
    expect(reject.status).toBe(200);
    expect((await Order.findById(o2.body.data.order._id)).items[0].status).toBe("DELIVERED");
  });
});

describe("REFUND FLOW — SERVER-SIDE AMOUNT, GATEWAY STATES, IDEMPOTENCY", () => {
  // Creates a RETURNED, PAID (Razorpay) order ready for an admin refund.
  const buildReturnedPaidOrder = async ({ price = 100, qty = 3, stock = 10 } = {}) => {
    const tg = installRazorpayMock();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price, stock });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty });
    const purchase = await payWithRazorpay(buyer.token, addressId);
    const orderId = purchase._id;
    await deliverItem(sellerToken, orderId, prod._id);
    await requestReturn(buyer.token, orderId, prod._id, "defective");
    await sellerReturnAction(sellerToken, orderId, prod._id, "APPROVE");
    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("RETURNED");
    return { tg, orderId, prod, buyer, sellerToken };
  };

  test("refund amount comes from stored order snapshot; client cannot forge it; historical price used", async () => {
    const adminToken = await makeAdmin();
    const { tg, orderId, prod, buyer } = await buildReturnedPaidOrder({ price: 100, qty: 3 });

    // product changes completely after purchase
    await Product.updateOne({ _id: prod._id }, { $set: { name: "Renamed", price: 99999, finalPrice: 99999 } });

    const refund = await adminRefund(adminToken, orderId, {
      productId: String(prod._id),
      amount: 1,
      total: 1,
      amountPaise: 1,
    });
    expect(refund.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("REFUNDED");
    expect(order.paymentStatus).toBe("REFUNDED");
    // gateway received the historical stored amount: 100 * 3 = 30000 paise
    const issuedRefund = refund.body.data.refundResult.refunds[0];
    expect(issuedRefund.amount).toBe(300);
    expect(order.items[0].refundId).toBeTruthy();
    expect(order.items[0].price).toBe(100);
  });

  test("Razorpay refund success updates state; duplicates do not re-issue gateway refunds", async () => {
    const adminToken = await makeAdmin();
    const { tg, orderId, prod } = await buildReturnedPaidOrder();

    const first = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(first.status).toBe(200);
    expect(tg.calls.refunds.length).toBe(1);

    const second = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(second.status).toBe(200);
    expect(second.body.data.refundResult.duplicate).toBe(true);
    expect(tg.calls.refunds.length).toBe(1); // no second gateway refund
    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("REFUNDED");
  });

  test("refund already in progress -> no new gateway request (409)", async () => {
    const adminToken = await makeAdmin();
    const { tg, orderId, prod } = await buildReturnedPaidOrder();

    await Order.updateOne(
      { _id: orderId },
      { $set: { "items.0.status": "REFUND_PENDING", paymentStatus: "REFUND_PENDING" } }
    );

    const res = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(res.status).toBe(409);
    expect(tg.calls.refunds.length).toBe(0);
  });

  test("gateway refund failure does NOT mark order refunded -> REFUND_FAILED, retryable", async () => {
    const adminToken = await makeAdmin();
    const { tg, orderId, prod } = await buildReturnedPaidOrder();

    tg.mock.payments.refund = async () => {
      throw new Error("gateway unavailable");
    };
    tg.calls.refunds.push("attempt");

    const fail = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(fail.status).toBe(502);
    const after = await Order.findById(orderId);
    expect(after.items[0].status).toBe("RETURNED"); // reverted, NOT refunded
    expect(after.items[0].refundId).toBe("");
    expect(after.paymentStatus).toBe("REFUND_FAILED");

    // gateway recovers; admin can retry -> now succeeds
    installRazorpayMock();
    const retry = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(retry.status).toBe(200);
    const final = await Order.findById(orderId);
    expect(final.items[0].status).toBe("REFUNDED");
    expect(final.paymentStatus).toBe("REFUNDED");
  });

  test("missing Razorpay configuration does NOT fake a refund -> 503, stays non-refunded", async () => {
    const adminToken = await makeAdmin();
    const { orderId, prod } = await buildReturnedPaidOrder();

    restoreRazorpay();
    razorpayConfig.__setRazorpayInstance(null); // force-undefined regardless of env
    try {
      const res = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
      expect(res.status).toBe(503);
      const order = await Order.findById(orderId);
      expect(order.items[0].status).toBe("RETURNED");
      expect(order.items[0].refundId).toBe("");
      expect(order.paymentStatus).not.toBe("REFUNDED");
    } finally {
      installRazorpayMock();
    }
  });

  test("COD refund is administratively marked WITHOUT calling the gateway", async () => {
    const adminToken = await makeAdmin();
    const tg = installRazorpayMock();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 40, stock: 5 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id, qty: 2 });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;
    await deliverItem(sellerToken, orderId, prod._id);
    await requestReturn(buyer.token, orderId, prod._id, "cod return");
    await sellerReturnAction(sellerToken, orderId, prod._id, "APPROVE");

    const refund = await adminRefund(adminToken, orderId, { productId: String(prod._id) });
    expect(refund.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order.items[0].status).toBe("REFUNDED");
    expect(order.paymentStatus).toBe("REFUNDED");
    expect(tg.calls.refunds.length).toBe(0); // COD never touches Razorpay
  });
});

describe("STRICT TRANSITION MATRIX", () => {
  test("forward fulfillment is allowed; backward and terminal transitions rejected", async () => {
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 50, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;

    const next = async (status) => {
      const res = await request(app)
        .patch(`/api/sellers/orders/${orderId}/status`)
        .set(authHeader(sellerToken))
        .send({ productId: String(prod._id), status });
      return res;
    };

    // CANCELLED cannot be set through the generic status endpoint
    expect((await next("CANCELLED")).status).toBe(400);
    expect((await next("SHIPPED")).status).toBe(200); // PENDING -> ... -> SHIPPED (forward jump)
    expect((await next("DELIVERED")).status).toBe(200);
    // after DELIVERED, backwards is rejected
    expect((await next("CONFIRMED")).status).toBe(400);
    expect((await next("SHIPPED")).status).toBe(400);
  });

  test("admin status endpoint cannot bypass side effects: CANCELLED / RETURNED rejected", async () => {
    const adminToken = await makeAdmin();
    const cat = await makeCategory();
    const { sellerToken, seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 50, stock: 10 });
    const { buyer, addressId } = await buildBuyerWithCart({ productId: prod._id });
    const orderRes = await placeCodOrder(buyer.token, addressId);
    const orderId = orderRes.body.data.order._id;

    const setStatus = (status) =>
      request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(authHeader(adminToken))
        .send({ productId: String(prod._id), status });

    expect((await setStatus("CANCELLED")).status).toBe(400);
    expect((await setStatus("REFUNDED")).status).toBe(400);
    expect((await setStatus("RETURNED")).status).toBe(400);
    expect((await setStatus("DELIVERED")).status).toBe(200);
  });
});

describe("MULTI-SELLER SAFETY + HISTORY", () => {
  test("multi-seller cancellation only cancels the intended checkout group", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const sellerC = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "Cancel Item A", price: 100, stock: 10 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "Cancel Item B", price: 200, stock: 10 });
    const prodC = await makeProduct({ seller: sellerC.seller, category: cat, name: "Cancel Item C", price: 50, stock: 10 });

    const buyer1 = await registerUser({ email: `mcb1_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer1.token, prodA._id, 1);
    await addToCart(buyer1.token, prodB._id, 1);
    const a1 = await addAddress(buyer1.token);
    const checkout1 = await placeCodOrder(buyer1.token, a1.body.data.address._id);
    expect(checkout1.body.data.order.sellerCount).toBe(2);

    const buyer2 = await registerUser({ email: `mcb2_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer2.token, prodC._id, 1);
    const a2 = await addAddress(buyer2.token);
    const checkout2 = await placeCodOrder(buyer2.token, a2.body.data.address._id);

    const groupIds = checkout1.body.data.order.orderIds;
    expect(groupIds.length).toBe(2);

    const cancel = await request(app)
      .patch(`/api/orders/${checkout1.body.data.order._id}/cancel`)
      .set(authHeader(buyer1.token));
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.order.orderStatus).toBe("CANCELLED");

    // every seller record of checkout 1 cancelled; checkout 2 untouched
    for (const id of groupIds) {
      const o = await Order.findById(id);
      expect(o.items[0].status).toBe("CANCELLED");
    }
    const untouched = await Order.find({ checkoutId: checkout2.body.data.order.checkoutId });
    expect(untouched[0].items[0].status).toBe("PENDING");
    expect((await Product.findById(prodA._id)).stock).toBe(10);
    expect((await Product.findById(prodB._id)).stock).toBe(10);
    expect((await Product.findById(prodC._id)).stock).toBe(9); // buyer2's order untouched
  });

  test("multi-seller return + refund affect only the intended seller order", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "A Paid", price: 100, stock: 10 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "B Paid", price: 300, stock: 10 });

    const buyer = await registerUser({ email: `mrr_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 2);
    await addToCart(buyer.token, prodB._id, 1);
    const addr = await addAddress(buyer.token);
    const purchase = await payWithRazorpay(buyer.token, addr.body.data.address._id);
    expect(purchase.sellerCount).toBe(2);

    const ordersA = await request(app).get("/api/sellers/orders").set(authHeader(sellerA.sellerToken));
    const ordersB = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    const orderA = ordersA.body.data.orders.filter((o) => o.items[0].product.toString() === String(prodA._id))[0];
    const orderB = ordersB.body.data.orders.filter((o) => o.items[0].product.toString() === String(prodB._id))[0];

    await deliverItem(sellerA.sellerToken, orderA._id, prodA._id);
    await deliverItem(sellerB.sellerToken, orderB._id, prodB._id);

    // return only Seller A's item
    const ret = await requestReturn(buyer.token, purchase._id, prodA._id, "A only");
    expect(ret.status).toBe(200);
    const orderADoc = await Order.findById(orderA._id);
    expect(orderADoc.items[0].status).toBe("RETURN_REQUESTED");
    expect((await Order.findById(orderB._id)).items[0].status).toBe("DELIVERED");
    await sellerReturnAction(sellerA.sellerToken, orderA._id, prodA._id, "APPROVE");

    // admin refunds ONLY Seller A's order group
    const adminToken = await makeAdmin();
    const tg = installRazorpayMock();
    const refund = await adminRefund(adminToken, orderA._id, { productId: String(prodA._id) });
    expect(refund.status).toBe(200);
    expect(tg.calls.refunds.length).toBe(1);

    const aAfter = await Order.findById(orderA._id);
    const bAfter = await Order.findById(orderB._id);
    expect(aAfter.items[0].status).toBe("REFUNDED");
    expect(aAfter.paymentStatus).toBe("REFUNDED");
    expect(aAfter.items[0].refundId).toBeTruthy();
    expect(bAfter.items[0].status).toBe("DELIVERED");
    expect(bAfter.paymentStatus).toBe("PAID");

    // purchase-level view aggregates to PARTIALLY_REFUNDED
    const detail = await request(app).get(`/api/orders/${purchase._id}`).set(authHeader(buyer.token));
    expect(detail.body.data.order.paymentStatus).toBe("PARTIALLY_REFUNDED");
  });

  test("customer order history and seller isolation stay correct after cancel/return/refund", async () => {
    const cat = await makeCategory();
    const sellerA = await makeSeller();
    const sellerB = await makeSeller();
    const prodA = await makeProduct({ seller: sellerA.seller, category: cat, name: "Hist A", price: 100, stock: 10 });
    const prodB = await makeProduct({ seller: sellerB.seller, category: cat, name: "Hist B", price: 200, stock: 10 });

    const buyer = await registerUser({ email: `hist_${Math.random().toString(36).slice(2, 8)}@test.com` });
    await addToCart(buyer.token, prodA._id, 1);
    await addToCart(buyer.token, prodB._id, 1);
    const addr = await addAddress(buyer.token);
    const purchase = (await placeCodOrder(buyer.token, addr.body.data.address._id)).body.data.order;

    // deliver both, return + refund A only
    const ordersA = await request(app).get("/api/sellers/orders").set(authHeader(sellerA.sellerToken));
    const ordersB = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    const orderA = ordersA.body.data.orders[0];
    const orderB = ordersB.body.data.orders[0];
    await deliverItem(sellerA.sellerToken, orderA._id, prodA._id);
    await deliverItem(sellerB.sellerToken, orderB._id, prodB._id);
    await requestReturn(buyer.token, purchase._id, prodA._id, "hist return");
    await sellerReturnAction(sellerA.sellerToken, orderA._id, prodA._id, "APPROVE");
    const adminToken = await makeAdmin();
    await adminRefund(adminToken, orderA._id, { productId: String(prodA._id) });

    const detail = await request(app).get(`/api/orders/${purchase._id}`).set(authHeader(buyer.token));
    expect(detail.status).toBe(200);
    const items = detail.body.data.order.items;
    const aItem = items.find((i) => i.name === "Hist A");
    expect(aItem.status).toBe("REFUNDED");
    expect(aItem.returnReason).toBe("hist return");
    const bItem = items.find((i) => i.name === "Hist B");
    expect(bItem.status).toBe("DELIVERED");
    expect(detail.body.data.order.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(detail.body.data.order.total).toBe(300);

    // Seller B still sees only its own delivered item
    const bOrders = await request(app).get("/api/sellers/orders").set(authHeader(sellerB.sellerToken));
    expect(bOrders.body.data.orders.length).toBe(1);
    expect(bOrders.body.data.orders[0].items[0].status).toBe("DELIVERED");
  });
});