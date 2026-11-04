import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  apiAdminOrder,
  apiAdminUpdateOrderStatus,
  apiAdminRefund,
  apiAdminReturnDecision,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import {
  IconArrowLeft,
  IconBag,
  IconMapPin,
  IconCheck,
  IconRefresh,
  IconPackage,
  IconUser,
} from '../../components/common/icons'

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setError('')
    try {
      setOrder((await apiAdminOrder(id)).data.data.order)
    } catch (e) {
      setOrder(null)
      setError(getErrorMessage(e, 'Order not found'))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />

  if (!order) {
    return (
      <div className="page-container max-w-4xl py-8">
        <button
          onClick={() => navigate('/admin/orders')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
        >
          <IconArrowLeft width={14} height={14} /> Back to orders
        </button>
        <div className="mt-6">
          <ErrorState icon={IconBag} message={error} onRetry={load} />
        </div>
      </div>
    )
  }

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
    <div className="page-container max-w-4xl fade-in py-8">
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 hover:text-charcoal-900"
      >
        <IconArrowLeft width={14} height={14} /> Back to orders
      </button>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Order details</p>
          <h1 className="page-title mt-1">#{order._id.slice(-8).toUpperCase()}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-500">
            <span>{formatDate(order.createdAt)}</span>
            <span>·</span>
            <span>{order.paymentMethod}</span>
            <PaymentBadge status={order.paymentStatus} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Order total</p>
          <p className="text-xl font-extrabold text-brand-900">{formatINR(order.total)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          {order.items.map((item) => {
            const stepIndex = FLOW.indexOf(item.status)
            return (
              <article key={item._id} className="card p-5">
                <div className="flex gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-brand-300">
                        <IconPackage width={20} height={20} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-900">{item.name}</p>
                        <p className="mt-0.5 text-xs text-brand-400">
                          Sold by {item.seller?.storeName || '—'}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-charcoal-500">
                      {formatINR(item.price)} × {item.quantity} ={' '}
                      <span className="font-semibold text-brand-900">{formatINR(item.subtotal)}</span>
                    </p>
                    {FLOW.includes(item.status) && (
                      <div className="mt-3 flex items-center gap-1.5" aria-label="Fulfilment progress">
                        {FLOW.map((step, i) => (
                          <span
                            key={step}
                            className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-brand-600' : 'bg-brand-200'}`}
                            title={step}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {item.returnReason && (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Buyer reason: {item.returnReason}
                  </p>
                )}
                {item.refundId && (
                  <p className="mt-2 rounded-md bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                    Refunded{item.refundId !== 'cod' ? ` (${item.refundId})` : ''}
                  </p>
                )}
                {order.paymentStatus === 'REFUND_FAILED' && (
                  <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                    Refund attempt failed — the item is still refundable.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {FLOW.includes(item.status) && stepIndex < FLOW.length - 1 && (
                    <button
                      disabled={busyId !== null}
                      onClick={() =>
                        run(
                          () => apiAdminUpdateOrderStatus(order._id, item.product, FLOW[stepIndex + 1]),
                          `Marked ${FLOW[stepIndex + 1]}`
                        )
                      }
                      className="btn-primary btn-sm disabled:opacity-50"
                    >
                      <IconCheck width={13} height={13} /> Mark {FLOW[stepIndex + 1]}
                    </button>
                  )}
                  {item.status === 'RETURN_REQUESTED' && (
                    <>
                      <button
                        disabled={busyId !== null}
                        onClick={() =>
                          run(() => apiAdminReturnDecision(order._id, item.product, 'APPROVE'), 'Return approved, stock restored')
                        }
                        className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve return
                      </button>
                      <button
                        disabled={busyId !== null}
                        onClick={() => run(() => apiAdminReturnDecision(order._id, item.product, 'REJECT'), 'Return rejected')}
                        className="btn-secondary btn-sm disabled:opacity-50"
                      >
                        Reject return
                      </button>
                    </>
                  )}
                  {['RETURNED', 'CANCELLED'].includes(item.status) && (
                    <button
                      disabled={busyId !== null || order.paymentStatus === 'REFUND_PENDING'}
                      onClick={() => run(() => apiAdminRefund(order._id, item.product), 'Refunded')}
                      className="btn-sm border border-indigo-600 bg-indigo-600 px-3 text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <IconRefresh width={13} height={13} />
                      {order.paymentStatus === 'REFUND_PENDING' ? 'Refund in progress…' : 'Refund item'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
              <IconUser width={13} height={13} /> Customer
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-900">{order.user?.name || '—'}</p>
            <p className="text-xs text-brand-400">{order.user?.email || ''}</p>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
              <IconMapPin width={13} height={13} /> Delivery address
            </p>
            <p className="mt-2 text-sm font-semibold text-brand-900">{order.address?.name}</p>
            <p className="mt-1 text-sm leading-6 text-brand-500">
              {order.address?.addressLine1}
              {order.address?.addressLine2 ? `, ${order.address.addressLine2}` : ''}
              <br />
              {order.address?.city}, {order.address?.state} {order.address?.postalCode}
              <br />
              {order.address?.country}
            </p>
            {order.address?.phone && <p className="mt-2 text-xs text-brand-400">Phone: {order.address.phone}</p>}
          </div>

          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Payment summary</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-500">Subtotal</dt>
                <dd className="font-semibold text-brand-900">{formatINR(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-500">Shipping</dt>
                <dd className="font-semibold text-brand-900">{formatINR(order.shippingFee || 0)}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-100 pt-2">
                <dt className="font-semibold text-brand-900">Total</dt>
                <dd className="font-extrabold text-brand-900">{formatINR(order.total)}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
