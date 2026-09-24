import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerOrder, apiSellerUpdateItemStatus, apiSellerHandleReturn } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export default function SellerOrderDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busyItem, setBusyItem] = useState(null)

  const load = async () => {
    try {
      const res = await apiSellerOrder(id)
      setOrder(res.data.data.order)
    } catch {
      setOrder(null)
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />
  if (!order) return <p className="page-container py-16 text-center text-gray-500">Order not found.</p>

  const advance = async (item) => {
    const idx = FLOW.indexOf(item.status)
    const next = FLOW[idx + 1]
    if (!next) return
    setBusyItem(item._id)
    try {
      await apiSellerUpdateItemStatus(order._id, item.product, next)
      dispatch(toastSuccess(`Item marked ${next}`))
      await load()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyItem(null)
    }
  }

  const handleReturn = async (item, action) => {
    setBusyItem(item._id)
    try {
      await apiSellerHandleReturn(order._id, item.product, action)
      dispatch(toastSuccess(action === 'APPROVE' ? 'Return approved, stock restored' : 'Return rejected'))
      await load()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyItem(null)
    }
  }

  return (
    <div className="page-container max-w-3xl fade-in py-8">
      <h1 className="page-title">Order #{order._id.slice(-8).toUpperCase()}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        {formatDate(order.createdAt)} · {order.paymentMethod}
        <PaymentBadge status={order.paymentStatus} />
      </p>

      <div className="mt-6 space-y-3">
        {order.items.map((item) => (
          <div key={item._id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">
                  {formatINR(item.price)} × {item.quantity} = {formatINR(item.subtotal)}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.returnReason && (
              <p className="mt-2 rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-800">
                Buyer reason: {item.returnReason}
              </p>
            )}
            {item.refundId && (
              <p className="mt-1 rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                Refunded{item.refundId !== 'cod' ? ` (${item.refundId})` : ''}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {FLOW.includes(item.status) && FLOW.indexOf(item.status) < FLOW.length - 1 && (
                <button
                  disabled={busyItem === item._id}
                  onClick={() => advance(item)}
                  className="btn-primary btn-sm disabled:opacity-50"
                >
                  Mark {FLOW[FLOW.indexOf(item.status) + 1]}
                </button>
              )}
              {item.status === 'RETURN_REQUESTED' && (
                <>
                  <button
                    disabled={busyItem === item._id}
                    onClick={() => handleReturn(item, 'APPROVE')}
                    className="btn-sm border border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve return
                  </button>
                  <button
                    disabled={busyItem === item._id}
                    onClick={() => handleReturn(item, 'REJECT')}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              {['RETURNED', 'CANCELLED'].includes(item.status) && (
                <p className="rounded-md bg-brand-50 px-2 py-1 text-xs text-gray-600">
                  Refund is handled by the platform admin
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-4 text-sm">
        <p className="font-medium text-gray-900">Buyer address</p>
        <p className="text-gray-600">
          {order.address?.name} · {order.address?.addressLine1}, {order.address?.city} {order.address?.postalCode},
          {order.address?.country}
        </p>
      </div>
    </div>
  )
}