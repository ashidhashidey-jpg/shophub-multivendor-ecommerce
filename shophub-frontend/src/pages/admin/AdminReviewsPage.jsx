import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminReviews, apiAdminDeleteReview } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminReviewsPage() {
  const dispatch = useDispatch()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiAdminReviews()
      .then((res) => setReviews(res.data.data.reviews))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const remove = async (id) => {
    try {
      await apiAdminDeleteReview(id)
      dispatch(toastSuccess('Review deleted'))
      setReviews((list) => list.filter((r) => r._id !== id))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Reviews</h1>
      {reviews.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-gray-500">No reviews.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {reviews.map((r) => (
            <div key={r._id} className="card p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">
                  {r.user?.name || 'User'}
                  <span className="ml-2 text-amber-500">★ {r.rating}</span>
                  <span className="ml-2 text-xs text-gray-400">on {r.product?.name || '—'}</span>
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                  <button onClick={() => remove(r._id)} className="btn-sm border border-red-200 text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
              {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}