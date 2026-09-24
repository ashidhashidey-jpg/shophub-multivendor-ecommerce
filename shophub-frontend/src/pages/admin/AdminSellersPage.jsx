import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiAdminSellers, apiAdminSellerAction } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminSellersPage() {
  const dispatch = useDispatch()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = () => apiAdminSellers().then((res) => setSellers(res.data.data.sellers))

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const act = async (id, action, label, needsReason = false) => {
    let payload = {}
    if (needsReason) {
      const reason = window.prompt('Reason (shown to the seller):')
      if (reason === null) return
      if (!reason.trim()) {
        dispatch(toastError('A reason is required'))
        return
      }
      payload = { reason: reason.trim() }
    }
    try {
      const res = await apiAdminSellerAction(id, action, payload)
      dispatch(toastSuccess(label))
      setSellers((list) => list.map((s) => (s._id === id ? res.data.data.seller : s)))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Sellers</h1>
      <div className="mt-6 space-y-3">
        {sellers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
            <p className="text-gray-500">No sellers.</p>
          </div>
        ) : (
          sellers.map((s) => (
            <div key={s._id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{s.storeName}</p>
                  <p className="text-xs text-gray-500">
                    {s.user?.name ? `${s.user.name} · ` : ''}
                    {s.user?.email || ''} · applied {formatDate(s.createdAt)}
                  </p>
                  <p className="mt-1 text-xs">
                    <span className={s.kycSubmitted ? 'text-green-600' : 'text-red-600'}>
                      KYC {s.kycSubmitted ? '✓ submitted' : 'not submitted'}
                    </span>
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/admin/sellers/${s._id}`} className="text-sm text-brand-600 hover:underline">
                  View
                </Link>
                {s.status === 'PENDING' && (
                  <>
                    <button onClick={() => act(s._id, 'approve', 'Seller approved')} className="btn-sm bg-green-600 text-white hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => act(s._id, 'reject', 'Seller rejected', true)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  </>
                )}
                {s.status === 'APPROVED' && (
                  <button onClick={() => act(s._id, 'suspend', 'Seller suspended', true)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50">
                    Suspend
                  </button>
                )}
                {s.status === 'SUSPENDED' && (
                  <button onClick={() => act(s._id, 'reactivate', 'Seller reactivated')} className="btn-sm bg-brand-600 text-white hover:bg-brand-700">
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}