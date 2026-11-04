import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiMyOrder } from '../../api/endpoints'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'
import {
  IconCheck,
  IconPackage,
  IconTruck,
  IconMapPin,
  IconArrow,
} from '../../components/common/icons'

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
    <div className="page-container fade-in max-w-3xl py-12 sm:py-16">
      <div className="rounded-2xl border border-charcoal-200 bg-warm-ivory p-6 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-charcoal-100 text-charcoal-300">
          <IconCheck width={30} height={30} />
        </span>
        <h1 className="mt-5 font-display text-3xl text-charcoal-900 sm:text-4xl">
          {order ? 'Thank you for your order' : 'Order placed successfully'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-charcoal-500">
          {method === 'COD'
            ? 'Your order is confirmed. Please pay in cash when it arrives.'
            : 'Your payment was verified and your order is now being prepared.'}
        </p>

        {order ? (
          <div className="mt-8 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal-400">Order number</p>
                <p className="text-sm font-bold text-charcoal-800">
                  #{String(order._id).slice(-8).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-500">Placed</p>
                <p className="text-sm text-charcoal-500">{formatDate(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <PaymentBadge status={order.paymentStatus} />
                <span className="text-sm font-extrabold text-charcoal-800">{formatINR(order.total)}</span>
              </div>
            </div>

            <div className="mt-5 divide-y divide-brand-100 rounded-xl border border-brand-200">
              {order.items.map((i) => (
                <div key={i._id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-900">
                      {i.name} <span className="font-normal text-brand-500">× {i.quantity}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-brand-500">
                      {formatINR(i.price)} each · {formatINR(i.subtotal)}
                    </p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-200 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-500">
                  <IconMapPin width={14} height={14} className="text-accent-700" /> Deliver to
                </p>
                <p className="mt-2 text-sm font-semibold text-brand-900">{order.address?.name}</p>
                <p className="mt-1 text-sm leading-6 text-brand-500">
                  {order.address?.addressLine1}, {order.address?.city} {order.address?.postalCode},{' '}
                  {order.address?.country}
                </p>
              </div>
              <div className="rounded-xl border border-brand-200 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-brand-500">
                  <IconTruck width={14} height={14} className="text-accent-700" /> Fulfilment
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-500">
                  Payment method: <span className="font-semibold text-brand-900">{order.paymentMethod}</span>
                  <br />
                  Ships across {order.sellerCount || 1} {(order.sellerCount || 1) > 1 ? 'sellers' : 'seller'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-6">
            <p className="text-sm text-brand-500">
              We could not load the order summary right now, but your order is recorded. You can review it
              anytime from your orders page.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/orders" className="btn-primary">
            <IconPackage width={16} height={16} /> View my orders
          </Link>
          <Link to="/products" className="btn-secondary">
            Continue shopping <IconArrow width={16} height={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
