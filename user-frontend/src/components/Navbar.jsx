import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { apiGetCart, apiCategories } from '../api/endpoints'
import { logout } from '../store/slices/authSlice'
import { setCartCount } from '../store/slices/uiSlice'
import { useWishlist } from '../store/wishlist-context'
import { APP_URLS, roleToApp, appLabel } from '../utils/appNav'
import {
  IconSearch,
  IconHeart,
  IconBag,
  IconMenu,
  IconClose,
  IconChevron,
  IconStore,
  IconUser,
  IconPackage,
  IconMapPin,
  IconLogout,
  IconTruck,
  IconShield,
} from './common/icons'

const navLinkClass = ({ isActive }) =>
  `relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-brand-900' : 'text-brand-500 hover:text-brand-900'
  }`

const accountLinkClass = 'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-50'

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const cartCount = useSelector((s) => s.ui.cartCount)
  const { count: wishlistCount, ready: wishlistReady } = useWishlist()
  const [search, setSearch] = useState('')
  const [searchCat, setSearchCat] = useState('')
  const [cats, setCats] = useState([])
  const [showCats, setShowCats] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cartReady, setCartReady] = useState(false)

  const isBuyer = user?.role === 'USER'

  useEffect(() => {
    if (user?.role !== 'USER') {
      setCartReady(false)
      return
    }
    let cancelled = false
    setCartReady(false)
    apiGetCart()
      .then((res) => {
        if (!cancelled) dispatch(setCartCount(res.data.data.cart.items.length))
      })
      .catch(() => {
        if (!cancelled) dispatch(setCartCount(0))
      })
      .finally(() => {
        if (!cancelled) setCartReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [user?.role, dispatch])

  useEffect(() => {
    apiCategories()
      .then((res) => setCats(res.data.data.categories))
      .catch(() => {})
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    if (searchCat) next.set('category', searchCat)
    navigate(next.toString() ? `/products?${next.toString()}` : '/products')
    setMobileOpen(false)
  }

  // Badges only render once their source has actually loaded, so an empty
  // ("0") state is never shown while the request is still in flight.
  const cartBadge = isBuyer && cartReady ? cartCount : null
  const wishlistBadge = isBuyer && wishlistReady ? wishlistCount : null

  const foreignApp = user ? roleToApp(user.role) : null
  const showSellerLink = user?.role !== 'SELLER' && user?.role !== 'ADMIN'

  const primaryLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Shop all' },
    { to: '/stores', label: 'Stores' },
  ]

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="sticky top-0 z-50 border-b border-brand-200 bg-white/95 backdrop-blur">
      {/* Announcement strip — descriptive platform facts only. */}
      <div className="bg-brand-600 text-white">
        <div className="page-container flex h-9 items-center justify-between gap-4 text-[11px] font-medium tracking-wide sm:text-xs">
          <p className="truncate">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 align-middle" />
            Verified sellers · Admin-approved products
          </p>
          <div className="hidden items-center gap-5 sm:flex">
            <span className="inline-flex items-center gap-1.5 text-white/80">
              <IconTruck width={13} height={13} /> Tracked delivery
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/80">
              <IconShield width={13} height={13} /> Secure payments
            </span>
            <a href={APP_URLS.seller} className="font-semibold text-accent-500 hover:text-accent-400">
              Sell on ShopHub
            </a>
          </div>
        </div>
      </div>

      <div className="page-container flex h-[68px] items-center gap-2 sm:gap-4">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-200 text-gray-700 hover:bg-brand-50 lg:hidden"
        >
          {mobileOpen ? <IconClose /> : <IconMenu />}
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-display text-xl leading-none text-accent-500">
            S
          </span>
          <span className="text-lg font-extrabold tracking-tight text-brand-900">
            Shop<span className="text-brand-400">Hub</span>
          </span>
        </Link>

        {/* Functional search — category scope maps to the existing product API. */}
        <form onSubmit={onSearch} className="hidden flex-1 lg:block" role="search">
          <div className="mx-auto flex max-w-2xl items-stretch overflow-hidden rounded-lg border border-brand-300 bg-white transition focus-within:border-brand-600">
            <select
              aria-label="Search within category"
              value={searchCat}
              onChange={(e) => setSearchCat(e.target.value)}
              className="max-w-[9.5rem] border-0 bg-brand-50 px-3 text-xs font-medium text-gray-600 outline-none"
            >
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c._id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands and stores…"
              aria-label="Search products"
              className="min-w-0 flex-1 border-0 px-4 py-2.5 text-sm outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex w-12 items-center justify-center bg-brand-600 text-white transition-colors hover:bg-brand-700"
            >
              <IconSearch width={18} height={18} />
            </button>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {isBuyer && (
            <>
              <Link
                to="/wishlist"
                aria-label="Wishlist"
                className="group relative hidden h-10 items-center gap-2 rounded-md px-2 text-gray-700 transition-colors hover:bg-brand-50 sm:flex"
              >
                <span className="relative">
                  <IconHeart filled={wishlistBadge > 0} />
                  {wishlistBadge > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-brand-900">
                      {wishlistBadge}
                    </span>
                  )}
                </span>
                <span className="hidden text-xs font-semibold leading-tight xl:block">
                  Wishlist
                </span>
              </Link>
              <Link
                to="/cart"
                aria-label="Shopping cart"
                className="group relative flex h-10 items-center gap-2 rounded-md px-2 text-gray-700 transition-colors hover:bg-brand-50"
              >
                <span className="relative">
                  <IconBag />
                  {cartBadge > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-brand-900">
                      {cartBadge}
                    </span>
                  )}
                </span>
                <span className="hidden text-xs font-semibold leading-tight xl:block">Cart</span>
              </Link>
            </>
          )}

          {user ? (
            <details className="group relative hidden sm:block">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-gray-700 transition-colors hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <IconUser width={16} height={16} />
                </span>
                <span className="hidden text-xs font-semibold leading-tight lg:block">
                  {user.name?.split(' ')[0] || 'Account'}
                  <span className="block font-normal text-gray-400">{user.role}</span>
                </span>
                <IconChevron className="hidden lg:block" />
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-brand-200 bg-white p-1.5 shadow-xl">
                {isBuyer && (
                  <>
                    <Link to="/profile" className={accountLinkClass}>
                      <IconUser width={16} height={16} /> My profile
                    </Link>
                    <Link to="/orders" className={accountLinkClass}>
                      <IconPackage width={16} height={16} /> My orders
                    </Link>
                    <Link to="/wishlist" className={accountLinkClass}>
                      <IconHeart width={16} height={16} /> Wishlist
                    </Link>
                    <Link to="/addresses" className={accountLinkClass}>
                      <IconMapPin width={16} height={16} /> Addresses
                    </Link>
                    <div className="my-1 border-t border-brand-100" />
                  </>
                )}
                {showSellerLink && (
                  <a href={APP_URLS.seller} className={accountLinkClass}>
                    <IconStore width={16} height={16} /> Sell on ShopHub
                  </a>
                )}
                {foreignApp && !isBuyer && (
                  <a href={APP_URLS[foreignApp]} className={accountLinkClass}>
                    <IconStore width={16} height={16} /> Go to {appLabel(foreignApp)}
                  </a>
                )}
                <button
                  onClick={() => {
                    dispatch(logout())
                    navigate('/')
                  }}
                  className={`${accountLinkClass} w-full text-left text-red-600 hover:bg-red-50`}
                >
                  <IconLogout width={16} height={16} /> Logout
                </button>
              </div>
            </details>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="px-3 py-2 text-sm font-semibold text-brand-700 hover:text-brand-900">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary px-4 py-2">
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search — always available without opening the menu. */}
      <div className="page-container pb-3 lg:hidden">
        <form onSubmit={onSearch} role="search">
          <div className="flex items-center overflow-hidden rounded-lg border border-brand-300">
            <IconSearch className="ml-3 shrink-0 text-gray-400" width={16} height={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="min-w-0 flex-1 border-0 px-3 py-2.5 text-sm outline-none"
            />
            <button type="submit" className="bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Desktop category bar — driven entirely by live categories. */}
      <div className="hidden border-t border-brand-100 lg:block">
        <div className="page-container flex h-11 items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowCats((v) => !v)}
              aria-expanded={showCats}
              className="flex items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
            >
              <IconMenu width={14} height={14} /> All categories
              <IconChevron className={`transition-transform ${showCats ? 'rotate-180' : ''}`} width={14} height={14} />
            </button>
            {showCats && (
              <div className="absolute left-0 top-full z-50 mt-2 grid w-[34rem] grid-cols-2 gap-1 rounded-xl border border-brand-200 bg-white p-2 shadow-xl">
                {cats.length === 0 ? (
                  <p className="col-span-2 px-3 py-2 text-sm text-gray-400">No categories yet.</p>
                ) : (
                  cats.map((c) => (
                    <Link
                      key={c._id}
                      to={`/categories/${c.slug}`}
                      onClick={() => setShowCats(false)}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-50"
                    >
                      {c.name}
                      <IconChevron className="-rotate-90 opacity-40" width={14} height={14} />
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
          <nav className="ml-1 flex min-w-0 items-center overflow-hidden">
            {primaryLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
            {cats.slice(0, 6).map((c) => (
              <NavLink key={c._id} to={`/categories/${c.slug}`} className={navLinkClass}>
                {c.name}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-4 pl-3">
            <Link to="/stores" className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand-900">
              <IconStore width={14} height={14} /> Verified stores
            </Link>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-brand-100 bg-white lg:hidden">
          <div className="page-container flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-y-auto py-4">
            <nav className="flex flex-col">
              {primaryLinks.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={closeMobile} className={navLinkClass}>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <details className="text-sm" open>
              <summary className="flex cursor-pointer items-center justify-between px-3 py-1 font-semibold text-gray-800">
                Categories
                <IconChevron />
              </summary>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {cats.length === 0 ? (
                  <p className="col-span-2 px-3 py-2 text-sm text-gray-400">No categories yet.</p>
                ) : (
                  cats.map((c) => (
                    <Link
                      key={c._id}
                      to={`/categories/${c.slug}`}
                      onClick={closeMobile}
                      className="rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-brand-50"
                    >
                      {c.name}
                    </Link>
                  ))
                )}
              </div>
            </details>

            <div className="flex flex-col gap-2 border-t border-brand-100 pt-3">
              {user ? (
                <>
                  {isBuyer && (
                    <div className="grid grid-cols-2 gap-1">
                      <Link to="/profile" onClick={closeMobile} className={accountLinkClass}>
                        <IconUser width={16} height={16} /> Profile
                      </Link>
                      <Link to="/orders" onClick={closeMobile} className={accountLinkClass}>
                        <IconPackage width={16} height={16} /> Orders
                      </Link>
                      <Link to="/wishlist" onClick={closeMobile} className={accountLinkClass}>
                        <IconHeart width={16} height={16} /> Wishlist
                      </Link>
                      <Link to="/addresses" onClick={closeMobile} className={accountLinkClass}>
                        <IconMapPin width={16} height={16} /> Addresses
                      </Link>
                    </div>
                  )}
                  {showSellerLink && (
                    <a href={APP_URLS.seller} onClick={closeMobile} className={accountLinkClass}>
                      <IconStore width={16} height={16} /> Sell on ShopHub
                    </a>
                  )}
                  {foreignApp && !isBuyer && (
                    <a href={APP_URLS[foreignApp]} onClick={closeMobile} className={accountLinkClass}>
                      <IconStore width={16} height={16} /> Go to {appLabel(foreignApp)}
                    </a>
                  )}
                  <p className="px-3 text-xs text-gray-500">
                    Signed in as <span className="font-semibold text-gray-800">{user.name}</span>
                  </p>
                  <button
                    onClick={() => {
                      closeMobile()
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
                  <Link to="/login" onClick={closeMobile} className="btn-secondary flex-1">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={closeMobile} className="btn-primary flex-1">
                    Create account
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
