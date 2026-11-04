import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerOrders } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { formatINR, formatDate, StatusBadge, PaymentBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconBag, IconChevronLeft, IconChevronRight } from '../../components/common/icons'

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED']

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    apiSellerOrders({ page, limit: 10, status: status || undefined })
      .then((res) => {
        setOrders(res.data.data.orders)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load your orders')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page, status])

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Fulfilment</p>
          <h1 className="page-title mt-1">Store orders</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Track and update the items customers have ordered from your store.
          </p>
        </div>
        <Link to="/seller/returns" className="btn-secondary btn-sm">
          Return requests
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter orders by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="select w-auto"
        >
          {STATUSES.map((s) => (
            <option key={s || 'ALL'} value={s}>
              {s ? s.replaceAll('_', ' ') : 'All statuses'}
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
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card space-y-3 p-5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconBag} message={error} onRetry={load} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={IconBag}
            title={status ? 'No orders with this status' : 'No orders yet'}
            message={
              status
                ? 'Try a different status filter to see more orders.'
                : 'Orders will appear here once customers start buying from your store.'
            }
          />
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o._id} to={`/seller/orders/${o._id}`} className="card card-hover block p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-900">#{o._id.slice(-8).toUpperCase()}</p>
                    <p className="mt-0.5 text-xs text-brand-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-brand-900">{formatINR(o.sellerSubtotal)}</p>
                    <p className="text-xs text-charcoal-400">
                      {o.items.length} item{o.items.length === 1 ? '' : 's'}
                      {o.otherSellerItemsCount > 0 && ` · +${o.otherSellerItemsCount} elsewhere`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PaymentBadge status={o.paymentStatus} />
                  {o.items.map((i) => (
                    <span
                      key={i._id}
                      className="inline-flex items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand-700"
                    >
                      <span className="max-w-[180px] truncate">{i.name}</span>
                      <span className="text-brand-400">× {i.quantity}</span>
                      <StatusBadge status={i.status} />
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
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
