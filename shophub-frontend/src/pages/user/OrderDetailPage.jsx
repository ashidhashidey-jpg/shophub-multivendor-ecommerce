import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { apiMyOrder, apiCancelOrder, apiRequestReturn } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function OrderDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')

  useEffect(() => {
    apiMyOrder(id)
      .then((res) => setOrder(res.data.data.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />
  if (!order) return <p className="page-container py-16 text-center text-gray-500">Order not found.</p>

  const cancelAll = async () => {
    if (!window.confirm('Cancel this order? Any paid amount stays as a credit until the admin issues a refund.')) {
      return
    }
    try {
      await apiCancelOrder(order._id)
      dispatch(toastSuccess('Order cancelled, stock restored'))
      setOrder((await apiMyOrder(order._id)).data.data.order)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const requestReturn = async (productId) => {
    const trimmed = reason.trim()
    if (!trimmed) {
      dispatch(toastError('A return reason is required'))
      return
    }
    if (trimmed.length > 2000) {
      dispatch(toastError('Return reason must be under 2000 characters'))
      return
    }
    try {
      await apiRequestReturn(order._id, productId, trimmed)
      dispatch(toastSuccess('Return requested'))
      setReason('')
      setOrder((await apiMyOrder(order._id)).data.data.order)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const allCancellable = order.items.every((i) => ['PENDING', 'CONFIRMED'].includes(i.status))

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Order #{order._id.slice(-8).toUpperCase()}</h1>
        <Link to="/orders" className="text-sm font-medium text-brand-600 hover:underline">
          ← All orders
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <span>{formatDate(order.createdAt)}</span>
        <span>· {order.paymentMethod}</span>
        <PaymentBadge status={order.paymentStatus} />
        {(order.sellerCount || 1) > 1 && <span>· {order.sellerCount} sellers</span>}
      </div>

      {(order.groups && order.groups.length > 1) && (
        <div className="card mt-4 overflow-hidden">
          <p className="border-b border-brand-100 px-4 py-3 text-sm font-semibold text-gray-900">Per-seller breakdown</p>
          {order.groups.map((g, i) => (
            <div key={String(g.seller) || i} className="flex items-center justify-between px-4 py-2 text-sm">
              <div className="flex flex-wrap gap-1">
                {g.items.map((it) => (
                  <span key={it._id} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-gray-700">
                    {it.name} × {it.quantity}
                  </span>
                ))}
              </div>
              <span className="shrink-0 font-medium">{formatINR(g.total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {order.items.map((item) => (
          <div key={item._id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link to={`/products/${item.product}`} className="font-medium text-gray-900 hover:text-brand-700">
                  {item.name}
                </Link>
                <p className="text-sm text-gray-500">
                  {formatINR(item.price)} × {item.quantity} = {formatINR(item.subtotal)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={item.status} />
                {item.status === 'DELIVERED' && (
                  <>
                    <Link
                      to={`/products/${item.product}`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      Write a review
                    </Link>
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium text-brand-600">Request return</summary>
                    <div className="mt-1 flex gap-2">
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason (required)"
                        maxLength={2000}
                        className="input flex-1 min-w-0"
                      />
                      <button
                        onClick={() => requestReturn(item.product)}
                        className="btn-secondary btn-sm shrink-0"
                      >
                        Submit
                      </button>
                    </div>
                  </details>
                </>
              )}
                {item.status === 'RETURN_REQUESTED' && (
                  <p className="status-pill bg-orange-50 text-orange-700">Awaiting seller decision</p>
                )}
                {item.status === 'RETURNED' && (
                  <p className="status-pill bg-teal-50 text-teal-700">
                    Return accepted — awaiting refund
                  </p>
                )}
                {item.status === 'REFUND_PENDING' && (
                  <p className="status-pill bg-purple-50 text-purple-700">Refund in progress</p>
                )}
                {item.refundId && (
                  <p className="status-pill bg-indigo-50 text-indigo-700">Refunded</p>
                )}
                {item.returnReason && (
                  <p className="max-w-56 rounded-md bg-brand-50 px-2 py-1 text-xs text-gray-600">
                    Reason: {item.returnReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="font-medium text-gray-900">Deliver to</p>
        <p className="text-gray-600">
          {order.address?.name} · {order.address?.addressLine1}, {order.address?.city} {order.address?.postalCode},{' '}
          {order.address?.country}
        </p>
      </div>

      <div className="card mt-4 p-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatINR(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>{formatINR(order.shipping)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </div>

      {allCancellable && (
        <button
          onClick={cancelAll}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Cancel order
        </button>
      )}
    </div>
  )
}