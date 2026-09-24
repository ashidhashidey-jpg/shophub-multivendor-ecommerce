import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { apiGetCart, apiCategories } from '../api/endpoints'
import { logout } from '../store/slices/authSlice'
import { setCartCount } from '../store/slices/uiSlice'

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const cartCount = useSelector((s) => s.ui.cartCount)
  const [search, setSearch] = useState('')
  const [cats, setCats] = useState([])
  const [showCats, setShowCats] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (user?.role === 'USER') {
      apiGetCart()
        .then((res) => dispatch(setCartCount(res.data.data.cart.items.length)))
        .catch(() => {})
    }
  }, [user, dispatch])

  useEffect(() => {
    apiCategories()
      .then((res) => setCats(res.data.data.categories))
      .catch(() => {})
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    navigate(search.trim() ? `/products?search=${encodeURIComponent(search.trim())}` : '/products')
    setMobileOpen(false)
  }

  const roleLinks = {
    USER: [
      { to: '/', label: 'Home' },
      { to: '/products', label: 'Products' },
      { to: '/cart', label: `Cart (${cartCount})` },
      { to: '/wishlist', label: 'Wishlist' },
      { to: '/orders', label: 'Orders' },
      { to: '/profile', label: 'Profile' },
      { to: '/seller/register', label: 'Sell' },
    ],
    SELLER: [
      { to: '/seller/dashboard', label: 'Dashboard' },
      { to: '/seller/products', label: 'Products' },
      { to: '/seller/orders', label: 'Orders' },
      { to: '/seller/returns', label: 'Returns' },
    ],
    ADMIN: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/sellers', label: 'Sellers' },
      { to: '/admin/products', label: 'Products' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/returns', label: 'Returns' },
    ],
  }

  const links = roleLinks[user?.role] || [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Products' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-brand-200 bg-white/95 backdrop-blur">
      <div className="page-container flex h-16 items-center gap-3 sm:gap-5">
        <Link to="/" className="shrink-0 text-lg font-extrabold tracking-tight text-brand-900">
          Shop<span className="text-brand-500">Hub</span>
        </Link>

        <form onSubmit={onSearch} className="hidden flex-1 lg:block">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="input max-w-md py-2"
          />
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {!user && (
            <div className="relative">
              <button
                onClick={() => setShowCats((v) => !v)}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Categories
              </button>
              {showCats && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-lg border border-brand-200 bg-white p-2 shadow-xl">
                  {cats.map((c) => (
                    <Link
                      key={c._id}
                      to={`/categories/${c.slug}`}
                      onClick={() => setShowCats(false)}
                      className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-sm text-gray-600">
                {user.name} <span className="text-xs text-gray-400">({user.role})</span>
              </span>
              <button
                onClick={() => {
                  dispatch(logout())
                  navigate('/')
                }}
                className="btn-secondary px-3 py-1.5"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-secondary px-3 py-1.5">
                Login
              </Link>
              <Link to="/register" className="btn-primary px-3 py-1.5">
                Register
              </Link>
            </div>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-brand-200 text-gray-700 hover:bg-gray-100 lg:hidden"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-brand-100 bg-white lg:hidden">
          <div className="page-container flex flex-col gap-3 py-4">
            <form onSubmit={onSearch}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                aria-label="Search products"
                className="input"
              />
            </form>

            {!user && (
              <details className="text-sm">
                <summary className="cursor-pointer rounded-md px-1 py-1 font-medium text-gray-700 hover:bg-gray-50">
                  Categories
                </summary>
                <div className="mt-1 flex flex-col">
                  {cats.map((c) => (
                    <Link
                      key={c._id}
                      to={`/categories/${c.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </details>
            )}

            <nav className="flex flex-col">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className={linkClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex flex-col gap-2 border-t border-brand-100 pt-3">
              {user ? (
                <>
                  <span className="px-1 text-sm text-gray-600">
                    {user.name} <span className="text-xs text-gray-400">({user.role})</span>
                  </span>
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      dispatch(logout())
                      navigate('/')
                    }}
                    className="btn-secondary"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-secondary flex-1">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary flex-1">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}