import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/MainLayout'
import RoleRoute from './components/common/RoleRoute'
import ProtectedRoute from './components/common/ProtectedRoute'
import ApprovedSellerRoute from './components/common/ApprovedSellerRoute'
import SessionGate from './components/common/SessionGate'
import SellerHomeGuard from './components/common/SellerHomeGuard'

import LoginPage from './pages/public/LoginPage'

import SellerRegisterPage from './pages/seller/SellerRegisterPage'
import SellerPendingPage from './pages/seller/SellerPendingPage'
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerProductFormPage from './pages/seller/SellerProductFormPage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerOrderDetailPage from './pages/seller/SellerOrderDetailPage'
import SellerReturnsPage from './pages/seller/SellerReturnsPage'
import SellerProfilePage from './pages/seller/SellerProfilePage'

import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <SessionGate>
        <Routes>
          <Route element={<MainLayout />}>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Status-aware home: approved sellers land on the dashboard,
                everyone else on their application status page. */}
            <Route path="/" element={<SellerHomeGuard />} />

            {/* No application yet, or in PENDING/REJECTED review */}
            <Route path="/seller/register" element={<RoleRoute roles={['USER']}><SellerRegisterPage /></RoleRoute>} />
            <Route path="/seller/pending" element={<ProtectedRoute roles={['USER', 'SELLER']}><SellerPendingPage /></ProtectedRoute>} />

            {/* Approved sellers only — status is re-validated against the backend */}
            <Route
              path="/seller/dashboard"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerDashboardPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/products"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerProductsPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/products/create"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerProductFormPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/products/:id/edit"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerProductFormPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/orders"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerOrdersPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/orders/:id"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerOrderDetailPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/returns"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerReturnsPage /></ApprovedSellerRoute></RoleRoute>}
            />
            <Route
              path="/seller/profile"
              element={<RoleRoute roles={['SELLER']}><ApprovedSellerRoute><SellerProfilePage /></ApprovedSellerRoute></RoleRoute>}
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SessionGate>
    </BrowserRouter>
  )
}