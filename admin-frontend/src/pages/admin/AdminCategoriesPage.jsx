import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconTag, IconPlus, IconClose } from '../../components/common/icons'

function CategoryThumb({ name, image }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-200 bg-brand-50">
      {image && !broken ? (
        <img src={image} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="font-display text-lg text-brand-400">{(name || '?').charAt(0).toUpperCase()}</span>
      )}
    </div>
  )
}

export default function AdminCategoriesPage() {
  const dispatch = useDispatch()
  const [cats, setCats] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const refresh = async () => {
    const res = await apiAdminCategories()
    setCats(res.data.data.categories || [])
  }

  const load = () => {
    setLoading(true)
    setError('')
    refresh()
      .catch((e) => setError(getErrorMessage(e, 'Could not load categories')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

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

  const resetForm = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setImageFile(null)
    setImagePreview(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      if (description) formData.append('description', description)
      if (imageFile) formData.append('file', imageFile)
      if (editing && !imageFile && imagePreview === null) {
        formData.append('removeImage', 'true')
      }

      if (editing) {
        const res = await apiUpdateCategory(editing, formData)
        dispatch(toastSuccess('Category updated'))
        setCats((list) => list.map((c) => (c._id === editing ? res.data.data.category : c)))
      } else {
        await apiCreateCategory(formData)
        dispatch(toastSuccess('Category created'))
        await refresh()
      }
      resetForm()
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (cat) => {
    setEditing(cat._id)
    setName(cat.name)
    setDescription(cat.description || '')
    setImagePreview(cat.image || null)
    setImageFile(null)
  }

  const remove = async (id) => {
    setBusyId(id)
    try {
      await apiDeleteCategory(id)
      dispatch(toastSuccess('Category deleted'))
      await refresh()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  const toggleActive = async (c) => {
    setBusyId(c._id)
    try {
      const res = await apiUpdateCategory(c._id, { isActive: !c.isActive })
      setCats((list) => list.map((x) => (x._id === c._id ? res.data.data.category : x)))
      dispatch(toastSuccess(c.isActive ? 'Category deactivated' : 'Category activated'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div>
        <p className="section-label">Catalogue</p>
        <h1 className="page-title mt-1">Categories</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Categories organise the storefront navigation and filters. Only active categories are shown to buyers.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr] lg:items-start">
        <form onSubmit={submit} className="card p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <IconPlus width={16} height={16} className="text-accent-700" />
            <h2 className="section-title">{editing ? 'Edit category' : 'New category'}</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="cat-name" className="label">
                Name
              </label>
              <input
                id="cat-name"
                required
                placeholder="e.g. Home & living"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="cat-desc" className="label">
                Description (optional)
              </label>
              <textarea
                id="cat-desc"
                placeholder="Short description for this category"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="textarea"
              />
            </div>
            <div>
              <span className="label">Category image</span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-secondary btn-sm cursor-pointer">
                  <IconPlus width={14} height={14} />
                  {imagePreview ? 'Replace image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={submitting}
                  />
                </label>
                {imagePreview && (
                  <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-brand-200">
                    <img src={imagePreview} alt="Category preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      aria-label="Remove image"
                      className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-brand-600 shadow-sm hover:bg-red-600 hover:text-white"
                    >
                      <IconClose width={11} height={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving…' : editing ? 'Update category' : 'Create category'}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>

        <section>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="card flex items-center gap-3 p-4">
                  <Skeleton className="h-11 w-11" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <ErrorState icon={IconTag} message={error} onRetry={load} />
          ) : cats.length === 0 ? (
            <EmptyState
              icon={IconTag}
              title="No categories yet"
              message="Create your first category to organise products on the storefront."
            />
          ) : (
            <div className="card divide-y divide-brand-100 overflow-hidden">
              {cats.map((c) => (
                <div key={c._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CategoryThumb name={c.name} image={c.image} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-semibold text-brand-900">
                        {c.name}
                        {!c.isActive && (
                          <span className="status-pill bg-gray-100 text-gray-600">Inactive</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-brand-400">/{c.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      disabled={busyId === c._id}
                      onClick={() => toggleActive(c)}
                      className={`btn-sm border px-3 disabled:opacity-50 ${
                        c.isActive
                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                          : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => startEdit(c)} className="btn-secondary btn-sm">
                      Edit
                    </button>
                    <button
                      disabled={busyId === c._id}
                      onClick={() => remove(c._id)}
                      className="btn-sm border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
