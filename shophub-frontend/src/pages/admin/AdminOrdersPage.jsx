import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiAdminOrders } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiAdminOrders()
      .then((res) => setOrders(res.data.data.orders))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Orders</h1>
      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No orders yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {orders.map((o) => {
            const statuses = [...new Set(o.items.map((i) => i.status))]
            return (
              <Link
                key={o._id}
                to={`/admin/orders/${o._id}`}
                className="card card-hover block p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">Order #{o._id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">
                      {o.user?.name || '—'} · {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={statuses.length === 1 ? statuses[0] : 'MULTI'} />
                    <span className="font-semibold text-gray-900">{formatINR(o.total)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}