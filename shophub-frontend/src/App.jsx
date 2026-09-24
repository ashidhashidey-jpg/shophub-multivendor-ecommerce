import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import RoleRoute from './components/common/RoleRoute'
import ProtectedRoute from './components/common/ProtectedRoute'
import ApprovedSellerRoute from './components/common/ApprovedSellerRoute'

import HomePage from './pages/public/HomePage'
import ProductListPage from './pages/public/ProductListPage'
import ProductDetailPage from './pages/public/ProductDetailPage'
import CategoryPage from './pages/public/CategoryPage'
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

import SellerRegisterPage from './pages/seller/SellerRegisterPage'
import SellerPendingPage from './pages/seller/SellerPendingPage'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerProductFormPage from './pages/seller/SellerProductFormPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerOrderDetailPage from './pages/seller/SellerOrderDetailPage'
import SellerReturnsPage from './pages/seller/SellerReturnsPage'

import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage'
import AdminSellersPage from './pages/admin/AdminSellersPage'
import AdminSellerDetailPage from './pages/admin/AdminSellerDetailPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage'
import AdminReturnsPage from './pages/admin/AdminReturnsPage'
import AdminReviewsPage from './pages/admin/AdminReviewsPage'

import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/categories/:slug" element={<CategoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* User (buyer) */}
          <Route path="/profile" element={<RoleRoute roles={['USER']}><ProfilePage /></RoleRoute>} />
          <Route path="/cart" element={<ProtectedRoute roles={['USER']}><CartPage /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute roles={['USER']}><WishlistPage /></ProtectedRoute>} />
          <Route path="/addresses" element={<RoleRoute roles={['USER']}><AddressesPage /></RoleRoute>} />
          <Route path="/checkout" element={<RoleRoute roles={['USER']}><CheckoutPage /></RoleRoute>} />
          <Route path="/order-success" element={<RoleRoute roles={['USER']}><OrderSuccessPage /></RoleRoute>} />
          <Route path="/orders" element={<RoleRoute roles={['USER']}><OrdersPage /></RoleRoute>} />
          <Route path="/orders/:id" element={<RoleRoute roles={['USER']}><OrderDetailPage /></RoleRoute>} />

          {/* Seller */}
          <Route path="/seller/register" element={<RoleRoute roles={['USER']}><SellerRegisterPage /></RoleRoute>} />
          <Route
            path="/seller/pending"
            element={
              <ProtectedRoute roles={['USER', 'SELLER']}>
                <SellerPendingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/seller/dashboard" element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerDashboardPage /></ApprovedSellerRoute></RoleRoute>} />
          <Route path="/seller/products" element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerProductsPage /></ApprovedSellerRoute></RoleRoute>} />
          <Route
            path="/seller/products/create"
            element={
              <RoleRoute roles={['SELLER']}>
                <ApprovedSellerRoute>
                  <SellerProductFormPage />
                </ApprovedSellerRoute>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/products/:id/edit"
            element={
              <RoleRoute roles={['SELLER']}>
                <ApprovedSellerRoute>
                  <SellerProductFormPage />
                </ApprovedSellerRoute>
              </RoleRoute>
            }
          />
          <Route path="/seller/orders" element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerOrdersPage /></ApprovedSellerRoute></RoleRoute>} />
          <Route
            path="/seller/orders/:id"
            element={
              <RoleRoute roles={['SELLER']}>
                <ApprovedSellerRoute>
                  <SellerOrderDetailPage />
                </ApprovedSellerRoute>
              </RoleRoute>
            }
          />
          <Route
            path="/seller/returns"
            element={
              <RoleRoute roles={['SELLER']}>
                <ApprovedSellerRoute>
                  <SellerReturnsPage />
                </ApprovedSellerRoute>
              </RoleRoute>
            }
          />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<RoleRoute roles={['ADMIN']}><AdminDashboardPage /></RoleRoute>} />
          <Route path="/admin/users" element={<RoleRoute roles={['ADMIN']}><AdminUsersPage /></RoleRoute>} />
          <Route path="/admin/users/:id" element={<RoleRoute roles={['ADMIN']}><AdminUserDetailPage /></RoleRoute>} />
          <Route path="/admin/sellers" element={<RoleRoute roles={['ADMIN']}><AdminSellersPage /></RoleRoute>} />
          <Route path="/admin/sellers/:id" element={<RoleRoute roles={['ADMIN']}><AdminSellerDetailPage /></RoleRoute>} />
          <Route path="/admin/products" element={<RoleRoute roles={['ADMIN']}><AdminProductsPage /></RoleRoute>} />
          <Route path="/admin/categories" element={<RoleRoute roles={['ADMIN']}><AdminCategoriesPage /></RoleRoute>} />
          <Route path="/admin/orders" element={<RoleRoute roles={['ADMIN']}><AdminOrdersPage /></RoleRoute>} />
          <Route path="/admin/orders/:id" element={<RoleRoute roles={['ADMIN']}><AdminOrderDetailPage /></RoleRoute>} />
          <Route path="/admin/returns" element={<RoleRoute roles={['ADMIN']}><AdminReturnsPage /></RoleRoute>} />
          <Route path="/admin/reviews" element={<RoleRoute roles={['ADMIN']}><AdminReviewsPage /></RoleRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}