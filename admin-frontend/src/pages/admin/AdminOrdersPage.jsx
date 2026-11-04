import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiAdminOrders } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconBag, IconChevronLeft, IconChevronRight, IconArrow } from '../../components/common/icons'

const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
]

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    const params = { page, limit: 12 }
    if (status) params.status = status
    if (paymentStatus) params.paymentStatus = paymentStatus
    apiAdminOrders(params)
      .then((res) => {
        setOrders(res.data.data.orders)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load orders')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [status, paymentStatus, page])

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Operations</p>
          <h1 className="page-title mt-1">Orders</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Every order across the marketplace, with fulfilment and payment status.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          aria-label="Filter by order status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="select sm:w-52"
        >
          <option value="">All order statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by payment status"
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value)
            setPage(1)
          }}
          className="select sm:w-52"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        {pagination && (
          <p className="text-xs text-charcoal-400">
            {pagination.totalItems} order{pagination.totalItems === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconBag} message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={IconBag}
            title="No orders found"
            message="Try clearing the status filters to see all orders."
          />
        ) : (
          <>
            <div className="card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Placed</th>
                      <th>Payment</th>
                      <th>Items</th>
                      <th className="text-right">Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const statuses = [...new Set(o.items.map((i) => i.status))]
                      return (
                        <tr key={o._id}>
                          <td className="font-semibold text-brand-900">#{o._id.slice(-8).toUpperCase()}</td>
                          <td className="text-brand-600">
                            <p className="font-medium text-brand-700">{o.user?.name || '—'}</p>
                            <p className="text-xs text-charcoal-400">{o.user?.email || ''}</p>
                          </td>
                          <td className="whitespace-nowrap text-xs text-brand-400">{formatDate(o.createdAt)}</td>
                          <td>
                            <div className="flex flex-col items-start gap-1">
                              <PaymentBadge status={o.paymentStatus} />
                              <span className="text-[11px] text-brand-400">{o.paymentMethod}</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={statuses.length === 1 ? statuses[0] : 'MULTI'} />
                          </td>
                          <td className="text-right font-semibold text-brand-900">{formatINR(o.total)}</td>
                          <td className="text-right">
                            <Link to={`/admin/orders/${o._id}`} className="btn-secondary btn-sm">
                              View <IconArrow width={12} height={12} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {orders.map((o) => {
                const statuses = [...new Set(o.items.map((i) => i.status))]
                return (
                  <Link key={o._id} to={`/admin/orders/${o._id}`} className="card card-hover block p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-900">#{o._id.slice(-8).toUpperCase()}</p>
                        <p className="truncate text-xs text-brand-400">
                          {o.user?.name || '—'} · {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 font-extrabold text-brand-900">{formatINR(o.total)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusBadge status={statuses.length === 1 ? statuses[0] : 'MULTI'} />
                      <PaymentBadge status={o.paymentStatus} />
                      <span className="text-[11px] text-brand-400">{o.paymentMethod}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-charcoal-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary btn-sm disabled:opacity-40"
            >
              <IconChevronLeft width={14} height={14} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn-secondary btn-sm disabled:opacity-40"
            >
              Next <IconChevronRight width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
