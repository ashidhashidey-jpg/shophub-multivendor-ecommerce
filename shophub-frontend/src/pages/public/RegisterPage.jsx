import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { apiRegister } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCredentials } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'

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
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <h1 className="page-title">Create account</h1>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="reg-name" className="section-label mb-1.5">Full name</label>
            <input
              id="reg-name"
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="section-label mb-1.5">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="reg-phone" className="section-label mb-1.5">Phone</label>
            <input
              id="reg-phone"
              required
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="section-label mb-1.5">Password (min 8 chars)</label>
            <input
              id="reg-password"
              type="password"
              required
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="reg-confirm" className="section-label mb-1.5">Confirm password</label>
            <input
              id="reg-confirm"
              type="password"
              required
              placeholder="Confirm password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="input"
            />
          </div>
          <button disabled={loading} className="btn-primary mt-1 w-full">
            {loading ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p className="mt-5 text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}