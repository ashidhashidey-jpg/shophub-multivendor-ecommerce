import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/slices/authSlice'
import { APP_URLS } from '../utils/appNav'
import {
  IconGrid,
  IconPackage,
  IconBag,
  IconRefresh,
  IconStore,
  IconLogout,
  IconArrow,
  IconClose,
} from './common/icons'

const NAV = [
  { to: '/seller/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/seller/products', label: 'Products', icon: IconPackage },
  { to: '/seller/orders', label: 'Orders', icon: IconBag },
  { to: '/seller/returns', label: 'Returns', icon: IconRefresh },
  { to: '/seller/profile', label: 'Store profile', icon: IconStore },
]

export default function Sidebar({ open, onClose }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)

  const signOut = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`shell-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Seller navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Link to="/seller/dashboard" onClick={onClose} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-accent-500 text-sm font-black text-brand-900">
              S
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-extrabold tracking-tight text-white">ShopHub</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-400">
                Seller portal
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <IconClose width={18} height={18} />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Signed in as</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{user?.name || 'Seller'}</p>
          <p className="truncate text-xs text-white/50">{user?.email || ''}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-accent-400">
            <IconStore width={12} height={12} /> Approved seller
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <Icon width={17} height={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 px-3 py-4">
          <a href={APP_URLS.user} target="_blank" rel="noreferrer" className="sidebar-link text-xs">
            <IconArrow width={15} height={15} /> View storefront
          </a>
          <button onClick={signOut} className="sidebar-link w-full text-xs">
            <IconLogout width={15} height={15} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
