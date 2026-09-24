import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiAdminReturns, apiAdminReturnDecision } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, PaymentBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminReturnsPage() {
  const dispatch = useDispatch()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = async () => {
    try {
      setReturns((await apiAdminReturns()).data.data.returns)
    } catch {
      setReturns([])
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const decide = async (orderId, productId, action) => {
    setBusy(`${orderId}:${productId}`)
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

  if (loading) return <Loader />

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Return requests</h1>

      {returns.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No pending return requests.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {returns.map((r, i) => (
            <div key={`${r.orderId}:${i}`} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link to={`/admin/orders/${r.orderId}`} className="font-medium text-gray-900 hover:text-brand-700">
                    {r.productName} × {r.quantity}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {r.customer?.name} &lt;{r.customer?.email}&gt; · {r.seller?.storeName || 'Store'} ·{' '}
                    {formatDate(r.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{formatINR(r.amount)}</span>
                  <PaymentBadge status={r.paymentStatus} />
                </div>
              </div>
              <p className="mt-2 rounded bg-orange-50 px-2 py-1 text-xs text-orange-800">
                Reason: {r.returnReason || '—'}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === `${r.orderId}:${r.product}:APPROVE`}
                  onClick={() => decide(r.orderId, r.product, 'APPROVE')}
                  className="btn-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve & restore stock
                </button>
                <button
                  disabled={busy === `${r.orderId}:${r.product}:REJECT`}
                  onClick={() => decide(r.orderId, r.product, 'REJECT')}
                  className="btn-sm border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}