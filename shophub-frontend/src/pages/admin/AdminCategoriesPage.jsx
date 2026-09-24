import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminCategories, apiCreateCategory, apiUpdateCategory, apiDeleteCategory } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import Loader from '../../components/common/Loader'

export default function AdminCategoriesPage() {
  const dispatch = useDispatch()
  const [cats, setCats] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const res = await apiAdminCategories()
    setCats(res.data.data.categories || [])
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const res = await apiUpdateCategory(editing, { name })
        dispatch(toastSuccess('Category updated'))
        setCats((list) => list.map((c) => (c._id === editing ? res.data.data.category : c)))
      } else {
        await apiCreateCategory({ name })
        dispatch(toastSuccess('Category created'))
        await refresh()
      }
      setName('')
      setEditing(null)
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    }
  }

  const remove = async (id) => {
    try {
      await apiDeleteCategory(id)
      dispatch(toastSuccess('Category deleted'))
      await refresh()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <h1 className="page-title">Categories</h1>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          required
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input flex-1"
        />
        <button className="btn-primary">
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setName('')
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}
      </form>
      <ul className="mt-4 space-y-2">
        {cats.map((c) => (
          <li key={c._id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-gray-900">
                {c.name}
                {!c.isActive && (
                  <span className="status-pill ml-2 bg-gray-100 text-gray-500">Inactive</span>
                )}
              </p>
              <p className="text-xs text-gray-500">/{c.slug}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await apiUpdateCategory(c._id, { isActive: !c.isActive })
                    setCats((list) => list.map((x) => (x._id === c._id ? res.data.data.category : x)))
                    dispatch(toastSuccess(c.isActive ? 'Category deactivated' : 'Category activated'))
                  } catch (e) {
                    dispatch(toastError(getErrorMessage(e)))
                  }
                }}
                className="btn-sm border border-amber-300 text-amber-600 hover:bg-amber-50"
              >
                {c.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => {
                  setEditing(c._id)
                  setName(c.name)
                }}
                className="btn-secondary btn-sm"
              >
                Edit
              </button>
              <button onClick={() => remove(c._id)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}