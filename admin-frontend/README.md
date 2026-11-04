# ShopHub — Multi-Vendor E-Commerce Frontend

A production-quality React frontend for a MERN multi-vendor marketplace, wired directly to
a real Express/MongoDB backend (no mock data, no fake APIs). Three role-based portals —
**User**, **Seller**, **Admin** — share one consistent design system.

## Tech stack

- React 19 + Vite 8 (JSX)
- React Router 7 — route-based access control per role
- Redux Toolkit + React-Redux — auth session, toasts, cart badge count
- Axios — single client instance with JWT injection, 401 auto-logout, and normalized error parsing
- Tailwind CSS 4 (`@tailwindcss/vite`) — one custom "brand" color system, no dark/light toggle by design

## Project structure

```
src/
  api/            axios client (client.js) + every backend endpoint (endpoints.js)
  components/
    MainLayout, Navbar, Footer
    common/       Loader, Toasts, ProtectedRoute, RoleRoute, ProductCard, Pagination
  pages/
    public/       Home, Product list, Product detail, Category, Login, Register
    user/         Profile, Cart, Wishlist, Addresses, Checkout, Orders, Order detail
    seller/       Register (with KYC upload), Pending status, Dashboard, Products, Product
                   form (with image upload), Orders, Order detail
    admin/        Dashboard, Users, Sellers (+ KYC review), Products, Categories, Orders,
                   Reviews
  store/          Redux slices: auth (persisted to localStorage), notify (toasts), ui (cart count)
  utils/          formatINR / formatDate / StatusBadge helpers
```

## Setup

```bash
npm install
cp .env.example .env        # set VITE_API_BASE_URL — defaults to http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

The backend must be running separately (see the `server/` project) with `MONGO_URI`,
`JWT_SECRET`, and — optionally, for uploads/payment — `CLOUDINARY_*` and `RAZORPAY_*` set.
Without Cloudinary configured, image/KYC upload calls return a clear "uploads disabled"
error instead of failing silently; you can still paste an image/document URL directly.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build -> dist/
npm run preview    # preview the production build locally
npm run lint        # oxlint (0 errors)
```

## Environment variables

Only the API base URL is needed on the frontend — no secrets live here.

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Roles & route protection

Routes are guarded on both role and (for sellers) approval status. The backend remains the
final authority — every guard here is a UX convenience, not a security boundary.

| Area | Path prefix | Access |
|---|---|---|
| Public | `/`, `/products`, `/products/:id`, `/categories/:slug`, `/login`, `/register` | Everyone |
| User | `/cart`, `/wishlist`, `/checkout`, `/orders*`, `/profile`, `/addresses` | Logged-in USER |
| Seller | `/seller/dashboard`, `/seller/products*`, `/seller/orders*` | Logged-in SELLER, **status = APPROVED** (PENDING/REJECTED/SUSPENDED sellers land on `/seller/pending` with a status explanation) |
| Admin | `/admin/*` | Logged-in ADMIN |

## Payments (Razorpay)

Checkout supports **COD** and **Razorpay**. The Razorpay flow follows the backend contract
exactly: create a payment order server-side → open Razorpay Checkout → verify the signature
server-side → only then place the order. The order is never shown as "successful" until the
backend has confirmed it — a cancelled or failed payment surfaces an error toast instead.

## Uploads

- Product images: multipart field `file` → `POST /api/uploads/image` (single) — matches the
  backend's multer contract exactly (this was a documented gotcha in the spec: the field must
  be `file`, not `image`).
- Seller KYC documents: multipart field `document` → `POST /api/uploads/document`.

## What was fixed vs. the original scaffold

This frontend was audited line-by-line against the real backend contract. Bugs found and
fixed:
- Seller order endpoints pointed at `/sellers/orders*` instead of the backend's `/seller/orders*`.
- Product image upload sent field `image`; backend multer expects `file`.
- Seller/Admin order-status "advance" button never appeared for freshly placed (`PENDING`)
  orders, because the status flow list omitted `PENDING`.
- Cart/Checkout totals read `cart.totals.subtotal/total`, a field the backend never returns —
  now computed from `cart.items` on the client.
- Admin category list called a route (`GET /api/admin/categories`) that didn't exist on the
  backend — added the (read-only, admin-scoped) route rather than faking the data.
- Profile page had a "new password" field wired to an endpoint that silently ignores
  passwords — replaced with a proper change-password form hitting `PUT /users/change-password`.
- Toasts never auto-dismissed (no timer, no close button) — fixed.
- No real KYC file upload existed for seller onboarding (URL paste only), and admins had no
  way to view a seller's submitted KYC documents before approving — both added.

## Design

Single, deliberate visual theme (no dark/light toggle, per spec): a deep indigo/"brand" scale
paired with a warm amber accent, Plus Jakarta Sans typography, subtle card-lift hover motion,
and skeleton/inline loaders instead of full-page spinners. No demo data anywhere — every
number, list, and dashboard stat comes from a real API response; empty states render when the
database is empty.
