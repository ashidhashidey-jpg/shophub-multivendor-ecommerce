import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Navbar from './Navbar'
import Footer from './Footer'
import Sidebar from './Sidebar'
import Toasts from './common/Toasts'
import { IconMenu, IconArrow } from './common/icons'
import { APP_URLS } from '../utils/appNav'

const TITLES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/sellers': 'Sellers',
  '/admin/products': 'Products',
  '/admin/categories': 'Categories',
  '/admin/orders': 'Orders',
  '/admin/returns': 'Returns',
  '/admin/reviews': 'Reviews',
}

function pageTitle(pathname) {
  if (/^\/admin\/users\/[^/]+$/.test(pathname)) return 'User details'
  if (/^\/admin\/sellers\/[^/]+$/.test(pathname)) return 'Seller details'
  if (/^\/admin\/orders\/[^/]+$/.test(pathname)) return 'Order details'
  return TITLES[pathname] || 'Admin console'
}

export default function MainLayout() {
  const { pathname } = useLocation()
  const user = useSelector((s) => s.auth.user)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
    window.scrollTo({ top: 0 })
  }, [pathname])

  const isPortal = user?.role === 'ADMIN' && pathname.startsWith('/admin')

  if (!isPortal) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <Toasts />
      </div>
    )
  }

  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase()

  return (
    <div className="flex min-h-screen bg-brand-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-brand-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-brand-200 text-brand-700 hover:bg-brand-50 lg:hidden"
          >
            <IconMenu width={18} height={18} />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-400">Admin console</p>
            <h1 className="truncate text-sm font-bold text-brand-900 sm:text-base">{pageTitle(pathname)}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <a
              href={APP_URLS.user}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-md border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 sm:inline-flex"
            >
              View storefront <IconArrow width={13} height={13} />
            </a>
            <span
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-accent-500"
              title={user?.name}
              aria-label={`Signed in as ${user?.name || 'admin'}`}
            >
              {initial}
            </span>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <footer className="border-t border-brand-200 bg-white px-4 py-4 text-center text-xs text-brand-400 sm:px-6">
          ShopHub Admin · marketplace operations and moderation
        </footer>
      </div>

      <Toasts />
    </div>
  )
}
