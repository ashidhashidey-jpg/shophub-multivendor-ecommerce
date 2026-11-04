import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="page-container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-extrabold tracking-tight text-brand-800">404</p>
      <p className="mt-3 text-lg text-gray-500">Page not found.</p>
      <Link to="/" className="btn-primary mt-6">
        Back home
      </Link>
    </div>
  )
}