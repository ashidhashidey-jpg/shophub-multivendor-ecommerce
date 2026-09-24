import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiGetProfile, apiUpdateProfile, apiChangePassword } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setUser } from '../../store/slices/authSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

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

  return (
    <div className="page-container fade-in max-w-2xl py-8">
      <h1 className="page-title">My profile</h1>

      <div className="card mt-5 p-6">
        <h2 className="section-title">Personal details</h2>
        <form onSubmit={submitProfile} className="mt-4 flex flex-col gap-4">
          <label className="section-label mb-1.5">
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </label>
          <label className="section-label mb-1.5">
            Email (read-only)
            <input value={profile.email} disabled className="input cursor-not-allowed opacity-60" />
          </label>
          <label className="section-label mb-1.5">
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
            />
          </label>
          <button disabled={savingProfile} className="btn-primary mt-1 w-fit">
            {savingProfile ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      <div className="card mt-5 p-6">
        <h2 className="section-title">Change password</h2>
        <form onSubmit={submitPassword} className="mt-4 flex flex-col gap-4">
          <label className="section-label mb-1.5">
            Current password
            <input
              type="password"
              required
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
              className="input"
            />
          </label>
          <label className="section-label mb-1.5">
            New password
            <input
              type="password"
              required
              minLength={6}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
              placeholder="At least 6 characters"
              className="input"
            />
          </label>
          <label className="section-label mb-1.5">
            Confirm new password
            <input
              type="password"
              required
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              className="input"
            />
          </label>
          <button disabled={savingPassword} className="btn-secondary mt-1 w-fit">
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}