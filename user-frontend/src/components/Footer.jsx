import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { APP_URLS, roleToApp, appLabel } from '../utils/appNav'
import { IconShield, IconTruck, IconRefresh, IconHeadset, IconStore, IconArrow } from './common/icons'

const trust = [
  { icon: IconTruck, title: 'Tracked delivery', text: 'Every order is traceable from dispatch to doorstep.' },
  { icon: IconShield, title: 'Secure payments', text: 'Online payments are verified server-side.' },
  { icon: IconRefresh, title: 'Easy returns', text: 'Request a return from your order page.' },
  { icon: IconHeadset, title: 'Seller support', text: 'Independent stores, backed by platform review.' },
]

export default function Footer() {
  const user = useSelector((s) => s.auth.user)

  const shopLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'All products' },
    { to: '/stores', label: 'Verified stores' },
    ...(user?.role === 'USER' ? [{ to: '/wishlist', label: 'Wishlist' }] : []),
  ]

  const accountLinks = () => {
    if (user?.role === 'USER') {
      return [
        { to: '/profile', label: 'Profile' },
        { to: '/orders', label: 'Orders' },
        { to: '/addresses', label: 'Addresses' },
        { to: '/wishlist', label: 'Wishlist' },
      ]
    }
    const app = user ? roleToApp(user.role) : null
    if (app && APP_URLS[app]) {
      return [{ to: APP_URLS[app], label: `Open ${appLabel(app)}`, external: true }]
    }
    return [
      { to: '/login', label: 'Sign in' },
      { to: '/register', label: 'Create account' },
    ]
  }

  return (
    <footer className="mt-20 border-t border-brand-200 bg-brand-100">
      <div className="page-container">
        {/* Trust strip */}
        <div className="grid gap-x-8 gap-y-6 border-b border-brand-200 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-accent-700">
                <Icon width={16} height={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-brand-900">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-brand-500">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-x-8 gap-y-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.7fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-display text-xl leading-none text-accent-500">
                S
              </span>
              <span className="text-lg font-extrabold tracking-tight text-brand-900">
                Shop<span className="text-brand-400">Hub</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-brand-500">
              A multi-vendor marketplace for everyday needs — fashion, electronics, home, beauty and more — from
              independent stores reviewed by our team.
            </p>
            <p className="mt-4 text-xs text-brand-400">
              Product availability, pricing and seller information come directly from each store.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-900">Shop</p>
            <ul className="mt-4 space-y-2.5">
              {shopLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-brand-500 transition-colors hover:text-brand-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-900">Account</p>
            <ul className="mt-4 space-y-2.5">
              {accountLinks().map((l) => (
                <li key={l.to}>
                  {l.external ? (
                    <a href={l.to} className="text-sm text-brand-500 transition-colors hover:text-brand-900">
                      {l.label}
                    </a>
                  ) : (
                    <Link to={l.to} className="text-sm text-brand-500 transition-colors hover:text-brand-900">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-brand-200 bg-white p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-accent-700">
              <IconStore width={16} height={16} />
            </span>
            <p className="mt-3 font-display text-2xl leading-tight text-brand-900">Grow with ShopHub</p>
            <p className="mt-1.5 text-xs leading-5 text-brand-500">
              Apply once, manage your own catalogue and orders, and reach shoppers across the marketplace.
            </p>
            <a
              href={APP_URLS.seller}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-900 hover:text-accent-700"
            >
              Become a seller <IconArrow width={15} height={15} />
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-brand-200 py-6 text-xs text-brand-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ShopHub. Multi-vendor e-commerce platform.</p>
          <p className="text-brand-400">Prices in INR · Seller-approved catalogue</p>
        </div>
      </div>
    </footer>
  )
}
