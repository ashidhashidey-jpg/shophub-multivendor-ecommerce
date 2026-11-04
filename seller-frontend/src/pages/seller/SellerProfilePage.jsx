import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiSellerProfile, apiUpdateStore } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { IconStore, IconClose, IconPlus } from '../../components/common/icons'

export default function SellerProfilePage() {
  const dispatch = useDispatch()
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    phone: '',
    address: '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})

  const load = () => {
    setLoading(true)
    setLoadError('')
    apiSellerProfile()
      .then((res) => {
        const s = res.data.data.seller
        setSeller(s)
        setForm({
          storeName: s.storeName || '',
          storeDescription: s.storeDescription || '',
          phone: s.phone || '',
          address: s.address || '',
        })
        setImagePreview(s.storeImage || null)
      })
      .catch((e) => setLoadError(getErrorMessage(e, 'Failed to load profile')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <Loader />

  if (loadError || !seller) {
    return (
      <div className="page-container py-8">
        <h1 className="page-title">Store profile</h1>
        <div className="mt-6">
          <ErrorState icon={IconStore} message={loadError || 'Store profile unavailable'} onRetry={load} />
        </div>
      </div>
    )
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const validateForm = () => {
    const newErrors = {}
    if (!form.storeName.trim()) newErrors.storeName = 'Store name is required'
    if (!form.storeDescription.trim()) newErrors.storeDescription = 'Store description is required'
    if (form.storeDescription.trim().length < 10)
      newErrors.storeDescription = 'Store description must be at least 10 characters'
    if (!form.phone.trim()) newErrors.phone = 'Phone is required'
    if (!form.address.trim()) newErrors.address = 'Address is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('storeName', form.storeName)
      formData.append('storeDescription', form.storeDescription)
      formData.append('phone', form.phone)
      formData.append('address', form.address)
      if (imageFile) formData.append('file', imageFile)
      if (!imageFile && imagePreview === null && seller?.storeImage) {
        formData.append('removeImage', 'true')
      }

      const res = await apiUpdateStore(formData)
      dispatch(toastSuccess('Store updated successfully'))
      setSeller(res.data.data.seller)
      setImageFile(null)
      setImagePreview(res.data.data.seller.storeImage || null)
    } catch (err) {
      const fieldErrors = err?.response?.data?.errors
      if (Array.isArray(fieldErrors)) {
        const byField = {}
        for (const e of fieldErrors) {
          const field = e?.field || e?.param
          const msg = e?.message || e?.msg
          if (field && msg) byField[field] = msg
        }
        setErrors(byField)
      }
      toastError(getErrorMessage(err, 'Failed to update store'))
    } finally {
      setSubmitting(false)
    }
  }

  const initials = (seller.storeName || 'S').charAt(0).toUpperCase()

  return (
    <div className="page-container max-w-4xl fade-in py-8">
      <p className="section-label">Store settings</p>
      <h1 className="page-title mt-1">Store profile</h1>
      <p className="mt-1 text-sm text-brand-500">
        Manage the name, description and contact details buyers see on your storefront.
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
        <aside className="card p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-brand-200 bg-brand-50">
              {imagePreview ? (
                <img src={imagePreview} alt="Store logo preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-2xl text-brand-400">
                  {initials}
                </span>
              )}
              {(imagePreview || seller?.storeImage) && (
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Remove store logo"
                  className="absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-brand-600 shadow-sm hover:bg-red-600 hover:text-white"
                >
                  <IconClose width={11} height={11} />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-brand-900">{seller.storeName}</p>
              <p className="text-xs text-brand-400">Store logo</p>
            </div>
          </div>

          <label className="btn-secondary btn-sm mt-4 w-full cursor-pointer">
            <IconPlus width={14} height={14} />
            {seller?.storeImage ? 'Replace logo' : 'Upload logo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={submitting} />
          </label>

          <dl className="mt-5 space-y-3 border-t border-brand-100 pt-4 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-400">Status</dt>
              <dd className="mt-0.5 font-semibold text-brand-900">{seller.status || '—'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-400">Email</dt>
              <dd className="mt-0.5 break-all text-brand-700">{seller.email || seller.user?.email || '—'}</dd>
            </div>
            {seller.approvedAt && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand-400">Approved</dt>
                <dd className="mt-0.5 text-brand-700">
                  {new Date(seller.approvedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </dd>
              </div>
            )}
          </dl>
        </aside>

        <form onSubmit={submit} className="card p-5 sm:p-6">
          <h2 className="section-title">Store information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="store-name" className="label">
                Store name *
              </label>
              <input
                id="store-name"
                required
                placeholder="Store name"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="input"
              />
              {errors.storeName && <p className="field-error">{errors.storeName}</p>}
            </div>
            <div>
              <label htmlFor="store-description" className="label">
                Store description *
              </label>
              <textarea
                id="store-description"
                required
                placeholder="Tell buyers what your store specialises in (at least 10 characters)"
                rows={4}
                value={form.storeDescription}
                onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
                className="textarea"
              />
              {errors.storeDescription && <p className="field-error">{errors.storeDescription}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="store-phone" className="label">
                  Contact phone *
                </label>
                <input
                  id="store-phone"
                  required
                  type="tel"
                  placeholder="Contact phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="store-address" className="label">
                  Business address *
                </label>
                <input
                  id="store-address"
                  required
                  placeholder="Business address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input"
                />
                {errors.address && <p className="field-error">{errors.address}</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button disabled={submitting} className="btn-primary">
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
