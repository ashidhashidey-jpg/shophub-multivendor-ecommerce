import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import RoleRoute from './components/common/RoleRoute'
import SessionGate from './components/common/SessionGate'

import LoginPage from './pages/public/LoginPage'

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

const adminRoute = (page) => <RoleRoute roles={['ADMIN']}>{page}</RoleRoute>

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Public — ADMIN signs in here */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin console — ADMIN role only */}
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={adminRoute(<AdminDashboardPage />)} />
            <Route path="/admin/users" element={adminRoute(<AdminUsersPage />)} />
            <Route path="/admin/users/:id" element={adminRoute(<AdminUserDetailPage />)} />
            <Route path="/admin/sellers" element={adminRoute(<AdminSellersPage />)} />
            <Route path="/admin/sellers/:id" element={adminRoute(<AdminSellerDetailPage />)} />
            <Route path="/admin/products" element={adminRoute(<AdminProductsPage />)} />
            <Route path="/admin/categories" element={adminRoute(<AdminCategoriesPage />)} />
            <Route path="/admin/orders" element={adminRoute(<AdminOrdersPage />)} />
            <Route path="/admin/orders/:id" element={adminRoute(<AdminOrderDetailPage />)} />
            <Route path="/admin/returns" element={adminRoute(<AdminReturnsPage />)} />
            <Route path="/admin/reviews" element={adminRoute(<AdminReviewsPage />)} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SessionGate>
    </BrowserRouter>
  )
}