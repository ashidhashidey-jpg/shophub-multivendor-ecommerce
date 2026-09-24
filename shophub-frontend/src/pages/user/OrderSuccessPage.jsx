import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiMyOrder } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function OrderSuccessPage() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const method = params.get('method')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    apiMyOrder(orderId)
      .then((res) => setOrder(res.data.data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) return <Loader />

  return (
    <div className="page-container fade-in max-w-2xl py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        <span className="text-green-600">✓</span>
      </div>
      <h1 className="page-title mt-4">Order placed {order ? '' : 'successfully'}</h1>

      {order ? (
        <div className="card mt-6 p-6 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">Order #{String(order._id).slice(-8).toUpperCase()}</p>
              <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <PaymentBadge status={order.paymentStatus} />
              <span className="font-semibold text-gray-900">{formatINR(order.total)}</span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-brand-100">
            {order.items.map((i) => (
              <div key={i._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {i.name} × {i.quantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatINR(i.price)} each · {formatINR(i.subtotal)}
                  </p>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-gray-600">
            <p className="font-medium text-gray-900">Deliver to</p>
            <p>
              {order.address?.name} · {order.address?.addressLine1}, {order.address?.city} {order.address?.postalCode},
              {order.address?.country}
            </p>
            <p className="mt-1 text-xs">
              Payment method: {order.paymentMethod} · Ships across {order.sellerCount || 1}{' '}
              {(order.sellerCount || 1) > 1 ? 'sellers' : 'seller'}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-gray-600">
          {method === 'COD' ? 'Your order was placed. Pay on delivery.' : 'Your payment was verified. Thank you!'}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/orders" className="btn-primary">
          View my orders
        </Link>
        <Link to="/products" className="btn-secondary">
          Continue shopping
        </Link>
      </div>
    </div>
  )
}