import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiAdminUsers, apiAdminBlockUser, apiAdminUnblockUser } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

export default function AdminUsersPage() {
  const dispatch = useDispatch()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiAdminUsers({ search })
      .then((res) => setUsers(res.data.data.users))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Users</h1>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="input mt-3 max-w-sm"
      />
      {loading ? (
        <Loader />
      ) : users.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50/50 text-left">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-brand-100 hover:bg-brand-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="status-pill bg-brand-100 text-brand-700">{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${u.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/users/${u._id}`} className="text-sm font-medium text-brand-600 hover:underline">
                        View
                      </Link>
                      {u.role !== 'ADMIN' && (
                        <button
                          onClick={async () => {
                            try {
                              const res = u.isBlocked
                                ? await apiAdminUnblockUser(u._id)
                                : await apiAdminBlockUser(u._id)
                              dispatch(toastSuccess(`User ${res.data.data.user.isBlocked ? 'blocked' : 'unblocked'}`))
                              setUsers((list) => list.map((x) => (x._id === u._id ? res.data.data.user : x)))
                            } catch (e) {
                              dispatch(toastError(getErrorMessage(e)))
                            }
                          }}
                          className={`ml-3 btn-sm border ${
                            u.isBlocked
                              ? 'border-green-300 text-green-700 hover:bg-green-50'
                              : 'border-red-200 text-red-600 hover:bg-red-50'
                          }`}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}