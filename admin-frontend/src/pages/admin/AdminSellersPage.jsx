import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiAdminSellers, apiAdminSellerAction } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import {
  IconStore,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconClose,
} from '../../components/common/icons'

export default function AdminSellersPage() {
  const dispatch = useDispatch()
  const [sellers, setSellers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    apiAdminSellers({ status: status || undefined, search: search || undefined, page, limit: 12 })
      .then((res) => {
        setSellers(res.data.data.sellers)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load sellers')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [status, search, page])

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
    setBusyId(id)
    try {
      const res = await apiAdminSellerAction(id, action, payload)
      dispatch(toastSuccess(label))
      setSellers((list) => list.map((s) => (s._id === id ? { ...s, ...res.data.data.seller } : s)))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Marketplace</p>
          <h1 className="page-title mt-1">Sellers</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Review applications and manage store access across the marketplace.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search stores…"
            aria-label="Search stores"
            className="input pl-9"
          />
        </div>
        <select
          aria-label="Filter sellers by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="select sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        {pagination && (
          <p className="text-xs text-brand-400">
            {pagination.totalItems} store{pagination.totalItems === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-5">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconStore} message={error} onRetry={load} />
        ) : sellers.length === 0 ? (
          <EmptyState icon={IconStore} title="No sellers found" message="Try a different search or status filter." />
        ) : (
          <>
            <div className="card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Applicant</th>
                      <th>KYC</th>
                      <th>Applied</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((s) => {
                      const busy = busyId === s._id
                      return (
                        <tr key={s._id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-xs font-bold text-white">
                                {(s.storeName || 'S').charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <Link
                                  to={`/admin/sellers/${s._id}`}
                                  className="font-semibold text-brand-900 hover:underline"
                                >
                                  {s.storeName}
                                </Link>
                                <p className="text-[11px] text-brand-400">/{s.slug || s._id.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-brand-600">
                            <p className="font-medium text-brand-700">{s.user?.name || '—'}</p>
                            <p className="text-xs text-brand-400">{s.user?.email || ''}</p>
                          </td>
                          <td>
                            <span
                              className={`status-pill ${
                                s.kycSubmitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.kycSubmitted ? 'Submitted' : 'Missing'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap text-xs text-brand-400">{formatDate(s.createdAt)}</td>
                          <td>
                            <StatusBadge status={s.status} />
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Link to={`/admin/sellers/${s._id}`} className="btn-secondary btn-sm">
                                View
                              </Link>
                              {s.status === 'PENDING' && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() => act(s._id, 'approve', 'Seller approved')}
                                    className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={() => act(s._id, 'reject', 'Seller rejected', true)}
                                    className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {s.status === 'APPROVED' && (
                                <button
                                  disabled={busy}
                                  onClick={() => act(s._id, 'suspend', 'Seller suspended', true)}
                                  className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                              )}
                              {s.status === 'SUSPENDED' && (
                                <button
                                  disabled={busy}
                                  onClick={() => act(s._id, 'reactivate', 'Seller reactivated')}
                                  className="btn-sm bg-brand-600 px-3 text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {sellers.map((s) => (
                <div key={s._id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-bold text-white">
                      {(s.storeName || 'S').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/admin/sellers/${s._id}`}
                          className="truncate font-semibold text-brand-900 hover:underline"
                        >
                          {s.storeName}
                        </Link>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="truncate text-xs text-brand-400">{s.user?.email || '—'}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                        <span className={s.kycSubmitted ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                          KYC {s.kycSubmitted ? 'submitted' : 'missing'}
                        </span>
                        <span className="text-brand-400">· Applied {formatDate(s.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/admin/sellers/${s._id}`} className="btn-secondary btn-sm flex-1">
                      View store
                    </Link>
                    {s.status === 'PENDING' && (
                      <>
                        <button
                          disabled={busyId === s._id}
                          onClick={() => act(s._id, 'approve', 'Seller approved')}
                          className="btn-sm border border-emerald-600 bg-emerald-600 px-3 text-white disabled:opacity-50"
                        >
                          <IconCheck width={13} height={13} /> Approve
                        </button>
                        <button
                          disabled={busyId === s._id}
                          onClick={() => act(s._id, 'reject', 'Seller rejected', true)}
                          className="btn-sm border border-red-200 px-3 text-red-600 disabled:opacity-50"
                        >
                          <IconClose width={13} height={13} /> Reject
                        </button>
                      </>
                    )}
                    {s.status === 'APPROVED' && (
                      <button
                        disabled={busyId === s._id}
                        onClick={() => act(s._id, 'suspend', 'Seller suspended', true)}
                        className="btn-sm border border-red-200 px-3 text-red-600 disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}
                    {s.status === 'SUSPENDED' && (
                      <button
                        disabled={busyId === s._id}
                        onClick={() => act(s._id, 'reactivate', 'Seller reactivated')}
                        className="btn-sm bg-brand-600 px-3 text-white disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
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
