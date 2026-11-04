import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerDashboard, apiSellerOrders } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import ErrorState from '../../components/common/ErrorState'
import {
  IconPackage,
  IconBag,
  IconTruck,
  IconRefresh,
  IconTag,
  IconPlus,
  IconArrow,
  IconStore,
} from '../../components/common/icons'

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">{label}</p>
          <p className="stat-value mt-2 truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-charcoal-400">{hint}</p>}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-charcoal-50 text-charcoal-700">
          <Icon width={18} height={18} />
        </span>
      </div>
    </div>
  )
}

const QUICK_LINKS = [
  { to: '/seller/products/create', label: 'Add a product', icon: IconPlus, hint: 'List something new' },
  { to: '/seller/orders', label: 'Manage orders', icon: IconBag, hint: 'Update fulfilment' },
  { to: '/seller/returns', label: 'Return requests', icon: IconRefresh, hint: 'Approve or reject' },
  { to: '/seller/profile', label: 'Store profile', icon: IconStore, hint: 'Edit store details' },
]

export default function SellerDashboardPage() {
  const [dash, setDash] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.allSettled([apiSellerDashboard(), apiSellerOrders({ limit: 5 })])
      .then(([dashRes, ordersRes]) => {
        if (dashRes.status === 'fulfilled') {
          setDash(dashRes.value.data.data.dashboard)
        } else {
          setError(getErrorMessage(dashRes.reason, 'Could not load your dashboard'))
        }
        if (ordersRes.status === 'fulfilled') {
          setRecent(ordersRes.value.data.data.orders.slice(0, 5))
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="page-container py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (error || !dash) {
    return (
      <div className="page-container py-8">
        <h1 className="page-title">Dashboard</h1>
        <div className="mt-6">
          <ErrorState icon={IconStore} message={error || 'Dashboard unavailable'} onRetry={load} />
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Gross sales', value: formatINR(dash.totalSales), icon: IconTag, hint: 'Delivered & returned items' },
    { label: 'Total orders', value: dash.totalOrders, icon: IconBag, hint: `${dash.completedOrders} delivered` },
    { label: 'Awaiting action', value: dash.pendingOrders, icon: IconTruck, hint: 'Items still to fulfil' },
    { label: 'Live products', value: dash.totalProducts, icon: IconPackage, hint: 'In your catalogue' },
  ]

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Overview</p>
          <h1 className="page-title mt-1">Store dashboard</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            A snapshot of your catalogue, orders and returns.
          </p>
        </div>
        <Link to="/seller/products/create" className="btn-primary">
          <IconPlus width={16} height={16} /> Add product
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Earnings</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{formatINR(dash.totalEarnings)}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted-gold text-charcoal-700">
            <IconTag width={16} height={16} />
          </span>
        </div>
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Delivered</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.completedOrders}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
            <IconTruck width={16} height={16} />
          </span>
        </div>
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Pending returns</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingReturns}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <IconRefresh width={16} height={16} />
          </span>
        </div>
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Pending orders</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingOrders}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <IconBag width={16} height={16} />
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-charcoal-100 px-5 py-4">
            <div>
              <h2 className="section-title">Recent orders</h2>
              <p className="mt-0.5 text-xs text-charcoal-400">Your latest store activity</p>
            </div>
            <Link to="/seller/orders" className="link-quiet inline-flex items-center gap-1 text-xs">
              All orders <IconArrow width={13} height={13} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-semibold text-charcoal-900">No orders yet</p>
              <p className="mt-1 text-sm text-charcoal-500">
                Orders will appear here as soon as customers buy your products.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-charcoal-100">
              {recent.map((o) => (
                <li key={o._id}>
                  <Link
                    to={`/seller/orders/${o._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-charcoal-50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-charcoal-50 text-charcoal-500">
                      <IconBag width={16} height={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-900">
                        #{o._id.slice(-8).toUpperCase()}
                      </p>
                      <p className="truncate text-xs text-charcoal-400">
                        {formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <StatusBadge status={o.items[0]?.status} />
                    </div>
                    <span className="shrink-0 text-sm font-bold text-charcoal-900">
                      {formatINR(o.sellerSubtotal)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-charcoal-100 px-5 py-4">
              <h2 className="section-title">Quick actions</h2>
            </div>
            <div className="p-2">
              {QUICK_LINKS.map(({ to, label, icon: Icon, hint }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-charcoal-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-charcoal-100 text-accent-700">
                    <Icon width={15} height={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-charcoal-900">{label}</span>
                    <span className="block text-xs text-charcoal-400">{hint}</span>
                  </span>
                  <IconArrow width={14} height={14} className="text-charcoal-300" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-charcoal-200 bg-charcoal-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-700">Seller tip</p>
            <p className="mt-2 text-sm leading-6 text-charcoal-700">
              Keep stock counts accurate and confirm orders promptly — fast fulfilment improves your store
              visibility.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
