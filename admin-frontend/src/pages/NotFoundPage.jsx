import { Link } from 'react-router-dom'
import { IconArrow } from '../components/common/icons'

export default function NotFoundPage() {
  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="font-display text-8xl leading-none text-brand-200">404</p>
      <h1 className="mt-2 text-xl font-bold text-brand-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-brand-500">
        The page you were looking for may have moved or no longer exists.
      </p>
      <Link to="/admin/dashboard" className="btn-primary mt-6">
        Back to dashboard <IconArrow width={16} height={16} />
      </Link>
    </div>
  )
}
