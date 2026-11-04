import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { apiRegister } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCredentials } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { IconHeart, IconPackage, IconShield, IconTag } from '../../components/common/icons'

export default function RegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await apiRegister({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })
      dispatch(setCredentials(res.data.data))
      dispatch(toastSuccess('Account created!'))
      navigate('/profile')
    } catch (err) {
      setError(getErrorMessage(err))
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container py-10 lg:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border charcoal-200 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-warm-ivory p-10 lg:flex">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-charcoal-600 font-display text-xl leading-none text-muted-gold">
                S
              </span>
              <span className="text-lg font-extrabold tracking-tight text-charcoal-900">ShopHub</span>
            </Link>
            <h2 className="mt-12 font-display text-4xl leading-tight">
              One account.
              <br />
              Everything you shop.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-charcoal-500">
              Save your favourite products, keep delivery addresses ready and follow every order across sellers.
            </p>
          </div>
          <ul className="mt-10 space-y-4 text-sm text-charcoal-700">
            {[
              { icon: IconHeart, text: 'Wishlist across all stores' },
              { icon: IconPackage, text: 'Order history and returns' },
              { icon: IconShield, text: 'Secure account and checkout' },
              { icon: IconTag, text: 'Real discounts from real stores' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-muted-gold">
                  <Icon width={14} height={14} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-6 sm:p-10">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link to="/" className="text-base font-extrabold tracking-tight text-charcoal-900">
              Shop<span className="text-charcoal-400">Hub</span>
            </Link>
            <Link to="/login" className="text-sm font-medium text-charcoal-600 hover:underline">
              Sign in
            </Link>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-charcoal-900 lg:mt-0">Create your account</h1>
          <p className="mt-1 text-sm text-charcoal-500">It takes less than a minute.</p>

          {error && (
            <p className="mt-4 rounded-lg border border-charcoal-200 bg-charcoal-100 px-3 py-2 text-sm text-charcoal-900">{error}</p>
          )}

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="reg-name" className="label">
                Full name
              </label>
              <input
                id="reg-name"
                required
                autoComplete="name"
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reg-email" className="label">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reg-phone" className="label">
                Phone number
              </label>
              <input
                id="reg-phone"
                required
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="reg-password" className="label">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="reg-confirm" className="label">
                Confirm password
              </label>
              <input
                id="reg-confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="input"
              />
            </div>
            <button disabled={loading} className="btn-primary mt-1 w-full sm:col-span-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-sm text-charcoal-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-charcoal-900 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-xs leading-5 text-charcoal-400">
            By creating an account you agree to use the marketplace responsibly. Seller accounts require a separate
            application and admin approval.
          </p>
        </div>
      </div>
    </div>
  )
}
