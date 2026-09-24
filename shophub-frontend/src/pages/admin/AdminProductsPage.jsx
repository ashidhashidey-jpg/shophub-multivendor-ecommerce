import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminProducts, apiAdminProductAction, apiAdminSellers } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminProductsPage() {
  const dispatch = useDispatch()
  const [products, setProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [status, setStatus] = useState('')
  const [seller, setSeller] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchSellers = () =>
    apiAdminSellers({ limit: 200 }).then((res) => setSellers(res.data.data.sellers || [])).catch(() => {})

  useEffect(() => {
    fetchSellers()
  }, [])

  useEffect(() => {
    setLoading(true)
    setRejecting(null)
    setReason('')
    const params = {}
    if (status) params.status = status
    if (seller) params.seller = seller
    if (query) params.search = query
    apiAdminProducts(params)
      .then((res) => setProducts(res.data.data.products))
      .finally(() => setLoading(false))
  }, [status, seller, query])

  const act = async (id, action, label, payload = {}) => {
    try {
      const res = await apiAdminProductAction(id, action, payload)
      dispatch(toastSuccess(label))
      setProducts((list) => list.map((p) => (p._id === id ? res.data.data.product : p)))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const doReject = async (id) => {
    await act(id, 'reject', 'Rejected', { reason: reason.trim() || 'Rejected by admin' })
    setRejecting(null)
    setReason('')
  }

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Products</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setQuery(search.trim())
          }}
          placeholder="Search name / description"
          className="input max-w-xs"
        />
        <button
          onClick={() => setQuery(search.trim())}
          className="btn-primary"
        >
          Search
        </button>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="select max-w-44"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          className="select max-w-60"
        >
          <option value="">All sellers</option>
          {sellers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.storeName}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="mt-4 space-y-2">
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
              <p className="text-gray-500">No products available yet.</p>
            </div>
          ) : (
            products.map((p) => (
              <div key={p._id} className="card p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">
                      {p.seller?.storeName || '—'} · {p.category?.name || '—'} · {formatINR(p.price)} · {p.stock} in stock
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  {p.status === 'APPROVED' && !p.isActive && (
                    <span className="text-xs text-red-500">Disabled</span>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => act(p._id, 'approve', 'Approved')}
                          className="btn-sm bg-green-600 text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setRejecting(p._id)}
                          className="btn-sm border border-red-200 text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {p.status === 'APPROVED' && p.isActive && (
                      <button
                        onClick={() => act(p._id, 'deactivate', 'Deactivated')}
                        className="btn-sm border border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        Deactivate
                      </button>
                    )}
                    {p.status === 'APPROVED' && !p.isActive && (
                      <button
                        onClick={() => act(p._id, 'activate', 'Activated')}
                        className="btn-sm border border-green-300 text-green-700 hover:bg-green-50"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
                {p.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600">Rejection reason: {p.rejectionReason}</p>
                )}
                {rejecting === p._id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for rejection"
                      className="input flex-1"
                    />
                    <button
                      onClick={() => doReject(p._id)}
                      className="rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Confirm reject
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(null)
                        setReason('')
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}