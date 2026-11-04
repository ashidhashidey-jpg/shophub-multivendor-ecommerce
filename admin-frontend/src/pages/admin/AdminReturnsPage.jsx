import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiAdminReturns, apiAdminReturnDecision } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, PaymentBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconRefresh, IconCheck, IconClose, IconStore, IconPackage } from '../../components/common/icons'

export default function AdminReturnsPage() {
  const dispatch = useDispatch()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = async () => {
    setError('')
    try {
      setReturns((await apiAdminReturns()).data.data.returns)
    } catch (e) {
      setReturns([])
      setError(getErrorMessage(e, 'Could not load return requests'))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const decide = async (orderId, productId, action) => {
    setBusy(`${orderId}:${productId}:${action}`)
    try {
      await apiAdminReturnDecision(orderId, productId, action)
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
      <div>
        <p className="section-label">Operations</p>
        <h1 className="page-title mt-1">Return requests</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Decide on buyer returns. Approving restores stock; refunds are processed separately.
        </p>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="card space-y-3 p-5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-8 w-40" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconRefresh} message={error} onRetry={load} />
        ) : returns.length === 0 ? (
          <EmptyState
            icon={IconRefresh}
            title="No pending returns"
            message="Buyer return requests will appear here for review."
            actionTo="/admin/orders"
            actionLabel="View orders"
          />
        ) : (
          <div className="space-y-3">
            {returns.map((r, i) => (
              <article key={`${r.orderId}:${r.product || i}`} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-accent-700">
                      <IconPackage width={17} height={17} />
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/admin/orders/${r.orderId}`}
                        className="font-semibold text-brand-900 hover:underline"
                      >
                        {r.productName} × {r.quantity}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-brand-400">
                        <span>{r.customer?.name || 'Customer'}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <IconStore width={11} height={11} /> {r.seller?.storeName || 'Store'}
                        </span>
                        <span>·</span>
                        <span>{formatDate(r.updatedAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-brand-900">{formatINR(r.amount)}</span>
                    <PaymentBadge status={r.paymentStatus} />
                  </div>
                </div>

                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Reason: {r.returnReason || 'No reason provided'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy === `${r.orderId}:${r.product}:APPROVE`}
                    onClick={() => decide(r.orderId, r.product, 'APPROVE')}
                    className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <IconCheck width={13} height={13} /> Approve &amp; restore stock
                  </button>
                  <button
                    disabled={busy === `${r.orderId}:${r.product}:REJECT`}
                    onClick={() => decide(r.orderId, r.product, 'REJECT')}
                    className="btn-secondary btn-sm disabled:opacity-50"
                  >
                    <IconClose width={13} height={13} /> Reject
                  </button>
                  <Link to={`/admin/orders/${r.orderId}`} className="btn-secondary btn-sm">
                    View order
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
