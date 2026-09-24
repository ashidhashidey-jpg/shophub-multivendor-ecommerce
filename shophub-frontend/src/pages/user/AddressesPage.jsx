import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAddresses, apiCreateAddress, apiUpdateAddress, apiDeleteAddress, apiSetDefaultAddress } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

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

export default function AddressesPage() {
  const dispatch = useDispatch()
  const [addresses, setAddresses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const res = await apiAddresses()
    setAddresses(res.data.data.addresses)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const submit = async (e) => {
    e.preventDefault()
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
    }
  }

  const remove = async (id) => {
    try {
      await apiDeleteAddress(id)
      await refresh()
      dispatch(toastSuccess('Address deleted'))
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    }
  }

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <h1 className="page-title">My addresses</h1>

      {addresses.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No saved addresses yet. Add one below.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a._id} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">
                  {a.name}
                  {a.isDefault && <span className="status-pill ml-2 bg-brand-100 text-brand-700">Default</span>}
                </p>
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => {
                      setEditing(a._id)
                      setForm({ ...a })
                    }}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button onClick={() => remove(a._id)} className="font-medium text-red-500 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {a.addressLine1}
                {a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state} {a.postalCode}, {a.country}
              </p>
              {!a.isDefault && (
                <button
                  onClick={async () => {
                    await apiSetDefaultAddress(a._id)
                    await refresh()
                  }}
                  className="mt-2 text-xs font-medium text-brand-600 hover:underline"
                >
                  Set as default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card mt-6 p-5">
        <h2 className="section-title">{editing ? 'Edit address' : 'Add address'}</h2>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Label (Home/Office)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Address line 1"
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            className="input sm:col-span-2"
          />
          <input
            required
            placeholder="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Postal code"
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="input"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Set as default
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary">
              {editing ? 'Update' : 'Add'} address
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setForm(emptyForm)
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}