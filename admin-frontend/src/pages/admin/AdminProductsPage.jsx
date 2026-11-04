import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminProducts, apiAdminProductAction, apiAdminSellers } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import {
  IconPackage,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconClose,
} from '../../components/common/icons'

export default function AdminProductsPage() {
  const dispatch = useDispatch()
  const [products, setProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [status, setStatus] = useState('')
  const [seller, setSeller] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    apiAdminSellers({ limit: 200 })
      .then((res) => setSellers(res.data.data.sellers || []))
      .catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    setError('')
    setRejecting(null)
    setReason('')
    const params = { page, limit: 12 }
    if (status) params.status = status
    if (seller) params.seller = seller
    if (query) params.search = query
    apiAdminProducts(params)
      .then((res) => {
        setProducts(res.data.data.products)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load products')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [status, seller, query, page])

  const act = async (id, action, label, payload = {}) => {
    setBusyId(id)
    try {
      const res = await apiAdminProductAction(id, action, payload)
      dispatch(toastSuccess(label))
      setProducts((list) => list.map((p) => (p._id === id ? res.data.data.product : p)))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  const doReject = async (id) => {
    await act(id, 'reject', 'Rejected', { reason: reason.trim() || 'Rejected by admin' })
    setRejecting(null)
    setReason('')
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Marketplace</p>
          <h1 className="page-title mt-1">Products</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Review new listings and manage catalogue visibility.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQuery(search.trim())
                setPage(1)
              }
            }}
            placeholder="Search name or description…"
            aria-label="Search products"
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => {
            setQuery(search.trim())
            setPage(1)
          }}
          className="btn-secondary"
        >
          <IconSearch width={15} height={15} /> Search
        </button>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="select"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          aria-label="Filter by seller"
          value={seller}
          onChange={(e) => {
            setSeller(e.target.value)
            setPage(1)
          }}
          className="select"
        >
          <option value="">All sellers</option>
          {sellers.map((s) => (
            <option key={s._id} value={s._id}>
              {s.storeName}
            </option>
          ))}
        </select>
        {pagination && (
          <p className="self-center text-xs text-brand-400">
            {pagination.totalItems} product{pagination.totalItems === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-4">
                <Skeleton className="h-12 w-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconPackage} message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={IconPackage}
            title="No products found"
            message="Try a different search, status or seller filter."
          />
        ) : (
          <div className="space-y-3">
            {products.map((p) => {
              const busy = busyId === p._id
              return (
                <article key={p._id} className="card overflow-hidden">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-brand-100">
                        {p.images?.length ? (
                          <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-brand-300">
                            <IconPackage width={18} height={18} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-brand-900">{p.name}</p>
                        <p className="truncate text-xs text-brand-400">
                          {p.seller?.storeName || '—'} · {p.category?.name || 'Uncategorised'}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-brand-600">
                          {formatINR(p.price)}
                          {p.discount > 0 && <span className="ml-1 font-normal text-brand-400">({p.discount}% off)</span>}
                          <span className="ml-2 font-normal text-brand-400">{p.stock} in stock</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <StatusBadge status={p.status} />
                      {p.status === 'APPROVED' && !p.isActive && (
                        <span className="status-pill bg-red-100 text-red-700">Disabled</span>
                      )}

                      {p.status === 'PENDING' && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => act(p._id, 'approve', 'Approved')}
                            className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <IconCheck width={13} height={13} /> Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => {
                              setRejecting(rejecting === p._id ? null : p._id)
                              setReason('')
                            }}
                            className="btn-sm border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <IconClose width={13} height={13} /> Reject
                          </button>
                        </>
                      )}
                      {p.status === 'APPROVED' && p.isActive && (
                        <button
                          disabled={busy}
                          onClick={() => act(p._id, 'deactivate', 'Deactivated')}
                          className="btn-sm border border-amber-300 px-3 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                      {p.status === 'APPROVED' && !p.isActive && (
                        <button
                          disabled={busy}
                          onClick={() => act(p._id, 'activate', 'Activated')}
                          className="btn-sm border border-emerald-300 px-3 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>

                  {p.rejectionReason && (
                    <p className="border-t border-red-100 bg-red-50/60 px-4 py-2 text-xs text-red-700">
                      Rejection reason: {p.rejectionReason}
                    </p>
                  )}

                  {rejecting === p._id && (
                    <div className="flex flex-col gap-2 border-t border-brand-100 bg-brand-50/60 p-4 sm:flex-row">
                      <input
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (shown to the seller)"
                        aria-label="Rejection reason"
                        className="input flex-1"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => doReject(p._id)}
                          className="btn-sm border border-red-600 bg-red-600 px-3 text-white hover:bg-red-700"
                        >
                          Confirm reject
                        </button>
                        <button
                          onClick={() => {
                            setRejecting(null)
                            setReason('')
                          }}
                          className="btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>

      {!loading && !error && pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-brand-400">
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
