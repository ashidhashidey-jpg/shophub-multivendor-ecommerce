import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import {
  apiAdminOrder,
  apiAdminUpdateOrderStatus,
  apiAdminRefund,
  apiAdminReturnDecision,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try {
      setOrder((await apiAdminOrder(id)).data.data.order)
    } catch {
      setOrder(null)
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />
  if (!order) return <p className="page-container py-16 text-center text-gray-500">Order not found.</p>

  const run = async (fn, label) => {
    setBusyId(label)
    try {
      await fn()
      dispatch(toastSuccess(label))
      await load()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <Link to="/admin/orders" className="text-sm text-brand-600 hover:underline">
        ← All orders
      </Link>
      <h1 className="page-title mt-2">Order #{order._id.slice(-8).toUpperCase()}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {order.user?.name} · {order.user?.email} · {formatDate(order.createdAt)} · {order.paymentMethod} ({order.paymentStatus})
      </p>

      <div className="mt-4 space-y-3">
        {order.items.map((item) => (
          <div key={item._id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {formatINR(item.price)} × {item.quantity} = {formatINR(item.subtotal)}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.returnReason && (
              <p className="mt-2 rounded bg-orange-50 px-2 py-1 text-xs text-orange-800">
                Buyer reason: {item.returnReason}
              </p>
            )}
            {item.refundId && (
              <p className="mt-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                Refunded{item.refundId !== 'cod' ? ` (${item.refundId})` : ''}
              </p>
            )}
            {order.paymentStatus === 'REFUND_FAILED' && (
              <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                Refund attempt failed — the item is still refundable.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {FLOW.includes(item.status) && FLOW.indexOf(item.status) < FLOW.length - 1 && (
                <button
                  disabled={busyId !== null}
                  onClick={() =>
                    run(
                      () => apiAdminUpdateOrderStatus(order._id, item.product, FLOW[FLOW.indexOf(item.status) + 1]),
                      `Marked ${FLOW[FLOW.indexOf(item.status) + 1]}`
                    )
                  }
                  className="btn-sm bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  Mark {FLOW[FLOW.indexOf(item.status) + 1]}
                </button>
              )}
              {item.status === 'RETURN_REQUESTED' && (
                <>
                  <button
                    disabled={busyId !== null}
                    onClick={() =>
                      run(() => apiAdminReturnDecision(order._id, item.product, 'APPROVE'), 'Return approved, stock restored')
                    }
                    className="btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve return
                  </button>
                  <button
                    disabled={busyId !== null}
                    onClick={() => run(() => apiAdminReturnDecision(order._id, item.product, 'REJECT'), 'Return rejected')}
                    className="btn-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Reject return
                  </button>
                </>
              )}
              {['RETURNED', 'CANCELLED'].includes(item.status) && (
                <button
                  disabled={busyId !== null || order.paymentStatus === 'REFUND_PENDING'}
                  onClick={() => run(() => apiAdminRefund(order._id, item.product), 'Refunded')}
                  className="btn-sm bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {order.paymentStatus === 'REFUND_PENDING' ? 'Refund in progress…' : 'Refund item'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="font-medium text-gray-900">Delivery address</p>
        <p className="text-gray-600">
          {order.address?.name} · {order.address?.addressLine1}, {order.address?.city} {order.address?.postalCode},{' '}
          {order.address?.country}
        </p>
      </div>

      <div className="card mt-4 p-4 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatINR(order.subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </div>
    </div>
  )
}