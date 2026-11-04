import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiGetProfile, apiUpdateProfile, apiChangePassword } from '../../api/endpoints'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { setUser } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'
import { IconUser, IconPackage, IconHeart, IconMapPin, IconShield, IconChevronRight } from '../../components/common/icons'

export default function ProfilePage() {
  const dispatch = useDispatch()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    apiGetProfile()
      .then((res) => {
        const u = res.data.data.user
        setProfile(u)
        setForm({ name: u.name, phone: u.phone || '' })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (!profile) return <p className="page-container py-16 text-center text-gray-500">Could not load profile.</p>

  const submitProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await apiUpdateProfile({ name: form.name, phone: form.phone })
      dispatch(setUser(res.data.data.user))
      dispatch(toastSuccess('Profile updated'))
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setSavingProfile(false)
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) {
      dispatch(toastError('New passwords do not match'))
      return
    }
    setSavingPassword(true)
    try {
      await apiChangePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      dispatch(toastSuccess('Password changed successfully'))
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = (profile.name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('')

  const accountLinks = [
    { to: '/orders', label: 'My orders', icon: IconPackage },
    { to: '/wishlist', label: 'Wishlist', icon: IconHeart },
    { to: '/addresses', label: 'Addresses', icon: IconMapPin },
  ]

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">My account</h1>
      <p className="mt-1 text-sm text-charcoal-500">Manage your personal details and account security.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-charcoal-600 font-display text-2xl text-charcoal-500">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-charcoal-900">{profile.name}</p>
                <p className="truncate text-xs text-charcoal-400">{profile.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-md bg-charcoal-50 px-3 py-2 text-xs text-charcoal-400">
              <IconShield width={14} height={14} className="text-accent-700" />
              {profile.role} account ·{' '}
              {profile.isBlocked ? <span className="font-semibold text-charcoal-600">Blocked</span> : 'Active'}
            </div>
          </div>

          <nav className="card overflow-hidden">
            {accountLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between border-b border-charcoal-200 px-4 py-3 text-sm text-charcoal-500 last:border-b-0 hover:bg-charcoal-100"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Icon width={16} height={16} className="text-accent-700" /> {label}
                </span>
                <IconChevronRight width={14} height={14} className="text-charcoal-300" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-5">
          <div className="card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <IconUser width={17} height={17} className="text-accent-700" />
              <h2 className="section-title">Personal details</h2>
            </div>
            <form onSubmit={submitProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-name" className="label">
                  Full name
                </label>
                <input
                  id="profile-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="label">
                  Email (read-only)
                </label>
                <input
                  id="profile-email"
                  value={profile.email}
                  disabled
                  className="input cursor-not-allowed bg-brand-50 opacity-70"
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className="label">
                  Phone
                </label>
                <input
                  id="profile-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <button disabled={savingProfile} className="btn-primary w-full sm:w-auto">
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-5 sm:p-6">
            <h2 className="section-title">Change password</h2>
            <p className="mt-1 text-xs text-brand-500">Use at least 6 characters for your new password.</p>
            <form onSubmit={submitPassword} className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="pw-current" className="label">
                  Current password
                </label>
                <input
                  id="pw-current"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="pw-new" className="label">
                  New password
                </label>
                <input
                  id="pw-new"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="label">
                  Confirm new password
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className="input"
                />
              </div>
              <div className="sm:col-span-3">
                <button disabled={savingPassword} className="btn-secondary">
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
