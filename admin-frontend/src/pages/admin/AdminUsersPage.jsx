import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiAdminUsers, apiAdminBlockUser, apiAdminUnblockUser } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconUser, IconSearch, IconChevronLeft, IconChevronRight } from '../../components/common/icons'

export default function AdminUsersPage() {
  const dispatch = useDispatch()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    apiAdminUsers({ search: search || undefined, role: role || undefined, page, limit: 12 })
      .then((res) => {
        setUsers(res.data.data.users)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load users')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [search, role, page])

  const toggleBlock = async (u) => {
    setBusyId(u._id)
    try {
      const res = u.isBlocked ? await apiAdminUnblockUser(u._id) : await apiAdminBlockUser(u._id)
      dispatch(toastSuccess(`User ${res.data.data.user.isBlocked ? 'blocked' : 'unblocked'}`))
      setUsers((list) => list.map((x) => (x._id === u._id ? res.data.data.user : x)))
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
          <h1 className="page-title mt-1">Users</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Every buyer account on the platform. Block accounts that violate policy.
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
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="input pl-9"
          />
        </div>
        <select
          aria-label="Filter by role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
          className="select sm:w-44"
        >
          <option value="">All roles</option>
          <option value="USER">Users</option>
          <option value="SELLER">Sellers</option>
          <option value="ADMIN">Admins</option>
        </select>
        {pagination && (
          <p className="text-xs text-brand-400">
            {pagination.totalItems} result{pagination.totalItems === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-7 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconUser} message={error} onRetry={load} />
        ) : users.length === 0 ? (
          <EmptyState icon={IconUser} title="No users found" message="Try a different search or role filter." />
        ) : (
          <>
            <div className="card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                              {(u.name || 'U').charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold text-brand-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="text-brand-600">{u.email}</td>
                        <td>
                          <span className="status-pill bg-brand-100 text-brand-700">{u.role}</span>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${
                              u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {u.isBlocked ? 'Blocked' : 'Active'}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Link to={`/admin/users/${u._id}`} className="btn-secondary btn-sm">
                              View
                            </Link>
                            {u.role !== 'ADMIN' && (
                              <button
                                disabled={busyId === u._id}
                                onClick={() => toggleBlock(u)}
                                className={`btn-sm border disabled:opacity-50 ${
                                  u.isBlocked
                                    ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                    : 'border-red-200 text-red-600 hover:bg-red-50'
                                }`}
                              >
                                {busyId === u._id ? 'Saving…' : u.isBlocked ? 'Unblock' : 'Block'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {users.map((u) => (
                <div key={u._id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-900">{u.name}</p>
                      <p className="truncate text-xs text-brand-400">{u.email}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="status-pill bg-brand-100 text-brand-700">{u.role}</span>
                        <span
                          className={`status-pill ${
                            u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link to={`/admin/users/${u._id}`} className="btn-secondary btn-sm flex-1">
                      View
                    </Link>
                    {u.role !== 'ADMIN' && (
                      <button
                        disabled={busyId === u._id}
                        onClick={() => toggleBlock(u)}
                        className={`btn-sm border px-4 disabled:opacity-50 ${
                          u.isBlocked
                            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block'}
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
