// Cross-application routing for the three ShopHub frontends.
// Each app reads its siblings' URLs from env so no URL is ever hardcoded.
export const APP_URLS = {
  user: import.meta.env.VITE_USER_APP_URL || 'http://localhost:5173',
  seller: import.meta.env.VITE_SELLER_APP_URL || 'http://localhost:5174',
  admin: import.meta.env.VITE_ADMIN_APP_URL || 'http://localhost:5175',
}

export const roleToApp = (role) => ({ USER: 'user', SELLER: 'seller', ADMIN: 'admin' })[role]

export const appLabel = (key) => ({ user: 'storefront', seller: 'seller portal', admin: 'admin console' })[key]