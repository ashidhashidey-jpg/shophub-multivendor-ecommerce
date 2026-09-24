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
  Wishlist,
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

const deliverOrder = async (orderId) => {
  await Order.updateOne({ _id: orderId }, { $set: { "items.0.status": "DELIVERED" } });
};

const deliverItem = async (orderId, productId, status = "DELIVERED") => {
  await Order.updateOne(
    { _id: orderId, "items.product": productId },
    { $set: { "items.$.status": status } }
  );
};

const buyAndDeliver = async (token, productId) => {
  await addToCart(token, productId, 1);
  const addr = await addAddress(token);
  const orderRes = await placeCodOrder(token, addr.body.data.address._id);
  await deliverOrder(orderRes.body.data.order._id);
  return orderRes.body.data.order._id;
};

describe("WISHLIST — AUTH & ACCESS", () => {
  test("unauthenticated access to wishlist routes -> 401", async () => {
    expect((await request(app).get("/api/wishlist")).status).toBe(401);
    expect((await request(app).post("/api/wishlist/111111111111111111111111")).status).toBe(401);
    expect((await request(app).delete("/api/wishlist/111111111111111111111111")).status).toBe(401);
  });

  test("invalid productId -> 400", async () => {
    const buyer = await registerUser();
    const res = await request(app).post("/api/wishlist/not-an-id").set(authHeader(buyer.token));
    expect(res.status).toBe(400);
  });

  test("non-existent / not available product -> 404", async () => {
    const buyer = await registerUser();
    const missing = await request(app)
      .post("/api/wishlist/111111111111111111111111")
      .set(authHeader(buyer.token));
    expect(missing.status).toBe(404);

    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const pending = await makeProduct({ seller, category: cat, status: "PENDING" });
    const res = await request(app)
      .post(`/api/wishlist/${pending._id}`)
      .set(authHeader(buyer.token));
    expect(res.status).toBe(404);

    const off = await makeProduct({ seller, category: cat, isActive: false });
    const deactivated = await request(app)
      .post(`/api/wishlist/${off._id}`)
      .set(authHeader(buyer.token));
    expect(deactivated.status).toBe(404);
  });

  test("SELLER role forbidden on wishlist -> 403", async () => {
    const { sellerToken } = await makeSeller();
    expect((await request(app).get("/api/wishlist").set(authHeader(sellerToken))).status).toBe(403);
  });
});

describe("WISHLIST — CORE BEHAVIOUR", () => {
  test("add, list, duplicate-add idempotent, remove", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 500 });

    const buyer = await registerUser();
    const add = await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(buyer.token));
    expect(add.status).toBe(201);

    const dup = await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(buyer.token));
    expect(dup.status).toBe(201);
    expect(dup.body.data.wishlist.products.length).toBe(1);

    const list = await request(app).get("/api/wishlist").set(authHeader(buyer.token));
    expect(list.status).toBe(200);
    expect(list.body.data.wishlist.products.length).toBe(1);
    expect(list.body.data.wishlist.products[0]._id).toBe(String(prod._id));
    expect(list.body.data.wishlist.products[0].seller.storeName).toBeTruthy();
    expect(list.body.data.wishlist.products[0].stock).toBe(10);

    const remove = await request(app).delete(`/api/wishlist/${prod._id}`).set(authHeader(buyer.token));
    expect(remove.status).toBe(200);
    const after = await request(app).get("/api/wishlist").set(authHeader(buyer.token));
    expect(after.body.data.wishlist.products.length).toBe(0);
  });

  test("remove from a non-existent wishlist -> 404", async () => {
    const buyer = await registerUser();
    const res = await request(app).delete(`/api/wishlist/111111111111111111111111`).set(authHeader(buyer.token));
    expect(res.status).toBe(404);
  });

  test("deactivated / re-pended product is dropped from the wishlist response", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser();
    await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(buyer.token));

    await Product.findByIdAndUpdate(prod._id, { status: "PENDING" });
    const list = await request(app).get("/api/wishlist").set(authHeader(buyer.token));
    expect(list.status).toBe(200);
    expect(list.body.data.wishlist.products.length).toBe(0);

    // stays in the user's document (safe to restore later)
    const doc = await Wishlist.findOne({ user: buyer.user._id });
    expect(doc.products.length).toBe(1);
  });

  test("wishlists are isolated between users", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const a = await registerUser();
    const b = await registerUser();
    await request(app).post(`/api/wishlist/${prod._id}`).set(authHeader(a.token));

    const listB = await request(app).get("/api/wishlist").set(authHeader(b.token));
    expect(listB.body.data.wishlist.products.length).toBe(0);
  });
});

describe("REVIEWS — AUTH & ACCESS", () => {
  test("unauth review create -> 401; public list -> 200; unauth eligibility -> 401", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const post = await request(app).post(`/api/products/${prod._id}/reviews`).send({ rating: 5 });
    expect(post.status).toBe(401);

    const list = await request(app).get(`/api/products/${prod._id}/reviews`);
    expect(list.status).toBe(200);

    const el = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`);
    expect(el.status).toBe(401);
  });

  test("seller cannot create review, read eligibility, or manage own reviews -> 403", async () => {
    const cat = await makeCategory();
    const { seller, sellerToken } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    expect(
      (await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(sellerToken)).send({ rating: 4 }))
        .status
    ).toBe(403);
    expect(
      (await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(sellerToken))).status
    ).toBe(403);
    expect((await request(app).get("/api/reviews/mine").set(authHeader(sellerToken))).status).toBe(403);
    expect((await request(app).delete("/api/reviews/111111111111111111111111").set(authHeader(sellerToken))).status).toBe(
      403
    );
  });

  test("seller cannot reach admin review moderation -> 403", async () => {
    const { sellerToken } = await makeSeller();
    expect((await request(app).get("/api/admin/reviews").set(authHeader(sellerToken))).status).toBe(403);
    expect(
      (await request(app).patch("/api/admin/reviews/111111111111111111111111/approve").set(authHeader(sellerToken)))
        .status
    ).toBe(403);
  });

  test("invalid id / rating / comment -> 400/422", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });
    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prod._id);

    const badId = await request(app).post(`/api/products/not-an-id/reviews`).set(authHeader(buyer.token)).send({ rating: 5 });
    expect(badId.status).toBe(400);

    const badRating = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 8 });
    expect(badRating.status).toBe(422);

    const badComment = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5, comment: "x".repeat(1001) });
    expect(badComment.status).toBe(422);

    const missingRating = await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({});
    expect(missingRating.status).toBe(422);
  });
});

describe("REVIEWS — PURCHASE VERIFICATION", () => {
  test("non-purchaser -> 403 and eligibility blocks form", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const stranger = await registerUser();
    const res = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(stranger.token))
      .send({ rating: 5 });
    expect(res.status).toBe(403);

    const el = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(stranger.token));
    expect(el.status).toBe(200);
    expect(el.body.data.eligibility.purchased).toBe(false);
    expect(el.body.data.eligibility.canReview).toBe(false);
    expect(el.body.data.eligibility.reason).toContain("purchasing");
  });

  test("purchased but not delivered -> POST 403, eligibility delivered=false", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser();
    await addToCart(buyer.token, prod._id, 1);
    const addr = await addAddress(buyer.token);
    const orderRes = await placeCodOrder(buyer.token, addr.body.data.address._id);

    const res = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 4 });
    expect(res.status).toBe(403);

    const el = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(buyer.token));
    expect(el.body.data.eligibility.purchased).toBe(true);
    expect(el.body.data.eligibility.delivered).toBe(false);
    expect(el.body.data.eligibility.canReview).toBe(false);
    expect(el.body.data.eligibility.reason).toContain("delivered");
  });

  test("delivered purchaser can review; eligibility flips after review", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prod._id);

    const elBefore = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(buyer.token));
    expect(elBefore.body.data.eligibility.canReview).toBe(true);

    const ok = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5, comment: "Brilliant" });
    expect(ok.status).toBe(201);

    const elAfter = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(buyer.token));
    expect(elAfter.body.data.eligibility.canReview).toBe(false);
    expect(elAfter.body.data.eligibility.alreadyReviewed).toBe(true);
    expect(String(elAfter.body.data.eligibility.myReviewId)).toBe(String(ok.body.data.review._id));
  });

  test("buying one product never enables reviewing another (multi-seller isolation)", async () => {
    const cat = await makeCategory();
    const { seller: s1 } = await makeSeller();
    const { seller: s2 } = await makeSeller();
    const prodA = await makeProduct({ seller: s1, category: cat });
    const prodB = await makeProduct({ seller: s2, category: cat });

    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prodA._id);

    const elB = await request(app).get(`/api/products/${prodB._id}/reviews/eligibility`).set(authHeader(buyer.token));
    expect(elB.body.data.eligibility.purchased).toBe(false);

    const resB = await request(app)
      .post(`/api/products/${prodB._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5 });
    expect(resB.status).toBe(403);

    const okA = await request(app)
      .post(`/api/products/${prodA._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5 });
    expect(okA.status).toBe(201);
  });

  test("order remains delivered after core flow (data integrity)", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 90 });
    const buyer = await registerUser();
    const orderId = await buyAndDeliver(buyer.token, prod._id);

    await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({ rating: 3 });
    await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({ rating: 4 });
    await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({ rating: 5 });

    expect(await Review.countDocuments({ user: buyer.user._id, product: prod._id })).toBe(1);
    const ord = await Order.findById(orderId);
    expect(ord.items[0].status).toBe("DELIVERED");
  });
});

describe("REVIEWS — LISTING & MODERATION", () => {
  test("public list exposes user-name only, no sensitive fields, summary computed", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat, price: 75 });
    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prod._id);
    await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({ rating: 4 });

    const list = await request(app).get(`/api/products/${prod._id}/reviews`);
    expect(list.status).toBe(200);
    expect(list.body.data.reviews.length).toBe(1);

    const r = list.body.data.reviews[0];
    expect(Object.keys(r.user).sort()).toEqual(["_id", "name"]);
    expect(r.user).not.toHaveProperty("email");
    expect(r.user).not.toHaveProperty("phone");
    expect(r).not.toHaveProperty("password");

    expect(list.body.data.ratingSummary.averageRating).toBe(4);
    expect(list.body.data.ratingSummary.count).toBe(1);
  });

  test("rating 1 accepted; average with multiple approved reviews", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    for (let i = 0; i < 2; i++) {
      const b = await registerUser();
      await buyAndDeliver(b.token, prod._id);
      await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(b.token)).send({ rating: 1 });
    }
    const list = await request(app).get(`/api/products/${prod._id}/reviews`);
    expect(list.body.data.ratingSummary.averageRating).toBe(1);
    expect(list.body.data.reviews.length).toBe(2);
  });

  test("admin approve (idempotent) and delete; user sees list after admin delete", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prod._id);
    const created = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 5, comment: "Great" });
    const reviewId = created.body.data.review._id;

    const adminToken = await makeAdmin();

    const list = await request(app).get("/api/admin/reviews").set(authHeader(adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data.reviews.length).toBe(1);

    const ok1 = await request(app).patch(`/api/admin/reviews/${reviewId}/approve`).set(authHeader(adminToken));
    expect(ok1.status).toBe(200);
    const ok2 = await request(app).patch(`/api/admin/reviews/${reviewId}/approve`).set(authHeader(adminToken));
    expect(ok2.status).toBe(200);

    expect((await request(app).get(`/api/products/${prod._id}/reviews`)).body.data.reviews.length).toBe(1);

    const del = await request(app).delete(`/api/admin/reviews/${reviewId}`).set(authHeader(adminToken));
    expect(del.status).toBe(200);

    const listAfter = await request(app).get(`/api/products/${prod._id}/reviews`);
    expect(listAfter.body.data.reviews.length).toBe(0);

    const mine = await request(app).get("/api/reviews/mine").set(authHeader(buyer.token));
    expect(mine.body.data.reviews.length).toBe(0);
  });

  test("cross-user update/delete forgery -> 404", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const owner = await registerUser();
    await buyAndDeliver(owner.token, prod._id);
    const created = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(owner.token))
      .send({ rating: 5 });
    const reviewId = created.body.data.review._id;

    const other = await registerUser();
    const put = await request(app)
      .put(`/api/reviews/${reviewId}`)
      .set(authHeader(other.token))
      .send({ rating: 1, comment: "hacked" });
    expect(put.status).toBe(404);

    const del = await request(app).delete(`/api/reviews/${reviewId}`).set(authHeader(other.token));
    expect(del.status).toBe(404);

    // owner unaffected
    expect(await Review.countDocuments({ _id: reviewId })).toBe(1);
    const mine = await request(app).get("/api/reviews/mine").set(authHeader(owner.token));
    expect(mine.body.data.reviews.length).toBe(1);
  });

  test("review listing/hiding on deactivated or rejected product", async () => {
    const cat = await makeCategory();
    const { seller } = await makeSeller();
    const prod = await makeProduct({ seller, category: cat });

    const buyer = await registerUser();
    await buyAndDeliver(buyer.token, prod._id);
    await request(app).post(`/api/products/${prod._id}/reviews`).set(authHeader(buyer.token)).send({ rating: 4 });

    await Product.findByIdAndUpdate(prod._id, { status: "REJECTED" });

    const el = await request(app).get(`/api/products/${prod._id}/reviews/eligibility`).set(authHeader(buyer.token));
    expect(el.body.data.eligibility.canReview).toBe(false);
    expect(el.body.data.eligibility.reason).toContain("not available");

    const post = await request(app)
      .post(`/api/products/${prod._id}/reviews`)
      .set(authHeader(buyer.token))
      .send({ rating: 3 });
    expect(post.status).toBe(400);
  });
});