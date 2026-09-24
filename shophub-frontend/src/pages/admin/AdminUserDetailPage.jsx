import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { apiAdminUser, apiAdminBlockUser, apiAdminUnblockUser } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setUser((await apiAdminUser(id)).data.data.user)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />
  if (!user) return <p className="page-container py-16 text-center text-gray-500">User not found.</p>

  const toggleBlock = async () => {
    try {
      const res = user.isBlocked
        ? await apiAdminUnblockUser(user._id)
        : await apiAdminBlockUser(user._id)
      dispatch(toastSuccess(res.data.data.user.isBlocked ? 'User blocked' : 'User unblocked'))
      setUser(res.data.data.user)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in max-w-2xl py-8">
      <Link to="/admin/users" className="text-sm text-brand-600 hover:underline">
        ← All users
      </Link>
      <div className="card mt-3 p-6">
        <h1 className="page-title">{user.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="section-label">Role</dt>
            <dd className="mt-1 font-medium text-gray-900">{user.role}</dd>
          </div>
          <div>
            <dt className="section-label">Status</dt>
            <dd className={`mt-1 font-medium ${user.isBlocked ? 'text-red-600' : 'text-green-600'}`}>
              {user.isBlocked ? 'Blocked' : 'Active'}
            </dd>
          </div>
          <div>
            <dt className="section-label">Phone</dt>
            <dd className="mt-1 text-gray-900">{user.phone || '—'}</dd>
          </div>
          <div>
            <dt className="section-label">Joined</dt>
            <dd className="mt-1 text-gray-900">{new Date(user.createdAt).toLocaleDateString('en-IN')}</dd>
          </div>
        </dl>
        {user.role !== 'ADMIN' && (
          <button
            onClick={toggleBlock}
            className={`mt-5 rounded-md px-4 py-2 text-sm font-semibold text-white ${
              user.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {user.isBlocked ? 'Unblock user' : 'Block user'}
          </button>
        )}
      </div>
    </div>
  )
}