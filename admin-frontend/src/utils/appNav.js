const isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Cross-application routing for the three ShopHub frontends.
export const APP_URLS = {
  user: import.meta.env.VITE_USER_APP_URL || (isLocal ? 'http://localhost:5173' : 'https://shophub-ecom-rho.vercel.app'),
  seller: import.meta.env.VITE_SELLER_APP_URL || (isLocal ? 'http://localhost:5174' : 'https://shophub-seller-coral.vercel.app'),
  admin: import.meta.env.VITE_ADMIN_APP_URL || (isLocal ? 'http://localhost:5175' : 'https://shophub-admin-six.vercel.app'),
}

export const roleToApp = (role) => ({ USER: 'user', SELLER: 'seller', ADMIN: 'admin' })[role]

export const appLabel = (key) => ({ user: 'storefront', seller: 'seller portal', admin: 'admin console' })[key]