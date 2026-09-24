import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { apiSellerRegister, apiSellerStatus, apiUploadDocument } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

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
        else if (status === 'PENDING' || status === 'REJECTED' || status === 'SUSPENDED') navigate('/seller/pending')
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

  return (
    <div className="page-container max-w-2xl py-8">
      <h1 className="page-title">Become a seller</h1>
      <p className="mt-2 text-sm text-gray-500">
        Submit your store details for review. An admin must approve your application before you can list products.
      </p>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="card mt-4 flex flex-col gap-4 p-6 sm:p-8">
        <div>
          <input
            required
            placeholder="Store name"
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className="input"
          />
          {fieldErrors.storeName && <p className="mt-1 text-xs text-red-600">{fieldErrors.storeName}</p>}
        </div>
        <div>
          <textarea
            required
            placeholder="Store description (at least 10 characters)"
            rows={3}
            value={form.storeDescription}
            onChange={(e) => setForm({ ...form, storeDescription: e.target.value })}
            className="textarea"
          />
          {fieldErrors.storeDescription && <p className="mt-1 text-xs text-red-600">{fieldErrors.storeDescription}</p>}
        </div>
        <div>
          <input
            required
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
        </div>
        <div>
          <input
            required
            placeholder="Business address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="input"
          />
          {fieldErrors.address && <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>}
        </div>
        <fieldset className="rounded-lg border border-brand-200 p-4">
          <legend className="section-label px-1">KYC document</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              required
              aria-label="Document type"
              value={form.kycDocuments[0].documentType}
              onChange={(e) =>
                setForm({ ...form, kycDocuments: [{ ...form.kycDocuments[0], documentType: e.target.value }] })
              }
              className="select"
            >
              <option value="" disabled>
                Document type
              </option>
              <option value="PAN">PAN</option>
              <option value="AADHAAR">Aadhaar</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENSE">Driving Licence</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              required
              placeholder="Document number"
              value={form.kycDocuments[0].documentNumber}
              onChange={(e) =>
                setForm({ ...form, kycDocuments: [{ ...form.kycDocuments[0], documentNumber: e.target.value }] })
              }
              className="input"
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                required
                placeholder="Document URL (or upload a file below)"
                value={form.kycDocuments[0].documentUrl}
                onChange={(e) =>
                  setForm({ ...form, kycDocuments: [{ ...form.kycDocuments[0], documentUrl: e.target.value }] })
                }
                className="input flex-1"
              />
              <label className="btn-secondary btn-sm cursor-pointer whitespace-nowrap">
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
            <p className="text-xs text-gray-400 sm:col-span-2">
              Upload a clear photo or PDF of your ID document (PAN, Aadhaar, passport, or driving license).
            </p>
          </div>
          {fieldErrors.kyc && <p className="mt-1 text-xs text-red-600">{fieldErrors.kyc}</p>}
        </fieldset>
        <button disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Submitting…' : 'Submit application'}
        </button>
      </form>
    </div>
  )
}
