# ShopHub — Multi-Vendor E-Commerce Platform (MERN)

A production-style multi-vendor marketplace with three roles — **USER**, **SELLER**, **ADMIN** — built on the MERN stack with role-based authorization enforced on the backend.

```
React Frontend → Axios → Express REST API → MongoDB (Mongoose)
```

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, React Router 7, Redux Toolkit, Axios, Tailwind CSS 4 |
| Backend | Node.js, Express 5, Mongoose 9, JWT, bcrypt, Multer, Cloudinary (optional), Razorpay (payment) |
| Testing | Jest + Supertest (230 backend tests covering every mandatory business rule) |
| Dev | Git, Postman |

## Project Structure

```
multi-vendor-ecommerce/
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # db, cloudinary, razorpay, uploads
│   │   ├── controllers/    # auth, user, cart, wishlist, address, order, review,
│   │   │                   # seller, product(seller), category, payment, upload, admin
│   │   ├── models/         # User, Seller, Category, Product, Cart, Wishlist, Address, Order, Payment, Review
│   │   ├── routes/         # auth, users, products, categories, cart, wishlist, orders,
│   │   │                   # reviews, sellers, seller/products, payment, uploads, admin
│   │   ├── middlewares/    # auth (JWT), role guard, blocked-user guard, seller guard,
│   │   │                   # validation, error handler, not-found
│   │   ├── services/       # payment (Razorpay), order (checkout/verify), upload (Cloudinary)
│   │   ├── utils/          # ApiError, ApiResponse, JWT, bcrypt, validation helpers
│   │   └── validators/     # express-validator validators (register, login, product, order, payment...)
│   ├── tests/              # auth, userSellers, orders, admin, sellerLifecycle, productManagement, cartAddressCheckout, paymentOrders, orderLifecycle, wishlistReviews, sellerStatusRegister (12 suites / 251 tests)
│   └── server.js
├── frontend/               # React SPA
│   └── src/
│       ├── api/            # axios client + endpoint map
│       ├── components/     # Navbar, Footer, MainLayout, common guards/UI
│       ├── pages/          # public/, user/, seller/, admin/
│       ├── store/          # Redux slices
│       └── utils/
└── README.md
```

> Note: the backend folder is named `server/` (equivalent to `backend/` in the assignment's suggested layout). The same professional separation of config/controllers/models/routes/middlewares/services/utils/validators is used.

---

## 1. AUTHENTICATION (`/api/auth`)

- `POST /auth/register` — register USER (name, email, phone, password). Password hashed with **bcrypt**, duplicate email → `409`.
- `POST /auth/login` — verify credentials, sign JWT, return `{ token, user }`.
- `GET /auth/me` — current user (JWT protected).
- `GET /api/users/profile` · `PUT /api/users/profile` — view / update profile.

Enforced by middleware:
- `authenticate` — verifies Bearer JWT.
- `authorizeRoles(...)` — exact role match (`USER`/`SELLER`/`ADMIN`).
- `requireActiveUser` — **blocked users are denied (403)** for protected operations.
- `loadSeller` + `requireApprovedSeller` — seller endpoints gated on `APPROVED`.

---

## 2. USER SHOPPING MODULE

**Catalog**
- `GET /api/products` — list/search/filter (search by name/description, category slug, price range, sort, pagination). Only `APPROVED` + active products from **`APPROVED` sellers** are shown (`PENDING`/`REJECTED`/deactivated products and products of suspended/deleted sellers are always excluded).
- `GET /api/products/:id` — product detail (populated category/seller, availability). `400` for an invalid ID, `404` when the product or its seller is not publicly visible.
- `GET /api/products/:productId/reviews` — reviews + average rating + count.
- `GET /api/products/:productId/reviews/eligibility` — **USER-only, server-authoritative** answer to "can I review this?" returning `{ purchased, delivered, alreadyReviewed, canReview, reason, myReviewId }`; re-uses the exact purchase/delivery/duplicate checks of the create endpoint so the UI never has to guess.
- `GET /api/categories` — public category list (active categories only).

**Cart (backend-managed, `/api/cart`)**
- `GET /cart` · `POST /cart/items` · `PUT /cart/items/:productId` · `DELETE /cart/items/:productId` · `DELETE /cart`
- **USER-only** (sellers/admins → `403`). The user is always derived from the JWT — `userId` is never read from the body. Cart data is scoped per user: a user can only read, change, or remove their **own** cart lines; another user's line → `404`.
- A product may only be added when it **exists**, is `APPROVED`, is `isActive`, and its **seller is `APPROVED`** at add time (derived from the product document — never from a client-supplied seller ID). Rejected/inactive/unapproved-seller products → `404`; quantity above stock → `400`; invalid ID → `400`; zero/negative/non-integer quantity → `422`.
- Re-adding the same product **updates the existing line** (never a duplicate) and **revalidates stock** against the live quantity. Updating quantity re-checks availability and stock again.
- GET returns every line with: product id, name, image, **current DB price** (`price` list + `finalPrice`), quantity, **available stock**, `availability` + `unavailableReason`, seller/store info, `lineTotal`/`lineDiscount`, plus server-computed `totals` (`subtotal`, `discount`, `shipping: 0`, `total`, `itemCount`, `totalQuantity`).
- **Totals are never trusted from the frontend.** Money is recomputed from MongoDB current `price`/`finalPrice` at read time; a fake client price is ignored. Unavailable lines are flagged rather than silently priced. If a product is later deleted, rejected, deactivated, or its seller is suspended, the line is marked unavailable (excluded from totals).
- **Multi-seller carts are fully supported**: a cart may contain products from Seller A, B and C simultaneously; each line keeps its own `seller` reference for later multi-seller order processing.

**Wishlist (`/api/wishlist`)**
- `GET /wishlist` · `POST /wishlist/:productId` · `DELETE /wishlist/:productId` — USER-only **toggle** API (add/remove, both bodyless path-based calls). Adding is `404` unless the product is `APPROVED` + active; a duplicate add is idempotent (product stored once). `GET /wishlist` shows per-item DB price/stock and the seller's `storeName`, and **only surfaces products that are currently `APPROVED` and active** — deactivated/rejected/re-pended items are hidden from the listing (they remain in the user's wishlist document and reappear if re-approved). The product card, product detail page, and wishlist page share one server-backed wishlist state (no per-card fetches, no localStorage).

**Checkout summary (`/api/checkout/summary`)**
- `GET /checkout/summary` (optional `?addressId=`) — **USER-only**. Re-validates the whole cart against live MongoDB data at request time: product existence, `APPROVED` + active status, seller approval, and current stock. Any failure returns a **clear error** (e.g. `400 "Your cart is empty…"`, `400 "Insufficient stock for …"`, `400 … cannot be purchased …`, `404 Address not found`).
- Recomputes authoritative `items` + `totals` and returns the selected `address` (`addressId` or the user's default). The address must belong to the authenticated user, otherwise `404`.
- It performs **no order creation, no stock decrement, no charge, and no payment-gateway call** — it only prepares a validated summary for the UI.

**Addresses (`/api/users/addresses`)**
- `GET` · `POST` · `PUT /:id` · `DELETE /:id` · `PATCH /:id/default`. Fields: name, phone, addressLine1/2, city, state, postalCode, country, isDefault. All required fields validated server-side (`422`).
- Addresses are owned by the authenticated user: editing/deleting someone else's address → `404`, and the `user` field is **whitelisted out** of writes so ownership cannot be tampered with.
- **Default-address rules**: the first saved address becomes default automatically; setting a new default (on create/update/`PATCH default`) unsets all others so **at most one is default**; deleting the default auto-promotes a remaining address; a user with no addresses sees a clean empty state (no fake addresses are ever created).

**Checkout & Orders (`/api/orders`, `/api/payment`)**
- `POST /orders` — **COD only** (`paymentMethod: "COD"`). Re-validates stock for every line (money and stock come from DB — never client prices), computes per-seller subtotal/discount/total, **decrements stock atomically**, clears the cart, and creates **one Order record per seller** (each with its own totals, sharing a `checkoutId`). `paymentMethod: "RAZORPAY"` here → `400` pointing to the payment flow.
- `POST /payment/create-order` — Razorpay checkout. Server computes the **amount in paise** from live DB prices, validates the cart and address ownership, creates a real Razorpay order, and stores a `Payment` record (amount, cart signature, checkout id). Returns **only the public key id** (`RAZORPAY_KEY_ID`) — the secret never leaves the server. Any amount/total/payment status submitted by the client is **ignored**.
- `POST /payment/verify` — the ONLY path that creates a paid order. For every check below the payment is marked `FAILED` and **nothing is ordered, no stock is touched, and the cart is left intact**:
  1. the payment order must belong to the authenticated user;
  2. the **cart must still be purchasable and byte-identical** to what was quoted (cart signature);
  3. the **current server-computed amount must equal the quoted amount** (price-manipulation guard, money-safe);
  4. the delivery address must still belong to the user;
  5. the **Razorpay HMAC signature** must verify against `RAZORPAY_KEY_SECRET`;
  6. the **gateway-confirmed amount** must match the quoted amount (no trusting the client's claimed payment).
  Only then a **MongoDB transaction** creates one Order per seller, decrements stock with an atomic `stock >= qty` guard, and clears the cart. Repeated callbacks are **idempotent** (`duplicate: true`) and never create a second order; a captured-but-unconfirmable payment is surfaced with a clear "contact support" message (real refund/reversal of such edge-case payments is out of scope here).
- `GET /orders` — own order **purchase views**: every multi-seller checkout is grouped under its `checkoutId` with combined items/totals, `orderStatus`, `paymentStatus`, `sellerCount`, per-seller `groups`, and the real `_id` of the first seller record (detail, cancel, and return endpoints accept any of the group's record ids). `GET /orders/:id` — own purchase detail. `paymentStatus` is aggregated across the group: `PENDING`, `PAID`, `PARTIALLY_REFUNDED`, `REFUNDED`, `REFUND_FAILED`.
- `PATCH /orders/:id/cancel` — **cancels the whole checkout group** (every seller record sharing the same `checkoutId`). Only eligible items (`PENDING`/`CONFIRMED`) cancel; each cancelled item restores stock **exactly once**. Cancellation is **user-scoped and group-scoped**: it never touches another user's order and never reaches into an unrelated checkout. A cancelled **paid** purchase stays `paymentStatus: PAID` — the money is refundable through the admin refund flow (gateway refund is deliberately NOT emitted from the customer endpoint).
- `PATCH /orders/:id/return` — `{ productId, reason }` on a **`DELIVERED`** item of the group → `RETURN_REQUESTED`. The stored `reason` is mandatory (non-empty after trim, ≤ 2000 chars → `400`), user-scoped (`404` for another user's order), and a duplicate request is blocked (`400`). Requesting a return on an order that was never delivered → `400`.
- **Order item lifecycle.** Fulfillment advances **PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED** (strictly forward; no backwards jumps or skips to terminal states). Dedicated endpoints (with side effects) handle the rest:
  - Cancel: `PENDING`/`CONFIRMED` → `CANCELLED` (stock restored once).
  - Seller/admin return approve: `RETURN_REQUESTED` → `RETURNED` (stock restored once). Return reject: `RETURN_REQUESTED` → `DELIVERED` (stock untouched).
  - Admin refund only accepts `RETURNED` (court-approved return) or `CANCELLED` paid items → `REFUND_PENDING` → `REFUNDED` (see Admin module).
- Initial statuses: COD orders start `paymentStatus: PENDING` + item `PENDING`; Razorpay orders start `paymentStatus: PAID` (server-verified) + item `PENDING`.

**Payment (`/api/payment`)** — real Razorpay integration only.
- The checkout UI calls `create-order`, opens the official Razorpay checkout with the server-issued order id, then calls `verify` with the callback details. The success page and "order confirmed" state appear **only after the server verifies**.
- When `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are blank the gateway endpoints fail with a clear configuration message (never a fake success), and COD remains fully available. Order creation never trusts the frontend's claimed payment status.

**Reviews (`/api/products/:productId/reviews`, `/api/reviews`)**
- `POST` review (rating + comment) is **only allowed for purchased & delivered products** (validated against the user's actual orders — the exact product, same buyer, `DELIVERED` line). Otherwise `403`. Buying product A never enables reviewing product B, even from the same seller.
- `GET /api/products/:productId/reviews` is public, returns **approved** reviews with **user-name only** populated (no email/phone), and computes the average + count live from the actual reviews (nothing duplicated on the product).
- `GET /products/:productId/reviews/eligibility` gates the form — the UI only shows it when `canReview: true`.
- `GET /reviews/mine` · `PUT /reviews/:id` · `DELETE /reviews/:id` (owner-only; a foreign user editing/deleting a review → `404`).
- Duplicate review for the same product → `409`, backed by the DB unique index `{ user, product }`.
- Moderation: admin list/approve/delete via `/api/admin/reviews`.

---

## 3. SELLER MODULE (`/api/sellers`, `/api/seller/products`)

**Registration & KYC**
- `POST /sellers/register` — store name/description/phone/address + KYC (document upload via Cloudinary/Multer when configured). New sellers start `PENDING`.
- `GET /sellers/status` · `GET /sellers/profile` · `PUT /sellers/store`.
- **Status**: `PENDING` → `APPROVED` / `REJECTED` / `SUSPENDED`. Only `APPROVED` sellers can use dashboard/product/order management (`requireApprovedSeller` → else `403`).

**Products (`/api/seller/products`, `/api/admin/products`)**
- CRUD for own products: name, description, category, price, **discount**, **stock**, images (upload or URL), availability.
- Products are stored as MongoDB documents with a `seller` reference — the seller is always derived from the authenticated user, never from the request body.
- New products start `PENDING` and only an **ADMIN** can `approve` / `reject` / `activate` / `deactivate` them. Any edit by the seller returns the product to `PENDING` for re-approval.
- Validation is enforced on the backend: name (≥3), description (≥10), **valid active category**, price > 0, discount 0–100, stock ≥ 0, at most 8 image URLs. Inactive categories are rejected for new/edited products (`400`).
- Rejections store a `rejectionReason` that is returned to the seller and shown in the admin panel.
- **Ownership enforced server-side**: any request for a product not owned by the logged-in seller → `403`. Seller A can never view/modify/delete Seller B's product.
- Public listings and product details only expose products whose selling store is still `APPROVED`; suspended, rejected, unapproved, or deleted sellers' products are never shown. Products that are `PENDING`/`REJECTED`/deactivated are hidden from the public catalog.
- Admin listing supports **search** (name/description), **status filter**, and **seller filter**; admin can approve, reject (with reason), activate, and deactivate any product.

**Orders & Returns**
- `GET /sellers/orders` · `GET /sellers/orders/:id` — **only the seller's own line items**. In a multi-seller order, `otherSellerItemsCount` + `sellerSubtotal` are returned; other sellers' items/customer info are never exposed.
- `PATCH /sellers/orders/:id/status` — advance **own** items PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED (strictly forward, no backwards/random jumps; terminal states like `CANCELLED`/`RETURNED`/`REFUNDED` are rejected here because they require side effects). Cross-seller items → `404`.
- `PATCH /sellers/orders/:id/return` — seller decides a `RETURN_REQUESTED` item of **their own** order: `APPROVE` → `RETURNED` (stock restored once), `REJECT` → back to `DELIVERED` (stock untouched). Another seller's item → `403`.
- `GET /sellers/returns` — the seller's pending return requests **only**, each with the buyer's stored `returnReason`. Refunds on approved returns are issued only by the platform admin.

**Dashboard (`GET /sellers/dashboard`)**
- Total products, total orders, pending orders, delivered/completed orders, pending returns, total **sales**, total **earnings**.

---

## 4. ADMIN MODULE (`/api/admin`)

- `GET /admin/dashboard` — total users, sellers, products, orders, revenue (paid orders), pending seller approvals, pending product approvals, returns/refunds.
- **Users**: `GET /admin/users` (+search/filter role/blocked, pagination), `GET /admin/users/:id`, `PATCH /admin/users/:id/block` / `unblock`.
- **Sellers**: view all + KYC, `PATCH /admin/sellers/:id/approve|reject|suspend|reactivate`.
- **Products**: view all (+search by name/description, filter by status or seller, pagination), `PATCH /admin/products/:id/approve|reject|activate|deactivate` (reject accepts a `reason`). **Categories**: list all (`GET /admin/categories`, incl. inactive), `POST /admin/categories`, `PUT|DELETE /admin/categories/:id` (activate/deactivate via `isActive` in update).
- **Orders**: `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status` (by productId, same strictly-forward fulfillment matrix as sellers — no side-effecting terminal jumps).
  - **Returns**: `GET /admin/returns` — every pending return request across all sellers, flattened per item with customer, seller, product, quantity, refundable amount, buyer reason and order/payment status. `PATCH /admin/orders/:id/return` — admin-level `APPROVE` (→ `RETURNED`, restores stock once) / `REJECT` (→ `DELIVERED`, stock untouched).
  - **Refund flow**: `PATCH /admin/orders/:id/refund` refunds a paid `RETURNED` or `CANCELLED` item. The amount is **always the stored order snapshot** (`item.subtotal` — current product price and any client-supplied `amount`/`total` are ignored). Flow: item `RETURNED`/`CANCELLED` → claim is acquired atomically → `REFUND_PENDING` → gateway refund success → item `REFUNDED` with the Razorpay `refundId` stored and `paymentStatus: REFUNDED`; gateway failure reverts the item and marks `paymentStatus: REFUND_FAILED` (retryable, never a fake success); unconfigured Razorpay → `503` with no state change; duplicate request on an already-`REFUNDED` item → `200` with no second gateway call; a refund already in progress → `409`. COD orders are refunded administratively (no gateway call), and multi-seller purchases become `PARTIALLY_REFUNDED` until every paid group is refunded.
- **Reviews**: `GET /admin/reviews`, `PATCH /admin/reviews/:id/approve`, `DELETE /admin/reviews/:id`.

---

## 5. MANDATORY BUSINESS RULES — STATUS

| # | Business test | Implementation |
|---|---------------|----------------|
| 1 | Stock = 5, order 6 → rejected | Order/cart creation validates every line against live stock; `409`/`400` |
| 2 | Seller A edits Seller B product → rejected | Ownership check per request → `403` (also on GET/detail) |
| 3 | Normal user hits Admin API → denied | `authorizeRoles("ADMIN")` → `403` |
| 4 | PENDING seller hits full dashboard → restricted | `requireApprovedSeller` → `403` |
| 5 | User reviews a product they didn't purchase → rejected | Order membership + `DELIVERED` check → `403` |
| 6 | Duplicate email registration | Unique email index → `409` with clean message |
| 7 | Invalid MongoDB ID → clean error, no crash | `validateObjectId`/`validateId` returns `400` "Invalid … ID" before any DB call; centralized handler catches the rest |
| 8 | Stock restored exactly once on cancel/return | Status-transition guards (cancellable states / `RETURN_REQUESTED` approval) + `$inc` by stored quantity; retry of a cancelled/approved item is blocked so stock can never be double-restored |
| 9 | Multi-seller order isolation | Seller endpoints filter `items.seller === req.seller._id`; cancel/return are `checkoutId`-group-scoped and user-scoped; refunds are per-seller-order |
| 10 | Blocked user protected operation → denied | `requireActiveUser` → `403` |
| 11 | PENDING/REJECTED/SUSPENDED seller cannot create products | `authorizeRoles("SELLER")` + `requireApprovedSeller` → `403` |
| 12 | Seller A edits/deletes Seller B product → rejected | Ownership check per request → `403` |
| 13 | Product must be APPROVED + active + seller APPROVED to be public | Public filters: `{ status:"APPROVED", isActive:true }` + seller `status:"APPROVED"`; suspended/deleted sellers' products hidden |
| 14 | Inactive category cannot be used for new product | `Category.findOne({ _id, isActive:true })` → `400` |
| 15 | Cart cannot be forged with client-supplied prices | Cart/checkout money comes only from MongoDB `price`/`finalPrice`; a fake client price is ignored |
| 16 | Checkout revalidates product + seller + stock at summary time | `GET /checkout/summary` re-checks every line live and fails with a clear error |
| 17 | At most one default address; deleting it promotes another | `unsetOtherDefaults` on every default set; auto-promote on delete; no default left dangling |
| 18 | Client cannot forge the payment amount/status | Amount computed server-side in paise; a submitted amount/total/payment status is ignored; gateway + HMAC + cart-signature verified server-side before any order exists |
| 19 | No order on failed/missing verification | Signature/amount/stock/cart failures leave the cart intact, stock untouched, no Order row, and the `Payment` marked `FAILED` (`CREATED` only when the gateway can't be reached) |
| 20 | Duplicate payment callback cannot double-charge / double-order | Idempotency check + unique `Payment.razorpayOrderId`; repeat verify returns `duplicate: true` with the existing purchase; no duplicate stock decrement |
| 21 | Customer cannot cancel/return another user's order | Group fetched via `{ user: req.user._id, checkoutId }`; any foreign group → `404`; SELLER/ADMIN on user lifecycle endpoints → `403` |
| 22 | Order status cannot jump backwards or into terminal states via the generic status endpoint | One strictly-forward fulfillment matrix (`assertOrderItemLifecycleTransition`) used by both seller and admin status endpoints; cancel/return/refund only through their dedicated side-effecting endpoints |
| 23 | Return reason is mandatory and stored; returns only on DELIVERED items | Server validation (non-empty after trim, ≤ 2000 chars → `400`); `assertItemReturnEligible` requires `DELIVERED`; buyer reason is persisted to the item and surfaced to seller/admin |
| 24 | Refunds can't be forged, double-issued, or faked | Amount always from the stored order snapshot (client `amount`/`total` ignored); atomic claim via `Order.updateOne` guarded on item status prevents concurrent double refund; duplicate refund emits no second gateway call; unconfigured/missing gateway → `503`/`REFUND_FAILED`, never a fake `REFUNDED`; `REFUND_PENDING` concurrency → `409` |

Additional hardening: passwords never stored in plain text (bcrypt), JWT never trusts client roles, invalid IDs sanitized, 10 MB JSON/URL payload limits, centralized `errorHandler` (400/401/403/404/409/500) that never leaks internals, Razorpay secret never returned to the client and **never printed** anywhere (missing config reports only the variable name).

---

## 6. Validation

Both **frontend** (form-level) and **backend** (express-validator + middleware) validate: required fields, email format, phone format/length, password strength, product price ≥ 0, discount 0–100, stock ≥ 0, duplicate records (409), invalid ObjectIds (400), insufficient stock (400). Backend remains authoritative.

---

## 7. Setup & Run

```bash
# Backend
cd server
npm install
copy .env.example .env        # fill MONGO_URI + JWT_SECRET (see below)
npm test                      # 251 tests, all business rules
npm run dev                   # http://localhost:5000

# Frontend
cd frontend
npm install
copy .env.example .env        # VITE_API_BASE_URL=http://localhost:5000/api
npm run build                 # production build
npm run dev                   # http://localhost:5173
```

### Environment (`server/.env`)

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/multivendor_ecommerce
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=        # optional — enables product/KYC uploads
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=              # optional — enables card/UPI/netbanking gateway
RAZORPAY_KEY_SECRET=
```

Image/KYC upload degrades to base64 → local `/uploads/**` storage when Cloudinary is not configured; payment degrades to COD-only with clear messaging. No feature fakes success.

### First Admin account

There are no seeded/demo accounts. Create the platform Admin with the controlled setup command:

```bash
cd server
npm run create-admin
```

The command runs inside a connected terminal and interactively asks for the Admin **name**, **email** and **password** (the password is hidden while typing). It validates the input against the same rules the API uses, rejects an already-registered email, refuses to run when any Admin already exists, hashes the password with the existing bcrypt mechanism via the `User` model, and stores the account in MongoDB with `role = "ADMIN"`.

Guarantees:

- It is **never** executed at server startup — the Admin exists only after you intentionally run it.
- It never drops the database and never deletes or modifies existing users, sellers, products, orders or categories.
- No demo data and no duplicate admins are created.

After creation, the Admin signs in through the normal `/login` flow and is redirected to the Admin dashboard.

---

## 8. API Testing (Postman)

Importables cover: register, login, invalid login, duplicate registration, protected API, admin API (user→403), seller approval, product CRUD, cross-seller 403, stock-limit 409, order create (COD + Razorpay), payment create-order/verify, cancel/return + stock restore, review authorization, invalid-id 400, blocked-user 403, multi-seller isolation, refunds, payment-callback security (forged/amount/gateway/duplicate callbacks). The Jest suite (`server/tests/*.test.js`) exercises all of the above end-to-end against a dedicated disposable test database with a **mocked Razorpay gateway** — no real money is ever charged during tests.

---

## 9. Verification status

- Backend: **251/251 Jest tests pass** (12 suites, incl. the dedicated `orderLifecycle` suite covering cancellation, return requests, seller/admin return decisions, and the refund state machine with a mocked gateway, plus the `wishlistReviews` suite covering wishlist and purchase-verified reviews, and the `sellerStatusRegister` suite covering the seller status endpoint, structured registration validation, and the exact KYC `documentType` enum) · server boots with no seeding · test DB and smoke DB are disposable (dropped after each run) and the real `multivendor_ecommerce` DB is never seeded.
- Frontend: **`vite build` passes**, `oxlint` reports 0 errors (only pre-existing style warnings).
- All features above are wired to the real backend; no mocked functionality.
- **Wishlist is wired in the UI**: filled/outline heart toggles on product cards and the product page, a shared server-backed wishlist state, and a wishlist page with loading/error/out-of-stock states; unavailable products are never shown.
- **Reviews are wired in the UI**: the review form only appears when the server says `canReview: true` (never a misleading form for non-purchasers), review dates and reviewer names are shown, and delivered order items link directly to "Write a review".
- **Payment is wired into the checkout flow**: Pay Now opens the real Razorpay checkout, the payment is verified server-side, and the order-success page only appears after verification. COD is a first-class alternative.
- **Order lifecycle is fully wired in the UI**: customer cancel (confirm dialog) + return request (mandatory reason); seller return decision lists and per-order approve/reject; admin returns hub plus per-order refund with refund id, `REFUND_PENDING` and `REFUND_FAILED` surfaced.
- **Out of scope in this task (NOT implemented)**: automated refund/reversal of a captured-but-unconfirmable edge-case payment (the verify flow tells the customer to contact support; the admin refund endpoint covers `RETURNED`/`CANCELLED` paid items), and shipping/order-delivery simulation beyond status transitions.