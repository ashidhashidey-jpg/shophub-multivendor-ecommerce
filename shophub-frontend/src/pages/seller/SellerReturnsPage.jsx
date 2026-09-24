import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerReturns, apiSellerHandleReturn } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function SellerReturnsPage() {
  const dispatch = useDispatch()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const load = async () => {
    try {
      setReturns((await apiSellerReturns()).data.data.returns)
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
      await apiSellerHandleReturn(orderId, productId, action)
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Return requests</h1>
        <Link to="/seller/orders" className="whitespace-nowrap text-sm text-brand-600 hover:underline">
          ← All orders
        </Link>
      </div>

      {returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No pending return requests.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {returns.map((o) => (
            <div key={o._id} className="card p-4">
              <Link to={`/seller/orders/${o._id}`} className="font-medium text-gray-900 hover:text-brand-700">
                Order #{o._id.slice(-8).toUpperCase()}
              </Link>
              <p className="mt-0.5 text-xs text-gray-500">
                {o.user?.name} · {formatDate(o.updatedAt)}
              </p>
              <div className="mt-3 space-y-2">
                {o.items.map((item) => (
                  <div key={item._id} className="rounded-md border border-brand-100 bg-brand-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.name} × {item.quantity} = {formatINR(item.subtotal)}
                        </p>
                        <p className="mt-1 rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-800">
                          Reason: {item.returnReason || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        <button
                          disabled={busy === `${o._id}:${item.product}`}
                          onClick={() => decide(o._id, item.product, 'APPROVE')}
                          className="btn-sm border border-green-600 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy === `${o._id}:${item.product}`}
                          onClick={() => decide(o._id, item.product, 'REJECT')}
                          className="btn-secondary btn-sm disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}