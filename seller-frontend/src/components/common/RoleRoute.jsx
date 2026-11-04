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

// Seller application: operational routes require the SELLER role (approval is
// enforced separately by ApprovedSellerRoute against the backend). An ADMIN is
// sent to the admin console; a USER is sent to the seller status page.
export default function RoleRoute({ roles, children }) {
  const user = useSelector((s) => s.auth.user)

  if (user && !roles.includes(user.role)) {
    const fallback = { ADMIN: APP_URLS.admin, SELLER: '/', USER: '/seller/pending' }[user.role] || '/'
    if (typeof fallback === 'string' && /^https?:/.test(fallback)) {
      return <AppRedirect url={fallback} />
    }
    return <Navigate to={fallback} replace />
  }

  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>
}