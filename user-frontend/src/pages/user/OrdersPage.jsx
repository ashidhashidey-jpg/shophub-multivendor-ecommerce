import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiMyOrders } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import { IconPackage, IconChevronRight } from '../../components/common/icons'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiMyOrders()
      .then((res) => setOrders(res.data.data.orders))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  if (orders.length === 0) {
    return (
      <div className="page-container py-16">
        <EmptyState
          icon={IconPackage}
          title="No orders yet"
          message="When you place an order, you will be able to follow it here."
          actionTo="/products"
          actionLabel="Start shopping"
        />
      </div>
    )
  }

  return (
    <div className="page-container fade-in py-8">
      <nav className="text-xs text-brand-400">
        <Link to="/" className="hover:text-brand-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-brand-600">My orders</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">My orders</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {orders.length} order{orders.length === 1 ? '' : 's'} across the marketplace
          </p>
        </div>
        <Link to="/products" className="link-quiet text-sm">
          Continue shopping →
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {orders.map((o) => {
          const allStatuses = [...new Set(o.items.map((i) => i.status))]
          return (
            <Link key={o._id} to={`/orders/${o._id}`} className="card card-hover block overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal-200 bg-charcoal-50 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-bold text-charcoal-800">Order #{o._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-charcoal-400">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentBadge status={o.paymentStatus} />
                  <StatusBadge status={allStatuses.length === 1 ? allStatuses[0] : 'MULTI'} />
                  <span className="text-sm font-bold text-brand-900">{formatINR(o.total)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium text-charcoal-700">
                    {o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                  </p>
                  <p className="mt-0.5 text-xs text-charcoal-400">
                    {o.items.length} item{o.items.length > 1 ? 's' : ''} · {o.paymentMethod}
                    {(o.sellerCount || 1) > 1 && ` · ${o.sellerCount} sellers`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal-600">
                  View details <IconChevronRight width={13} height={13} className="text-charcoal-300" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
