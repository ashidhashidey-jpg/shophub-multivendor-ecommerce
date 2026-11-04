import { useSelector } from 'react-redux'
import { useLocation, Link } from 'react-router-dom'

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, token } = useSelector((s) => s.auth)
  const location = useLocation()

  if (!token || !user) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg text-gray-600">Please sign in to continue.</p>
        <Link
          to="/login"
          state={{ from: location.pathname }}
          className="btn-primary"
        >
          Sign in
        </Link>
      </div>
    )
  }

  if (roles.length && !roles.includes(user.role)) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg text-gray-600">You don't have permission to view this page.</p>
        <Link to="/" className="btn-primary">
          Go home
        </Link>
      </div>
    )
  }

  return children
}