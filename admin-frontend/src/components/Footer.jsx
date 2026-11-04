import { Link } from 'react-router-dom'
import { APP_URLS } from '../utils/appNav'
import { IconArrow } from './common/icons'

export default function Footer() {
  return (
    <footer className="border-t border-brand-200 bg-white">
      <div className="page-container flex flex-col items-center justify-between gap-4 py-8 text-center sm:flex-row sm:text-left">
        <div>
          <Link to="/login" className="flex items-center justify-center gap-2 sm:justify-start">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-black text-accent-500">
              S
            </span>
            <span className="text-sm font-extrabold tracking-tight text-brand-900">
              ShopHub <span className="font-semibold uppercase tracking-[0.14em] text-brand-400">Admin</span>
            </span>
          </Link>
          <p className="mt-2 text-xs text-brand-400">
            © {new Date().getFullYear()} ShopHub — marketplace operations console
          </p>
        </div>
        <a
          href={APP_URLS.user}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-900"
        >
          Browse storefront <IconArrow width={13} height={13} />
        </a>
      </div>
    </footer>
  )
}
