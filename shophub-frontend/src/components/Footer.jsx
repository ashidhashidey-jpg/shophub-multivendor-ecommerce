import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-brand-200 bg-white">
      <div className="page-container flex flex-col items-center justify-between gap-3 py-8 text-sm text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} ShopHub — Multi-vendor e-commerce demo</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link to="/products" className="font-medium text-gray-600 transition-colors hover:text-brand-900">
            Products
          </Link>
          {localStorage.getItem('token') ? null : (
            <>
              <Link to="/login" className="font-medium text-gray-600 transition-colors hover:text-brand-900">
                Login
              </Link>
              <Link to="/seller/register" className="font-medium text-gray-600 transition-colors hover:text-brand-900">
                Become a seller
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}