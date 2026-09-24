# Multi-Vendor E-Commerce — Backend API

Production-style REST API for a multi-vendor e-commerce platform.

**Stack:** Node.js + Express 5 · MongoDB (Mongoose 9) · JWT · bcrypt · express-validator · Multer (Cloudinary) · Razorpay · Jest + Supertest

---

## Getting Started

```bash
npm install
npm run create-admin  # interactive: create the first ADMIN account (name/email/password)
npm run dev           # start dev server (or: npm start)
```

`npm run create-admin` is the **only** way to create an Admin. It connects to `MONGO_URI`,
asks for the Admin name, email and a hidden password, validates the input against the API's
rules, rejects an already-registered email, refuses to run if an Admin already exists, and
stores the account with `role = "ADMIN"` using the existing bcrypt hashing. It never runs at
server startup and never deletes existing data. Your password is never printed or stored in
plain text.

Requires **Node 20.19+** (Express 5 / Mongoose 9).

### Environment variables — `.env`

```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/multivendor_ecommerce
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional (blank = feature disabled with a clear error; never faked success)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

`CLOUDINARY_*`: if absent, `/api/uploads` is disabled gracefully.
`RAZORPAY_*`: if absent, payment endpoints return `503 Payment is not configured`; COD orders are unaffected.

---

## Response envelope

```json
{ "success": true, "message": "…", "data": { … }, "errors": [] }
```

- `201` created · `200` ok · `400` invalid ID/business rule · `401` unauthenticated · `403` forbidden · `404` not found · `409` conflict/duplicate · `422` validation failure · `500` server error.

---

## API map

### Auth & users
| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| GET/PUT | `/api/users/profile` | USER |
| CRUD | `/api/users/addresses` | USER |
| PATCH | `/api/users/addresses/:id/default` | USER |

### Marketplace (public)
| Method | Path |
|---|---|
| GET | `/api/products?search=&category=&seller=&minPrice=&maxPrice=&sort=price_asc\|price_desc\|newest\|name_asc&page=&limit=` |
| GET | `/api/products/:id` |
| GET | `/api/products/:productId/reviews` |
| GET | `/api/products/:productId/reviews/eligibility` (USER) — server-authoritative `{ purchased, delivered, alreadyReviewed, canReview, reason }`; the review form is only shown when `canReview: true` |
| GET | `/api/categories` , `/api/categories/:slug` |

### Cart, checkout & wishlist (USER)
| Method | Path |
|---|---|
| GET | `/api/cart` · POST `/api/cart/items` · PUT/DELETE `/api/cart/items/:productId` · DELETE `/api/cart` |
| GET | `/api/checkout/summary` (optional `?addressId=`) — validates cart, computes authoritative totals, returns selected/default address; **no order created, no payment called** |
| GET | `/api/wishlist` · POST/DELETE `/api/wishlist/:productId` |

Wishlist notes: USER-only toggle API (`POST` adds / `DELETE` removes, both path-based, no body) with a unique-add guard — a second add is idempotent (`201`, product stored once). Adds require an `APPROVED` + active product (`404` otherwise). Listing (`GET`) only shows products that are currently `APPROVED` and active; products that were later deactivated, rejected, or re-pended are dropped from the response (they remain safely in the user's document and would reappear if re-approved). Seller `storeName` is included per item.

Cart notes: USER-only (`seller`/`admin` → `403`); user identity always from the JWT; adds require product `APPROVED` + active + `APPROVED` seller + sufficient stock (duplicate adds merge into the line and revalidate stock); quantity updates recheck availability/stock; totals (`subtotal`, `discount`, `shipping=0`, `total`, `itemCount`, `totalQuantity`) are recomputed from **current** MongoDB `price`/`finalPrice` and ignore any client-supplied price; unavailable lines are flagged with a reason and excluded from totals; multi-seller carts are fully supported.

Checkout summary notes: fails with a clear `400` on empty cart, missing product, non-`APPROVED`/inactive product, non-`APPROVED` seller, or insufficient stock; the requested address must belong to the user (`404` otherwise); defaults to the user's default address ("no default" → `address: null`, no hard failure).

### Orders & Payment (USER)
| Method | Path |
|---|---|
| POST | `/api/orders` (`{ addressId, paymentMethod: "COD" }`) — COD only; Razorpay via `/api/payment/*` |
| GET | `/api/orders`, `/api/orders/:id` |
| PATCH | `/api/orders/:id/cancel`, `/api/orders/:id/return` |
| POST | `/api/payment/create-order` (`{ addressId }`) — server computes paise amount, stores a `Payment` record, returns `{ razorpayOrderId, amountPaise, currency, keyId, checkoutId }` (public key only) |
| POST | `/api/payment/verify` (`{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`) — full server-side verification (see below) |

Orders notes: one checkout (COD or Razorpay) creates **one Order record per seller** sharing a `checkoutId`, inside a MongoDB transaction with an atomic `stock >= qty` guard; repeat pays/verify never create duplicate orders. `GET /api/orders` returns grouped **purchase views** (combined items/totals, `orderStatus`, aggregated `paymentStatus`, `sellerCount`, per-seller `groups`); `/api/orders/:id`, cancel, and return accept any record id of the group.

Lifecycle: fulfillment advances **PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED** (strictly forward, enforced for both seller and admin status endpoints). `PATCH /api/orders/:id/cancel` cancels the **whole checkout group** when every item is `PENDING`/`CONFIRMED`, restoring stock exactly once; the customer endpoint never emits a gateway refund (a cancelled paid order stays `PAID` and is refundable by the admin). `PATCH /api/orders/:id/return` requires a `DELIVERED` item and a mandatory stored reason (non-empty after trim, ≤ 2000 chars → `400`; user-scoped → foreign `404`; duplicate → `400`).

Payment verify order of checks — every failure marks the `Payment` FAILED and leaves cart/stock untouched: ownership → cart still purchasable and byte-identical (cart signature) → server-computed amount equals the stored quote → address still owned → Razorpay HMAC signature → gateway-confirmed amount equals the quote. Only after all checks does the transaction create the orders, decrement stock, clear the cart, and set `paymentStatus = PAID`. Idempotent (repeat → `200 duplicate: true`). When `RAZORPAY_*` are blank, both endpoints return `503` with a clear message; COD is unaffected.

### Sellers
| Method | Path | Access |
|---|---|---|
| POST | `/api/sellers/register` | USER/SELLER |
| GET | `/api/sellers/profile`, `/api/sellers/status` | USER/SELLER |
| GET | `/api/sellers/dashboard` | APPROVED |
| PUT | `/api/sellers/store` | APPROVED |
| GET | `/api/sellers/orders`, `/api/sellers/orders/:id`, `/api/sellers/returns` | APPROVED |
| PATCH | `/api/sellers/orders/:id/status`, `/api/sellers/orders/:id/return` | APPROVED |
| POST/GET | `/api/seller/products` | APPROVED |
| PUT/DELETE | `/api/seller/products/:id` | APPROVED (owner only) |

### Reviews (USER)
| Method | Path |
|---|---|
| POST | `/api/products/:productId/reviews` (purchase + DELIVERED verified, duplicate → 409) |
| GET | `/api/products/:productId/reviews/eligibility` — why this user can/cannot review |
| GET/PUT/DELETE | `/api/reviews/mine`, `/api/reviews/:id` (owner only — foreign `404`) |

Review notes: only the **actual purchaser** of that exact product can review it, and only after that order line is **DELIVERED** (`403` otherwise, even if they bought a different product from the same seller). The review stores the seller from the delivered order line, so cross-seller setups can never enable a review. Duplicates are rejected (`409`) and the database unique index `{ user, product }` backstops it. The public list only returns `isApproved` reviews with **user-name only** populated (no email/phone), and the average/count is computed live from the actual reviews — no duplicated rating field is stored on the product. Eligibility re-uses the same purchase/delivery/duplicate checks so the frontend never guesses.

### Admin
| Method | Path |
|---|---|
| GET | `/api/admin/dashboard` |
| CRUD | `/api/admin/users` (+ `/block`) |
| PATCH | `/api/admin/sellers/:id/approve\|reject\|suspend\|reactivate` |
| PATCH | `/api/admin/products/:id/approve\|deactivate\|reject` |
| CRUD | `/api/admin/categories` |
| GET/PATCH | `/api/admin/orders` , `/api/admin/orders/:id/status`, `/api/admin/orders/:id/refund`, `/api/admin/orders/:id/return` |
| GET | `/api/admin/returns` — pending return requests across all sellers (customer, seller, product, reason, amount) |
| GET/DELETE | `/api/admin/reviews`, `/api/admin/reviews/:id` |

### Uploads
| Method | Path |
|---|---|
| POST | `/api/uploads` (multer → Cloudinary) |

---

## Core business rules (also covered by tests)

1. Order placement (COD or Razorpay verify) re-validates **stock from the database**; quantity > stock → `400`, no order created, stock unchanged, cart intact.
2. Prices are always taken from the database — frontend-supplied prices are never trusted (cart, checkout summary, and the Razorpay amount are recomputed from live product data).
3. Multi-seller order: each seller only sees their own items plus `otherSellerItemsCount`. A multi-seller checkout is split into one Order per seller sharing a `checkoutId`; the customer sees one combined purchase.
4. Cancellation restores stock **exactly once** (idempotent guard on later cancels) and only ever touches the customer's own checkout group — other users and unrelated checkouts are unaffected.
5. Reviews require a **DELIVERED** order for that exact product (by the same buyer); duplicates → `409`; cross-product/cross-seller purchases never enable a review.
6. Sellers can only edit their own products/order items; violations → `403`.
7. PENDING seller application gates protected seller routes → `403` until approved.
8. Blocked users lose access to all protected routes → `403`.
9. Invalid ObjectId → `400`; duplicate registration → `409`; role denial → `403`.
10. Returns: user requests on DELIVERED items (mandatory stored reason) → seller **and** admin decisions are isolated per seller order; APPROVE → `RETURNED` (stock restored once), REJECT → back to `DELIVERED` (stock untouched).
11. Refunds can't be forged, double-issued, or faked: the amount always comes from the stored order snapshot (client `amount`/`total` ignored); an atomic claim prevents concurrent double refunds; duplicate refund emits no second gateway call; gateway failure → `REFUND_FAILED` (retryable, never a fake `REFUNDED`); unconfigured Razorpay → `503`; COD refunds are administrative (no gateway); multi-seller purchases become `PARTIALLY_REFUNDED` until every paid group is refunded.
12. Cart/address ownership is enforced server-side: another user's cart line or address → `404`; the address `user` field is whitelisted out of writes.
13. Cart items must currently be purchasable (product `APPROVED` + active + seller `APPROVED` + enough stock); checkout summary re-checks all of it at request time.
14. At most one default address per user: setting a new default unsets the rest, deleting the default promotes a remaining address.
15. Checkout summary creates no order and calls no payment gateway — it is a pure validation/summary endpoint.
16. Payment amount cannot be forged: computed server-side in **paise** at `create-order`; a client-sent amount/total/status is ignored.
17. No order without verified payment: signature, gateway amount, cart identity, and current price all verified before any document is written; failures never charge-side-effects the cart or stock, and mark the `Payment` FAILED.
18. Duplicate/callback replay safety: unique `Payment.razorpayOrderId` + idempotent verify (`duplicate: true`), so a callback can never double-decrement stock or create two orders for one payment.
19. Order status cannot jump backwards or into terminal states through the generic status endpoint: a single strictly-forward fulfillment matrix is shared by the seller and admin status routes; cancel/return/refund go through their dedicated side-effecting endpoints.
20. Wishlists are user-scoped and only surface currently-buyable products (`APPROVED` + active); deactivated/re-pended/rejected items are hidden from listings but kept in the user's document; the review form is driven by the server-authoritative eligibility endpoint, never by the frontend.

---

## Tests

```bash
npm test          # Jest + Supertest, isolated `multivendor_test` database
npm run test:watch
```

**251 tests across 12 suites** (payment/verify and refund flows run against a **mocked Razorpay gateway** — no real money is ever charged; the mock is swapped in per suite and restored afterward):

- `tests/auth.test.js` — register/login/duplicate/validation/JWT
- `tests/userSellers.test.js` — profile, addresses, seller applications, ownership (403), marketplace filters
- `tests/orders.test.js` — order placement, stock validation, multi-seller isolation, cancel/return workflows, review verification
- `tests/admin.test.js` — dashboard, seller lifecycle, product moderation, blocking, refunds
- `tests/sellerLifecycle.test.js` — KYC registration, approval/rejection/suspension gates
- `tests/productManagement.test.js` — product creation gates, validation, moderation, ownership, public listing safety
- `tests/createAdmin.test.js` — admin bootstrap script
- `tests/cartAddressCheckout.test.js` — cart add/update/remove/ownership, server-authoritative totals, price-forge resistance, availability flags, address CRUD + default rules, checkout summary revalidation (stock/status/seller/address), multi-seller carts
- `tests/paymentOrders.test.js` — create-order amount forgery, public-key-only responses, verify signature/amount/cart/stock/address failures, order creation on success, stock decrement + cart clear, price-change and cart-change rejection, gateway amount mismatch, duplicate-callback idempotency, multi-seller split + seller isolation, ownership/403, admin access, snapshots, COD flow
- `tests/orderLifecycle.test.js` — cancellation (eligibility, once-only stock restore, foreign-user 404, no gateway on COD, paid-cancel refund eligibility), returns (DELIVERED-only, mandatory reason, duplicates, ownership, seller/admin visibility), seller return decisions with per-seller isolation, admin return hub + decisions, refund state machine (server-side historical amount, forge resistance, idempotency/no double gateway call, in-progress 409, failure → REFUND_FAILED, unconfigured → 503, COD no-gateway), strict transition matrix on seller+admin status endpoints, and multi-seller cancel/return/refund safety + purchase-view history
- `tests/wishlistReviews.test.js` — wishlist auth/access (401/403/400/404), idempotent duplicate add, user isolation, unavailable-product dropping, review auth/access, purchase + DELIVERED verification, eligibility states (before/after delivery, after review, on unavailable products), multi-seller isolation, validation (400/422), duplicate 409 + database uniqueness, user-name-only public listing (no sensitive fields), admin moderation (approve idempotent, delete, list), and owner-only update/delete with cross-user forgery → 404
- `tests/sellerStatusRegister.test.js` — status endpoint auth/roles (401/403), no-application user → 200 + `seller: null` (never 404), PENDING/APPROVED/REJECTED/SUSPENDED status flow, cross-seller isolation (no other seller's data), registration auth, valid 201, invalid 422 with field-precise errors (`phone`, `storeName`, `kycDocuments`, `kycDocuments[0].documentType/documentNumber/documentUrl`), KYC enforcement (>5 docs, missing URL), duplicate 409, rejected-applicant reapply → 201, and exact KYC `documentType` enum acceptance (PAN/AADHAAR/PASSPORT/DRIVING_LICENSE/OTHER) with display-style/lowercase/unsupported types still rejected 422

The test URI is derived from `MONGO_URI` by replacing the database name with `multivendor_test` (never appended).

---

## Deployment notes

- Build: `npm install --omit=dev` (or `npm ci`).
- Start: `npm start` (single process). For production, run behind a process manager (PM2) and a reverse proxy.
- Set real `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*` and `RAZORPAY_*` in the environment; never commit `.env`.
- Atlas: MongoDB Atlas connection via `mongodb+srv://`.