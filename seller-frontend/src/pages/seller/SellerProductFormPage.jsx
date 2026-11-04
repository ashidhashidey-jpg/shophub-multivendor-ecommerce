import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { getErrorMessage } from '../../api/client'
import {
  apiCategories,
  apiCreateProduct,
  apiUpdateProduct,
  apiSellerProduct,
  apiUploadImage,
} from '../../api/endpoints'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'
import { IconPlus, IconClose, IconPackage, IconArrowLeft } from '../../components/common/icons'

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  discount: 0,
  stock: '',
  images: [],
}

export default function SellerProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isEdit = Boolean(id)

  const [cats, setCats] = useState([])
  const [initializing, setInitializing] = useState(isEdit)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    apiCategories()
      .then((res) => setCats(res.data.data.categories))
      .catch(() => {})
    if (isEdit) {
      apiSellerProduct(id)
        .then((res) => {
          const prod = res.data.data.product
          if (!prod) throw new Error('not found')
          setForm({
            name: prod.name,
            description: prod.description,
            category: prod.category?._id || prod.category,
            price: prod.price,
            discount: prod.discount || 0,
            stock: prod.stock,
            images: prod.images || [],
          })
        })
        .catch(() => navigate('/seller/products'))
        .finally(() => setInitializing(false))
    }
  }, [id, isEdit, navigate])

  const finalPrice = useMemo(() => {
    const price = Number(form.price) || 0
    const discount = Number(form.discount) || 0
    return price - (price * discount) / 100
  }, [form.price, form.discount])

  if (initializing) return <Loader />

  const uploadImage = async (file) => {
    setUploading(true)
    try {
      const res = await apiUploadImage(file)
      const url = res.data.data?.url || ''
      if (url && form.images.length < 8) setForm((f) => ({ ...f, images: [...f.images, url] }))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e, 'Upload unavailable (Cloudinary not configured)')))
    } finally {
      setUploading(false)
    }
  }

  const addImageUrl = () => {
    const url = imageUrl.trim()
    if (!url) return
    if (form.images.length >= 8) {
      dispatch(toastError('You can add up to 8 images'))
      return
    }
    setForm((f) => ({ ...f, images: [...f.images, url] }))
    setImageUrl('')
  }

  const removeImage = (index) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        category: form.category,
        price: Number(form.price),
        discount: Number(form.discount || 0),
        stock: Number(form.stock),
      }
      if (isEdit) {
        await apiUpdateProduct(id, payload)
        dispatch(toastSuccess('Product updated (pending review)'))
      } else {
        await apiCreateProduct(payload)
        dispatch(toastSuccess('Product created (pending admin approval)'))
      }
      navigate('/seller/products')
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container max-w-4xl fade-in py-8">
      <button
        type="button"
        onClick={() => navigate('/seller/products')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-500 hover:text-charcoal-900"
      >
        <IconArrowLeft width={14} height={14} /> Back to products
      </button>
      <h1 className="page-title mt-2">{isEdit ? 'Edit product' : 'New product'}</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        {isEdit
          ? 'Changes are sent for admin review before going live again.'
          : 'Provide clear photos and accurate stock. New listings are reviewed before appearing in the store.'}
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="section-title">Product details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="prod-name" className="label">
                  Product name
                </label>
                <input
                  id="prod-name"
                  required
                  minLength={3}
                  placeholder="e.g. Merino wool crew-neck sweater"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="prod-desc" className="label">
                  Description
                </label>
                <textarea
                  id="prod-desc"
                  required
                  minLength={10}
                  placeholder="Describe materials, fit, sizing and anything buyers should know."
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="textarea"
                />
              </div>
              <div>
                <label htmlFor="prod-category" className="label">
                  Category
                </label>
                <select
                  id="prod-category"
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="select"
                >
                  <option value="">Select category</option>
                  {cats.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="section-title">Pricing &amp; stock</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="prod-price" className="label">
                  Price (₹)
                </label>
                <input
                  id="prod-price"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="prod-discount" className="label">
                  Discount (%)
                </label>
                <input
                  id="prod-discount"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="prod-stock" className="label">
                  Stock quantity
                </label>
                <input
                  id="prod-stock"
                  required
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            {Number(form.price) > 0 && (
              <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm">
                <span className="text-brand-500">Buyers will pay</span>{' '}
                <span className="font-extrabold text-brand-900">{formatINR(finalPrice)}</span>
                {Number(form.discount) > 0 && (
                  <span className="ml-2 text-xs text-brand-400">
                    {formatINR(form.price)} less {form.discount}%
                  </span>
                )}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Images</h2>
              <span className="text-xs text-brand-400">{form.images.length}/8</span>
            </div>
            <p className="mt-1 text-xs text-brand-400">
              The first image is used as the main product photo. Upload files or paste image URLs.
            </p>

            {form.images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {form.images.map((url, i) => (
                  <div key={`${url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-brand-200 bg-brand-50">
                    <img src={url} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-brand-900/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-brand-600 shadow-sm transition hover:bg-red-600 hover:text-white"
                    >
                      <IconClose width={12} height={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="btn-secondary btn-sm cursor-pointer">
                <IconPlus width={14} height={14} />
                {uploading ? 'Uploading…' : 'Upload image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || form.images.length >= 8}
                  onChange={(e) => {
                    if (e.target.files[0]) uploadImage(e.target.files[0])
                    e.target.value = ''
                  }}
                />
              </label>
              <div className="flex flex-1 gap-2">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addImageUrl()
                    }
                  }}
                  placeholder="Paste an image URL"
                  aria-label="Image URL"
                  className="input"
                />
                <button type="button" onClick={addImageUrl} className="btn-secondary btn-sm shrink-0">
                  Add
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="card p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-accent-700">
              <IconPackage width={16} height={16} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Listing preview</p>
              <p className="text-sm font-bold text-brand-900">{form.name || 'Product name'}</p>
            </div>
          </div>
          <div className="mt-4 aspect-[4/3] overflow-hidden rounded-lg border border-brand-200 bg-brand-50">
            {form.images[0] ? (
              <img src={form.images[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-brand-300">
                <IconPackage width={36} height={36} />
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand-900">{formatINR(finalPrice)}</span>
            {Number(form.discount) > 0 && (
              <span className="text-xs text-brand-400 line-through">{formatINR(form.price)}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-brand-500">
            {form.stock === '' ? 'Stock not set' : `${form.stock} in stock`}
          </p>

          <button disabled={saving} className="btn-primary mt-5 w-full">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          {isEdit && (
            <p className="mt-2 text-center text-[11px] leading-4 text-brand-400">
              Editing resets the product to PENDING for admin re-approval.
            </p>
          )}
        </aside>
      </form>
    </div>
  )
}
