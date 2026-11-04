import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import {
  apiAddresses,
  apiCreateAddress,
  apiUpdateAddress,
  apiDeleteAddress,
  apiSetDefaultAddress,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconMapPin, IconPlus } from '../../components/common/icons'

const emptyForm = {
  name: 'Home',
  phone: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
}

function AddressSkeleton() {
  return (
    <div className="card space-y-3 p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
      <Skeleton className="h-8 w-24" />
    </div>
  )
}

export default function AddressesPage() {
  const dispatch = useDispatch()
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refresh = async () => {
    const res = await apiAddresses()
    setAddresses(res.data.data.addresses)
  }

  const load = () => {
    setLoading(true)
    setError('')
    refresh()
      .catch((e) => setError(getErrorMessage(e, 'Could not load your addresses')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await apiUpdateAddress(editing, form)
        dispatch(toastSuccess('Address updated'))
      } else {
        await apiCreateAddress(form)
        dispatch(toastSuccess('Address added'))
      }
      setForm(emptyForm)
      setEditing(null)
      await refresh()
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    setBusyId(id)
    try {
      await apiDeleteAddress(id)
      await refresh()
      dispatch(toastSuccess('Address deleted'))
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setBusyId(null)
    }
  }

  const setDefault = async (id) => {
    setBusyId(id)
    try {
      await apiSetDefaultAddress(id)
      await refresh()
      dispatch(toastSuccess('Default address updated'))
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setBusyId(null)
    }
  }

  const startEdit = (a) => {
    setEditing(a._id)
    setForm({
      name: a.name || 'Home',
      phone: a.phone || '',
      addressLine1: a.addressLine1 || '',
      city: a.city || '',
      state: a.state || '',
      postalCode: a.postalCode || '',
      country: a.country || 'India',
      isDefault: Boolean(a.isDefault),
    })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(emptyForm)
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Saved addresses</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Manage where your orders are delivered. Set one as the default for faster checkout.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <section aria-label="Saved addresses">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
                <AddressSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <ErrorState icon={IconMapPin} message={error} onRetry={load} />
          ) : addresses.length === 0 ? (
            <EmptyState
              icon={IconMapPin}
              title="No saved addresses yet"
              message="Add your first delivery address using the form to check out faster next time."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((a) => (
                <article
                  key={a._id}
                  className={`card flex flex-col p-5 ${a.isDefault ? 'border-brand-600 ring-1 ring-brand-600/10' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-accent-700">
                        <IconMapPin width={15} height={15} />
                      </span>
                      <div>
                        <p className="font-bold text-brand-900">{a.name}</p>
                        <p className="text-xs text-brand-500">{a.phone}</p>
                      </div>
                    </div>
                    {a.isDefault && (
                      <span className="status-pill bg-accent-100 text-accent-700">Default</span>
                    )}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-brand-500">
                    {a.addressLine1}
                    {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                    <br />
                    {a.city}, {a.state} {a.postalCode}
                    <br />
                    {a.country}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
                    <button onClick={() => startEdit(a)} className="link-quiet">
                      Edit
                    </button>
                    {!a.isDefault && (
                      <button
                        onClick={() => setDefault(a._id)}
                        disabled={busyId === a._id}
                        className="font-medium text-brand-500 hover:text-brand-900 disabled:opacity-50"
                      >
                        {busyId === a._id ? 'Saving…' : 'Set as default'}
                      </button>
                    )}
                    <button
                      onClick={() => remove(a._id)}
                      disabled={busyId === a._id}
                      className="ml-auto font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {busyId === a._id ? 'Removing…' : 'Delete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="card p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <IconPlus width={16} height={16} className="text-accent-700" />
            <h2 className="section-title">{editing ? 'Edit address' : 'Add a new address'}</h2>
          </div>
          <form onSubmit={submit} className="mt-4 grid gap-4">
            <div>
              <label htmlFor="addr-name" className="label">
                Address label
              </label>
              <input
                id="addr-name"
                required
                placeholder="Home, Office…"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="addr-phone" className="label">
                Phone number
              </label>
              <input
                id="addr-phone"
                required
                type="tel"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="addr-line1" className="label">
                Address line 1
              </label>
              <input
                id="addr-line1"
                required
                autoComplete="address-line1"
                placeholder="House number, street"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="addr-city" className="label">
                  City
                </label>
                <input
                  id="addr-city"
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="addr-state" className="label">
                  State
                </label>
                <input
                  id="addr-state"
                  required
                  autoComplete="address-level1"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="addr-postal" className="label">
                  Postal code
                </label>
                <input
                  id="addr-postal"
                  required
                  autoComplete="postal-code"
                  inputMode="numeric"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="addr-country" className="label">
                  Country
                </label>
                <input
                  id="addr-country"
                  required
                  autoComplete="country-name"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-brand-500">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-brand-300 accent-brand-600"
              />
              Set as my default address
            </label>
            <div className="flex flex-wrap gap-2">
              <button disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : editing ? 'Update address' : 'Add address'}
              </button>
              {editing && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
