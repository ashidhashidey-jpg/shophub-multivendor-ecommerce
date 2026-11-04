import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { apiAdminUser, apiAdminBlockUser, apiAdminUnblockUser } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate } from '../../utils/format'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { IconArrowLeft, IconUser, IconShield, IconBag } from '../../components/common/icons'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError('')
    try {
      setUser((await apiAdminUser(id)).data.data.user)
    } catch (e) {
      setUser(null)
      setError(getErrorMessage(e, 'User not found'))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />

  if (!user) {
    return (
      <div className="page-container max-w-3xl py-8">
        <button
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
        >
          <IconArrowLeft width={14} height={14} /> Back to users
        </button>
        <div className="mt-6">
          <ErrorState icon={IconUser} message={error} onRetry={load} />
        </div>
      </div>
    )
  }

  const toggleBlock = async () => {
    setBusy(true)
    try {
      const res = user.isBlocked ? await apiAdminUnblockUser(user._id) : await apiAdminBlockUser(user._id)
      dispatch(toastSuccess(res.data.data.user.isBlocked ? 'User blocked' : 'User unblocked'))
      setUser(res.data.data.user)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusy(false)
    }
  }

  const initials = (user.name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('')

  return (
    <div className="page-container max-w-3xl fade-in py-8">
      <button
        onClick={() => navigate('/admin/users')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
      >
        <IconArrowLeft width={14} height={14} /> Back to users
      </button>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-900 font-display text-2xl text-accent-500">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="page-title">{user.name}</h1>
            <p className="mt-0.5 break-all text-sm text-brand-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="status-pill bg-brand-100 text-brand-700">{user.role}</span>
              <span
                className={`status-pill ${
                  user.isBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {user.isBlocked ? 'Blocked' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {user.role !== 'ADMIN' && (
          <button
            onClick={toggleBlock}
            disabled={busy}
            className={`btn-sm border px-4 py-2 disabled:opacity-50 ${
              user.isBlocked
                ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            {busy ? 'Saving…' : user.isBlocked ? 'Unblock user' : 'Block user'}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
            <IconUser width={13} height={13} /> Account
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-900">{user.role}</p>
          <p className="mt-1 text-xs text-brand-400">Joined {formatDate(user.createdAt)}</p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
            <IconShield width={13} height={13} /> Contact
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-brand-900">{user.phone || 'No phone on file'}</p>
          <p className="mt-1 text-xs text-brand-400">Primary contact</p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
            <IconBag width={13} height={13} /> Activity
          </p>
          <p className="mt-2 text-sm font-semibold text-brand-900">
            {user.isBlocked ? 'Restricted' : 'Normal access'}
          </p>
          <p className="mt-1 text-xs text-brand-400">
            {user.isBlocked ? 'Cannot sign in or order' : 'Can browse and purchase'}
          </p>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <h2 className="section-title">Account details</h2>
        <dl className="mt-4 divide-y divide-brand-100 text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-brand-500">User ID</dt>
            <dd className="break-all font-mono text-xs text-brand-700">{user._id}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-brand-500">Email</dt>
            <dd className="break-all font-semibold text-brand-900">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-brand-500">Phone</dt>
            <dd className="font-semibold text-brand-900">{user.phone || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-brand-500">Joined</dt>
            <dd className="text-brand-700">{formatDate(user.createdAt)}</dd>
          </div>
          {user.blockedAt && (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-brand-500">Blocked on</dt>
              <dd className="text-red-600">{formatDate(user.blockedAt)}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="mt-4 text-xs text-brand-400">
        Looking for seller records? Visit{' '}
        <Link to="/admin/sellers" className="link-quiet">
          Sellers
        </Link>
        .
      </p>
    </div>
  )
}
