import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  apiAdminDashboard,
  apiAdminSellers,
  apiAdminProducts,
  apiAdminOrders,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import ErrorState from '../../components/common/ErrorState'
import {
  IconUser,
  IconStore,
  IconPackage,
  IconBag,
  IconTag,
  IconRefresh,
  IconArrow,
  IconStar,
  IconGrid,
} from '../../components/common/icons'

function StatCard({ label, value, hint, icon: Icon, accent = false }) {
  return (
    <div className={`stat-card ${accent ? 'border-charcoal-200 bg-charcoal-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">{label}</p>
          <p className="stat-value mt-2 truncate">{value ?? '—'}</p>
          {hint && <p className="mt-1 text-xs text-charcoal-400">{hint}</p>}
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${accent ? 'bg-charcoal-100 text-charcoal-700' : 'bg-charcoal-50 text-charcoal-700'}`}
        >
          <Icon width={18} height={18} />
        </span>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [dash, setDash] = useState(null)
  const [pendingSellers, setPendingSellers] = useState([])
  const [pendingProducts, setPendingProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.allSettled([
      apiAdminDashboard(),
      apiAdminSellers({ status: 'PENDING', limit: 4 }),
      apiAdminProducts({ status: 'PENDING' }),
      apiAdminOrders({ limit: 5 }),
    ])
      .then(([dashRes, sellersRes, productsRes, ordersRes]) => {
        if (dashRes.status === 'fulfilled') setDash(dashRes.value.data.data.dashboard)
        else setError(getErrorMessage(dashRes.reason, 'Could not load the dashboard'))
        if (sellersRes.status === 'fulfilled') setPendingSellers(sellersRes.value.data.data.sellers.slice(0, 4))
        if (productsRes.status === 'fulfilled') setPendingProducts(productsRes.value.data.data.products.slice(0, 4))
        if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data.data.orders.slice(0, 5))
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
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error || !dash) {
    return (
      <div className="page-container py-8">
        <h1 className="page-title">Dashboard</h1>
        <div className="mt-6">
          <ErrorState icon={IconGrid} message={error || 'Dashboard unavailable'} onRetry={load} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Overview</p>
          <h1 className="page-title mt-1">Marketplace dashboard</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Platform health, moderation queues and recent orders.
          </p>
        </div>
        <Link to="/admin/orders" className="btn-secondary btn-sm">
          View all orders <IconArrow width={13} height={13} />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid revenue"
          value={formatINR(dash.totalRevenue)}
          hint="Orders with cleared payment"
          icon={IconTag}
          accent
        />
        <StatCard label="Orders" value={dash.totalOrders} hint="All time" icon={IconBag} />
        <StatCard label="Sellers" value={dash.totalSellers} hint="Registered stores" icon={IconStore} />
        <StatCard label="Users" value={dash.totalUsers} hint="All accounts" icon={IconUser} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/admin/sellers" className="card card-hover flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Pending sellers</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingSellerApprovals}</p>
          </div>
          <StatusBadge status="PENDING" />
        </Link>
        <Link to="/admin/products" className="card card-hover flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Pending products</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingProductApprovals}</p>
          </div>
          <StatusBadge status="PENDING" />
        </Link>
        <Link to="/admin/returns" className="card card-hover flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Open returns</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingReturns}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
            <IconRefresh width={16} height={16} />
          </span>
        </Link>
        <div className="card flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-charcoal-400">Refunded orders</p>
            <p className="mt-1 text-lg font-extrabold text-charcoal-900">{dash.pendingRefunds}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
            <IconStar width={16} height={16} />
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
            <div>
              <h2 className="section-title">Seller applications</h2>
              <p className="mt-0.5 text-xs text-charcoal-400">Awaiting review</p>
            </div>
            <Link to="/admin/sellers" className="link-quiet text-xs">
              Manage
            </Link>
          </div>
          {pendingSellers.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-charcoal-500">No pending applications.</div>
          ) : (
            <ul className="divide-y divide-charcoal-100">
              {pendingSellers.map((s) => (
                <li key={s._id}>
                  <Link
                    to={`/admin/sellers/${s._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-900 text-xs font-bold text-white">
                      {(s.storeName || 'S').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-900">{s.storeName}</p>
                      <p className="truncate text-xs text-charcoal-400">
                        {s.user?.name || s.user?.email || 'Applicant'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[11px] font-semibold ${
                        s.kycSubmitted ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {s.kycSubmitted ? 'KYC ready' : 'KYC missing'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
            <div>
              <h2 className="section-title">Product approvals</h2>
              <p className="mt-0.5 text-xs text-charcoal-400">Awaiting review</p>
            </div>
            <Link to="/admin/products" className="link-quiet text-xs">
              Manage
            </Link>
          </div>
          {pendingProducts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-charcoal-500">No products awaiting review.</div>
          ) : (
            <ul className="divide-y divide-charcoal-100">
              {pendingProducts.map((p) => (
                <li key={p._id}>
                  <Link
                    to="/admin/products"
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50"
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-brand-100">
                      {p.images?.length ? (
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-brand-300">
                          <IconPackage width={16} height={16} />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-900">{p.name}</p>
                      <p className="truncate text-xs text-charcoal-400">
                        {p.seller?.storeName || 'Store'} · {formatINR(p.price)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-5 py-4">
          <div>
            <h2 className="section-title">Recent orders</h2>
            <p className="mt-0.5 text-xs text-charcoal-400">Latest marketplace activity</p>
          </div>
          <Link to="/admin/orders" className="link-quiet text-xs">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-charcoal-500">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const statuses = [...new Set(o.items.map((i) => i.status))]
                  return (
                    <tr key={o._id}>
                      <td>
                        <Link to={`/admin/orders/${o._id}`} className="font-semibold text-charcoal-900 hover:underline">
                          #{o._id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td className="text-brand-600">{o.user?.name || '—'}</td>
                      <td className="whitespace-nowrap text-charcoal-400">{formatDate(o.createdAt)}</td>
                      <td>
                        <StatusBadge status={statuses.length === 1 ? statuses[0] : 'MULTI'} />
                      </td>
                      <td className="text-right font-semibold text-charcoal-900">{formatINR(o.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
