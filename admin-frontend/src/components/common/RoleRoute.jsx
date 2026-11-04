import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import ProtectedRoute from './ProtectedRoute'
import { APP_URLS } from '../../utils/appNav'

function AppRedirect({ url }) {
  useEffect(() => {
    window.location.assign(url)
  }, [url])
  return null
}

// Admin application: every protected route is ADMIN-role. A USER or SELLER who
// ends up here is sent to their own application; a guest is shown the sign-in
// state via ProtectedRoute.
export default function RoleRoute({ roles, children }) {
  const user = useSelector((s) => s.auth.user)

  if (user && !roles.includes(user.role)) {
    const fallback = { ADMIN: '/admin/dashboard', SELLER: APP_URLS.seller, USER: APP_URLS.user }[user.role] || '/'
    if (typeof fallback === 'string' && /^https?:/.test(fallback)) {
      return <AppRedirect url={fallback} />
    }
    return <Navigate to={fallback} replace />
  }

  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}