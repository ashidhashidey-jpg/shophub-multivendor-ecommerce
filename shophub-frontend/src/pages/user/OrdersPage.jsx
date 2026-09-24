import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiMyOrders } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

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
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-lg text-gray-600">No orders yet.</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
            Start shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <h1 className="page-title">My orders</h1>
      <div className="mt-5 space-y-3">
        {orders.map((o) => {
          const allStatuses = [...new Set(o.items.map((i) => i.status))]
          return (
            <Link
              key={o._id}
              to={`/orders/${o._id}`}
              className="card card-hover block p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">Order #{o._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PaymentBadge status={o.paymentStatus} />
                  <StatusBadge status={allStatuses.length === 1 ? allStatuses[0] : 'MULTI'} />
                  <span className="font-semibold text-gray-900">{formatINR(o.total)}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {o.items.length} item{o.items.length > 1 ? 's' : ''} · {o.paymentMethod}
                {(o.sellerCount || 1) > 1 && ` · ${o.sellerCount} sellers`}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}