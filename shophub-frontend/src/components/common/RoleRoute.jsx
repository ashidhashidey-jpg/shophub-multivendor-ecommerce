import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProtectedRoute from './ProtectedRoute'

export default function RoleRoute({ roles, children }) {
  const user = useSelector((s) => s.auth.user)
  if (user && !roles.includes(user.role)) {
    const fallback = { ADMIN: '/admin/dashboard', SELLER: '/seller/dashboard', USER: '/profile' }
    return <Navigate to={fallback[user.role] || '/'} replace />
  }
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}