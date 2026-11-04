import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { APP_URLS } from '../utils/appNav'
import { IconArrow } from './common/icons'

export default function Footer() {
  const user = useSelector((s) => s.auth.user)
  const isSeller = user?.role === 'SELLER'

  return (
    <footer className="border-t border-brand-200 bg-white">
      <div className="page-container pb-6 pt-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-black text-accent-500">
                S
              </span>
              <span className="text-sm font-extrabold tracking-tight text-brand-900">
                ShopHub <span className="font-semibold uppercase tracking-[0.14em] text-brand-400">Seller</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-brand-500">
              Your store management workspace. Products are reviewed by the platform before they go live.
            </p>
            <a
              href={APP_URLS.user}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-900"
            >
              Browse the storefront <IconArrow width={13} height={13} />
            </a>
          </div>

          <div>
            <p className="section-label mb-3">Seller portal</p>
            <ul className="space-y-2">
              {isSeller ? (
                <>
                  <li>
                    <Link to="/seller/dashboard" className="text-sm text-brand-500 hover:text-brand-900">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/seller/products" className="text-sm text-brand-500 hover:text-brand-900">
                      Products
                    </Link>
                  </li>
                  <li>
                    <Link to="/seller/orders" className="text-sm text-brand-500 hover:text-brand-900">
                      Orders
                    </Link>
                  </li>
                  <li>
                    <Link to="/seller/returns" className="text-sm text-brand-500 hover:text-brand-900">
                      Returns
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/seller/register" className="text-sm text-brand-500 hover:text-brand-900">
                      Apply to sell
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="text-sm text-brand-500 hover:text-brand-900">
                      Seller sign in
                    </Link>
                  </li>
                  {user?.role === 'USER' && (
                    <li>
                      <Link to="/seller/pending" className="text-sm text-brand-500 hover:text-brand-900">
                        Application status
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="section-label mb-3">Marketplace</p>
            <ul className="space-y-2">
              <li>
                <a href={APP_URLS.user} className="text-sm text-brand-500 hover:text-brand-900">
                  Shop products
                </a>
              </li>
              <li>
                <a href={APP_URLS.user} className="text-sm text-brand-500 hover:text-brand-900">
                  Buyer help centre
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-brand-100 pt-6 text-xs text-brand-400">
          <p>© {new Date().getFullYear()} ShopHub — Multi-vendor e-commerce platform</p>
          <p>Seller workspace</p>
        </div>
      </div>
    </footer>
  )
}
