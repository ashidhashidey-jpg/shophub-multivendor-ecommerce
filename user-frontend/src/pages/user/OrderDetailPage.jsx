import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { apiMyOrder, apiCancelOrder, apiRequestReturn } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'
import { IconArrowLeft, IconMapPin, IconPackage, IconChevronRight } from '../../components/common/icons'

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
    <div className="page-container fade-in py-8">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 hover:text-charcoal-900">
        <IconArrowLeft width={14} height={14} /> All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Placed {formatDate(order.createdAt)} · {order.paymentMethod}
            {(order.sellerCount || 1) > 1 && ` · ${order.sellerCount} sellers`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PaymentBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-4">
          {(order.groups && order.groups.length > 1) && (
            <div className="card overflow-hidden">
              <p className="border-b border-charcoal-200 bg-charcoal-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-charcoal-400">
                Per-seller breakdown
              </p>
              {order.groups.map((g, i) => (
                <div key={String(g.seller) || i} className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal-200 px-4 py-3 text-sm first:border-t-0">
                  <div className="flex flex-wrap gap-1">
                    {g.items.map((it) => (
                      <span key={it._id} className="rounded bg-charcoal-50 px-2 py-0.5 text-xs text-charcoal-400">
                        {it.name} × {it.quantity}
                      </span>
                    ))}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-charcoal-700">{formatINR(g.total)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card overflow-hidden">
            <p className="flex items-center gap-2 border-b border-brand-100 bg-brand-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-brand-500">
              <IconPackage width={14} height={14} /> Items in this order
            </p>
            <div className="divide-y divide-brand-100">
              {order.items.map((item) => (
                <div key={item._id} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/products/${item.product}`}
                        className="text-sm font-semibold text-brand-900 hover:text-brand-600"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-charcoal-400">
                        {formatINR(item.price)} × {item.quantity} = {formatINR(item.subtotal)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  {item.returnReason && (
                    <p className="mt-2 rounded-md bg-charcoal-50 px-2 py-1 text-xs text-charcoal-400">
                      Reason: {item.returnReason}
                    </p>
                  )}

                  {item.status === 'DELIVERED' && (
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <Link
                        to={`/products/${item.product}`}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        Write a review
                      </Link>
                      <details className="text-xs">
                        <summary className="cursor-pointer font-semibold text-brand-700">Request a return</summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (required)"
                            maxLength={2000}
                            className="input min-w-0 flex-1 py-1.5 text-xs"
                          />
                          <button onClick={() => requestReturn(item.product)} className="btn-secondary btn-sm shrink-0">
                            Submit
                          </button>
                        </div>
                      </details>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.status === 'RETURN_REQUESTED' && (
                      <p className="status-pill bg-orange-50 text-orange-700">Awaiting seller decision</p>
                    )}
                    {item.status === 'RETURNED' && (
                      <p className="status-pill bg-teal-50 text-teal-700">Return accepted — awaiting refund</p>
                    )}
                    {item.status === 'REFUND_PENDING' && (
                      <p className="status-pill bg-purple-50 text-purple-700">Refund in progress</p>
                    )}
                    {item.refundId && <p className="status-pill bg-indigo-50 text-indigo-700">Refunded</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {allCancellable && (
            <button
              onClick={cancelAll}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Cancel order
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-500">
              <IconMapPin width={14} height={14} /> Delivery address
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-900">{order.address?.name}</p>
            <p className="mt-1 text-sm leading-6 text-brand-500">
              {order.address?.addressLine1}
              {order.address?.addressLine2 ? `, ${order.address.addressLine2}` : ''}, {order.address?.city}{' '}
              {order.address?.postalCode}, {order.address?.country}
            </p>
          </div>

          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-500">Payment summary</p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{formatINR(order.shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-brand-200 pt-3 font-bold text-brand-900">
                <span>Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          <Link
            to="/products"
            className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900 hover:border-brand-300"
          >
            Continue shopping
            <IconChevronRight width={15} height={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}
