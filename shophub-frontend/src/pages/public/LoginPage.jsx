import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiLogin } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCredentials } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const roleHome = (role) => ({ ADMIN: '/admin/dashboard', SELLER: '/seller/dashboard', USER: '/profile' })[role] || '/'

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiLogin(form)
      dispatch(setCredentials(res.data.data))
      dispatch(toastSuccess(`Welcome back, ${res.data.data.user.name}!`))
      navigate(location.state?.from || roleHome(res.data.data.user.role))
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid credentials'))
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <h1 className="page-title">Sign in</h1>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="section-label mb-1.5">Email</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="section-label mb-1.5">Password</label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </div>
          <button disabled={loading} className="btn-primary mt-1 w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-sm text-gray-500">
          New here?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}