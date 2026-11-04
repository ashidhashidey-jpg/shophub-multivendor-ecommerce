import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import RoleRoute from './components/common/RoleRoute'
import SessionGate from './components/common/SessionGate'

import HomePage from './pages/public/HomePage'
import ProductListPage from './pages/public/ProductListPage'
import ProductDetailPage from './pages/public/ProductDetailPage'
import CategoryPage from './pages/public/CategoryPage'
import StoresPage from './pages/public/StoresPage'
import StorePage from './pages/public/StorePage'
import LoginPage from './pages/public/LoginPage'
import RegisterPage from './pages/public/RegisterPage'

import ProfilePage from './pages/user/ProfilePage'
import CartPage from './pages/user/CartPage'
import WishlistPage from './pages/user/WishlistPage'
import AddressesPage from './pages/user/AddressesPage'
import CheckoutPage from './pages/user/CheckoutPage'
import OrderSuccessPage from './pages/user/OrderSuccessPage'
import OrdersPage from './pages/user/OrdersPage'
import OrderDetailPage from './pages/user/OrderDetailPage'

import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/stores" element={<StoresPage />} />
            <Route path="/stores/:id" element={<StorePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* User (buyer) — USER role only */}
            <Route path="/profile" element={<RoleRoute roles={['USER']}><ProfilePage /></RoleRoute>} />
            <Route path="/cart" element={<RoleRoute roles={['USER']}><CartPage /></RoleRoute>} />
            <Route path="/wishlist" element={<RoleRoute roles={['USER']}><WishlistPage /></RoleRoute>} />
            <Route path="/addresses" element={<RoleRoute roles={['USER']}><AddressesPage /></RoleRoute>} />
            <Route path="/checkout" element={<RoleRoute roles={['USER']}><CheckoutPage /></RoleRoute>} />
            <Route path="/order-success" element={<RoleRoute roles={['USER']}><OrderSuccessPage /></RoleRoute>} />
            <Route path="/orders" element={<RoleRoute roles={['USER']}><OrdersPage /></RoleRoute>} />
            <Route path="/orders/:id" element={<RoleRoute roles={['USER']}><OrderDetailPage /></RoleRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SessionGate>
    </BrowserRouter>
  )
}