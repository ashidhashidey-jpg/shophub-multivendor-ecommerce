import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { apiSellerRegister, apiSellerStatus, apiUploadDocument } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'
import { IconStore, IconShield, IconPackage, IconTag, IconCheck } from '../../components/common/icons'

const BENEFITS = [
  { icon: IconStore, title: 'Your own storefront', text: 'Get a branded store page with your logo and story.' },
  { icon: IconPackage, title: 'Simple catalogue tools', text: 'List products, manage stock and upload photos.' },
  { icon: IconTag, title: 'Order management', text: 'Track fulfilment and handle returns in one place.' },
  { icon: IconShield, title: 'Verified marketplace', text: 'KYC checks keep buyers and sellers protected.' },
]

export default function SellerRegisterPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    phone: '',
    address: '',
    kycDocuments: [{ documentType: 'PAN', documentNumber: '', documentUrl: '' }],
  })
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const uploadKycFile = async (file) => {
    setUploading(true)
    try {
      const res = await apiUploadDocument(file)
      const url = res.data.data?.url || ''
      if (url) {
        setForm((f) => ({
          ...f,
          kycDocuments: [{ ...f.kycDocuments[0], documentUrl: url }],
        }))
        dispatch(toastSuccess('Document uploaded'))
      }
    } catch (e) {
      dispatch(toastError(getErrorMessage(e, 'Upload unavailable (Cloudinary not configured)')))
    } finally {
      setUploading(false)
    }
  }

  const applyFieldErrors = (err) => {
    const errors = err?.response?.data?.errors
    if (!Array.isArray(errors)) return
    const byField = {}
    for (const e of errors) {
      const field = e?.field || e?.param
      const msg = e?.message || e?.msg
      if (field && msg) {
        if (/^kyc/i.test(field)) byField.kyc = msg
        else if (['storeName', 'storeDescription', 'phone', 'address'].includes(field)) byField[field] = msg
      }
    }
    setFieldErrors(byField)
  }

  useEffect(() => {
    apiSellerStatus()
      .then((res) => {
        const seller = res.data.data.seller
        const status = seller?.status
        if (status === 'APPROVED') navigate('/seller/dashboard')
        else if (status === 'PENDING' || status === 'SUSPENDED') navigate('/seller/pending')
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [navigate])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setFieldErrors({})
    try {
      const res = await apiSellerRegister(form)
      dispatch(toastSuccess('Seller application submitted'))
      navigate('/seller/pending', { state: { seller: res.data.data.seller } })
    } catch (err) {
      applyFieldErrors(err)
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return <Loader />

  const kyc = form.kycDocuments[0]

  return (
    <div className="page-container fade-in py-10">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <p className="section-label">Sell on ShopHub</p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-brand-900">
            Bring your store to a premium marketplace.
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-500">
            Apply once. After a quick verification, you can list products and start reaching customers across
            the marketplace.
          </p>

          <ul className="mt-6 space-y-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-100 text-accent-700">
                  <Icon width={16} height={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-900">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-brand-500">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="card p-5 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="section-title">Seller application</h2>
              <p className="mt-1 text-xs text-brand-400">
                All fields are required. Your KYC details are only used for verification.
              </p>
            </div>
            <span className="hidden rounded-full bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-500 sm:inline">
              Step 1 of 1
            </span>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-store-name" className="label">
                  Store name
                </label>
                <input
                  id="reg-store-name"
                  required
                  placeholder="e.g. Northline Goods"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="input"
                />
                {fieldErrors.storeName && <p className="field-error">{fieldErrors.storeName}</p>}
              </div>
              <div>
                <label htmlFor="reg-phone" className="label">
                  Phone
                </label>
                <input
                  id="reg-phone"
                  required
                  type="tel"
                  placeholder="Business contact number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                />
                {fieldErrors.phone && <p className="field-error">{fieldErrors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="reg-desc" className="label">
                Store description
              </label>
              <textarea
                id="reg-desc"
                required
                placeholder="What do you sell? Tell buyers about your store (at least 10 characters)."
                rows={3}
                value={form.storeDescription}
                onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
                className="textarea"
              />
              {fieldErrors.storeDescription && <p className="field-error">{fieldErrors.storeDescription}</p>}
            </div>

            <div>
              <label htmlFor="reg-address" className="label">
                Business address
              </label>
              <input
                id="reg-address"
                required
                placeholder="Street, city, state, postal code"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input"
              />
              {fieldErrors.address && <p className="field-error">{fieldErrors.address}</p>}
            </div>

            <fieldset className="rounded-xl border border-brand-200 p-4">
              <legend className="px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-500">
                KYC verification
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="kyc-type" className="label">
                    Document type
                  </label>
                  <select
                    id="kyc-type"
                    required
                    value={kyc.documentType}
                    onChange={(e) =>
                      setForm({ ...form, kycDocuments: [{ ...kyc, documentType: e.target.value }] })
                    }
                    className="select"
                  >
                    <option value="" disabled>
                      Select document
                    </option>
                    <option value="PAN">PAN</option>
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving Licence</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="kyc-number" className="label">
                    Document number
                  </label>
                  <input
                    id="kyc-number"
                    required
                    placeholder="Document number"
                    value={kyc.documentNumber}
                    onChange={(e) =>
                      setForm({ ...form, kycDocuments: [{ ...kyc, documentNumber: e.target.value }] })
                    }
                    className="input"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="kyc-url" className="label">
                    Document URL
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="kyc-url"
                      required
                      placeholder="Paste a URL or upload a file"
                      value={kyc.documentUrl}
                      onChange={(e) =>
                        setForm({ ...form, kycDocuments: [{ ...kyc, documentUrl: e.target.value }] })
                      }
                      className="input flex-1"
                    />
                    <label className="btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                      <IconCheck width={14} height={14} />
                      {uploading ? 'Uploading…' : 'Upload file'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) uploadKycFile(e.target.files[0])
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                  <p className="mt-1.5 text-xs text-brand-400">
                    Upload a clear photo or PDF of your ID (PAN, Aadhaar, passport or driving licence).
                  </p>
                </div>
              </div>
              {fieldErrors.kyc && <p className="field-error">{fieldErrors.kyc}</p>}
            </fieldset>

            <div className="flex flex-col-reverse items-stretch gap-3 border-t border-brand-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-brand-400">
                By applying you agree to marketplace selling policies.
              </p>
              <button disabled={submitting} className="btn-primary shrink-0">
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
