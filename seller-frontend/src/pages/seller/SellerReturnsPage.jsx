import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerReturns, apiSellerHandleReturn } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import {
  IconRefresh,
  IconArrowLeft,
  IconPackage,
  IconCheck,
  IconClose,
} from '../../components/common/icons'

export default function SellerReturnsPage() {
  const dispatch = useDispatch()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = async () => {
    setError('')
    try {
      setReturns((await apiSellerReturns()).data.data.returns)
    } catch (e) {
      setReturns([])
      setError(getErrorMessage(e, 'Could not load return requests'))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const decide = async (orderId, productId, action) => {
    setBusy(`${orderId}:${productId}`)
    try {
      await apiSellerHandleReturn(orderId, productId, action)
      dispatch(toastSuccess(action === 'APPROVE' ? 'Return approved, stock restored' : 'Return rejected'))
      await load()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">After-sales</p>
          <h1 className="page-title mt-1">Return requests</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Review buyer return requests and approve or reject them.
          </p>
        </div>
        <Link to="/seller/orders" className="btn-secondary btn-sm">
          <IconArrowLeft width={14} height={14} /> All orders
        </Link>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="card space-y-3 p-5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconRefresh} message={error} onRetry={load} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={IconRefresh}
            title="No pending return requests"
            message="When a buyer requests a return, it will appear here for your review."
            actionTo="/seller/orders"
            actionLabel="View orders"
          />
        ) : (
          <div className="space-y-4">
            {returns.map((o) => (
              <article key={o._id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-100 bg-brand-50/60 px-5 py-3">
                  <div>
                    <Link to={`/seller/orders/${o._id}`} className="font-bold text-brand-900 hover:underline">
                      Order #{o._id.slice(-8).toUpperCase()}
                    </Link>
                    <p className="mt-0.5 text-xs text-brand-400">
                      {o.user?.name} · {formatDate(o.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status="RETURN_REQUESTED" />
                </div>

                <div className="divide-y divide-brand-100">
                  {o.items.map((item) => {
                    const itemBusy = busy === `${o._id}:${item.product}`
                    return (
                      <div key={item._id} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-brand-100">
                              {item.image ? (
                                <img src={item.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full items-center justify-center text-brand-300">
                                  <IconPackage width={18} height={18} />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-brand-900">{item.name}</p>
                              <p className="text-xs text-brand-500">
                                {formatINR(item.price)} × {item.quantity} = {formatINR(item.subtotal)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={item.status} />
                            <button
                              disabled={itemBusy}
                              onClick={() => decide(o._id, item.product, 'APPROVE')}
                              className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <IconCheck width={13} height={13} /> Approve
                            </button>
                            <button
                              disabled={itemBusy}
                              onClick={() => decide(o._id, item.product, 'REJECT')}
                              className="btn-secondary btn-sm disabled:opacity-50"
                            >
                              <IconClose width={13} height={13} /> Reject
                            </button>
                          </div>
                        </div>
                        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Reason: {item.returnReason || 'No reason provided'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
