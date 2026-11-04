import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../store/slices/authSlice'
import { APP_URLS } from '../utils/appNav'
import { IconMenu, IconClose, IconArrow } from './common/icons'

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOut = () => {
    setMobileOpen(false)
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-brand-200 bg-white/95 backdrop-blur">
      <div className="page-container flex h-16 items-center gap-3 sm:gap-6">
        <Link to="/login" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand-900 text-sm font-black text-accent-500">
            S
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight text-brand-900">ShopHub</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
              Admin
            </span>
          </span>
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href={APP_URLS.user}
            className="hidden items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-900 sm:inline-flex"
          >
            Storefront <IconArrow width={12} height={12} />
          </a>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-bold text-accent-500">
                {(user.name || 'A').charAt(0).toUpperCase()}
              </span>
              <button onClick={signOut} className="btn-secondary btn-sm">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 place-items-center rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50 sm:hidden"
          >
            {mobileOpen ? <IconClose width={18} height={18} /> : <IconMenu width={18} height={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-brand-100 bg-white sm:hidden">
          <div className="page-container flex flex-col gap-2 py-4">
            <a href={APP_URLS.user} className="text-sm font-semibold text-brand-500">
              View storefront
            </a>
            {user ? (
              <button onClick={signOut} className="btn-secondary">
                Sign out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-primary text-center">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
