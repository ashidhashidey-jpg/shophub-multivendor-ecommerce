import { useEffect, useState } from 'react'
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
import Loader from '../../components/common/Loader'

export default function SellerProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isEdit = Boolean(id)

  const [cats, setCats] = useState([])
  const [initializing, setInitializing] = useState(isEdit)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    discount: 0,
    stock: '',
    images: [],
  })

  useEffect(() => {
    apiCategories().then((res) => setCats(res.data.data.categories)).catch(() => {})
    if (isEdit) {
      apiSellerProduct(id)
        .then(async (res) => {
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
    <div className="page-container max-w-2xl py-8">
      <h1 className="page-title">{isEdit ? 'Edit product' : 'New product'}</h1>
      <form onSubmit={submit} className="card mt-4 flex flex-col gap-4 p-6 sm:p-8">
        <input
          required
          minLength={3}
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
        <textarea
          required
          minLength={10}
          placeholder="Description (at least 10 characters)"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="textarea"
        />
        <select
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
        <div className="grid grid-cols-3 gap-2">
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Price ₹"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="input"
          />
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Discount %"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            className="input"
          />
          <input
            required
            type="number"
            min="0"
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            className="input"
          />
        </div>

        <fieldset className="rounded-lg border border-brand-200 p-4">
          <legend className="section-label px-1">Images (up to 8)</legend>
          <div className="flex flex-wrap gap-2">
            {form.images.map((url, i) => (
              <div key={i} className="flex h-16 w-16 items-center justify-center rounded-md bg-brand-100">
                <img src={url} alt="" className="h-full w-full rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                  className="absolute -mt-12 ml-10 rounded-md bg-red-600 px-1.5 text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <label className="btn-secondary btn-sm mt-2 inline-block cursor-pointer">
            {uploading ? 'Uploading…' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) uploadImage(e.target.files[0])
                e.target.value = ''
              }}
            />
          </label>
          <input
            placeholder="…or paste an image URL"
            className="input mt-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const url = e.target.value.trim()
                if (url && form.images.length < 8) setForm({ ...form, images: [...form.images, url] })
                e.target.value = ''
              }
            }}
          />
        </fieldset>

        <button disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
        {isEdit && <p className="text-xs text-gray-500">Editing resets the product to PENDING for admin re-approval.</p>}
      </form>
    </div>
  )
}