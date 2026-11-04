import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerOrder, apiSellerUpdateItemStatus, apiSellerHandleReturn } from '../../api/endpoints'
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
} from '../../components/common/icons'

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export default function SellerOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyItem, setBusyItem] = useState(null)

  const load = async () => {
    setError('')
    try {
      const res = await apiSellerOrder(id)
      setOrder(res.data.data.order)
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
      <div className="page-container py-8">
        <button
          onClick={() => navigate('/seller/orders')}
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
    <div className="page-container max-w-4xl fade-in py-8">
      <button
        onClick={() => navigate('/seller/orders')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
      >
        <IconArrowLeft width={14} height={14} /> Back to orders
      </button>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Order details</p>
          <h1 className="page-title mt-1">#{order._id.slice(-8).toUpperCase()}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-500">
            {formatDate(order.createdAt)} · {order.paymentMethod}
            <PaymentBadge status={order.paymentStatus} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Your subtotal</p>
          <p className="text-xl font-extrabold text-brand-900">{formatINR(order.sellerSubtotal)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-4">
          {order.items.map((item) => {
            const stepIndex = FLOW.indexOf(item.status)
            const busy = busyItem === item._id
            return (
              <article key={item._id} className="card p-5">
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-100">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-brand-300">
                        <IconPackage width={22} height={22} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-brand-900">{item.name}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-brand-500">
                      {formatINR(item.price)} × {item.quantity} ={' '}
                      <span className="font-semibold text-brand-900">{formatINR(item.subtotal)}</span>
                    </p>

                    {FLOW.includes(item.status) && (
                      <div className="mt-3 flex items-center gap-1.5" aria-label="Fulfilment progress">
                        {FLOW.map((step, i) => (
                          <span
                            key={step}
                            className={`h-1.5 flex-1 rounded-full ${
                              i <= stepIndex ? 'bg-brand-600' : 'bg-brand-200'
                            }`}
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {FLOW.includes(item.status) && stepIndex < FLOW.length - 1 && (
                    <button
                      disabled={busy}
                      onClick={() => advance(item)}
                      className="btn-primary btn-sm disabled:opacity-50"
                    >
                      <IconCheck width={14} height={14} /> Mark {FLOW[stepIndex + 1]}
                    </button>
                  )}
                  {item.status === 'RETURN_REQUESTED' && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => handleReturn(item, 'APPROVE')}
                        className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approve return
                      </button>
                      <button disabled={busy} onClick={() => handleReturn(item, 'REJECT')} className="btn-secondary btn-sm">
                        Reject
                      </button>
                    </>
                  )}
                  {['RETURNED', 'CANCELLED'].includes(item.status) && (
                    <p className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-500">
                      <IconRefresh width={13} height={13} /> Refund is handled by the platform admin
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
              <IconMapPin width={14} height={14} className="text-accent-700" /> Buyer address
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
            {order.address?.phone && (
              <p className="mt-2 text-xs text-brand-400">Phone: {order.address.phone}</p>
            )}
          </div>

          <div className="rounded-xl border border-brand-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Order summary</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-500">Items</dt>
                <dd className="font-semibold text-brand-900">{order.items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-500">Payment</dt>
                <dd className="font-semibold text-brand-900">{order.paymentMethod}</dd>
              </div>
              <div className="flex justify-between border-t border-brand-100 pt-2">
                <dt className="font-semibold text-brand-900">Store subtotal</dt>
                <dd className="font-extrabold text-brand-900">{formatINR(order.sellerSubtotal)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}
