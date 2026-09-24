import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerOrders } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiSellerOrders()
      .then((res) => setOrders(res.data.data.orders))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Store orders</h1>
        <Link to="/seller/returns" className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">
          Return requests →
        </Link>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No orders for your store yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o._id}
              to={`/seller/orders/${o._id}`}
              className="card card-hover block p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">Order #{o._id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900">{formatINR(o.sellerSubtotal)}</span>
                  <p className="text-xs text-gray-500">
                    {o.items.length} item(s)
                    {o.otherSellerItemsCount > 0 && ` · +${o.otherSellerItemsCount} from other stores`}
                  </p>
                  <PaymentBadge status={o.paymentStatus} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {o.items.map((i) => (
                  <span key={i._id} className="flex items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-2 py-1 text-xs">
                    {i.name} × {i.quantity}
                    <StatusBadge status={i.status} />
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}