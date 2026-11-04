import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { apiLogin } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCredentials } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { APP_URLS, roleToApp } from '../../utils/appNav'
import { IconStore, IconShield, IconPackage, IconArrow } from '../../components/common/icons'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const afterLogin = (role) => {
    if (role === 'SELLER' || role === 'USER') {
      navigate(location.state?.from || '/')
      return
    }
    const app = roleToApp(role)
    if (app && APP_URLS[app]) {
      window.location.assign(APP_URLS[app])
      return
    }
    navigate('/')
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiLogin(form)
      dispatch(setCredentials(res.data.data))
      dispatch(toastSuccess(`Welcome back, ${res.data.data.user.name}!`))
      afterLogin(res.data.data.user.role)
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid credentials'))
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-brand-900 p-8 text-white lg:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent-400">
              <IconStore width={13} height={13} /> Seller portal
            </span>
            <h1 className="mt-6 font-display text-4xl leading-tight">
              Run your store with clarity.
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">
              Manage listings, fulfil orders and keep buyers happy from one focused workspace.
            </p>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            <li className="flex items-center gap-2.5">
              <IconPackage width={16} height={16} className="text-accent-500" /> Catalogue &amp; inventory
            </li>
            <li className="flex items-center gap-2.5">
              <IconShield width={16} height={16} className="text-accent-500" /> Order &amp; return control
            </li>
          </ul>
        </div>

        <div className="p-6 sm:p-8">
          <p className="section-label lg:hidden">Seller portal</p>
          <h2 className="mt-1 font-display text-3xl text-brand-900 lg:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-brand-500">Use the account linked to your approved store.</p>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="login-email" className="label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@store.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
              />
            </div>
            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-brand-400">
            A seller account is granted after an admin approves your application.
          </p>

          <div className="mt-5 space-y-2 border-t border-brand-100 pt-4 text-sm">
            <p className="text-brand-500">
              New to ShopHub?{' '}
              <Link to="/seller/register" className="link-quiet">
                Apply to sell
              </Link>
            </p>
            <a href={APP_URLS.user} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-900">
              Buyers sign in at the storefront <IconArrow width={12} height={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
