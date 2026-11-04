import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiAdminReviews, apiAdminDeleteReview } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconStar } from '../../components/common/icons'

export default function AdminReviewsPage() {
  const dispatch = useDispatch()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    apiAdminReviews()
      .then((res) => setReviews(res.data.data.reviews))
      .catch((e) => setError(getErrorMessage(e, 'Could not load reviews')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const remove = async (id) => {
    setBusyId(id)
    try {
      await apiAdminDeleteReview(id)
      dispatch(toastSuccess('Review deleted'))
      setReviews((list) => list.filter((r) => r._id !== id))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div>
        <p className="section-label">Moderation</p>
        <h1 className="page-title mt-1">Reviews</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Moderate buyer reviews. Remove content that violates marketplace policy.
        </p>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card space-y-2 p-5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconStar} message={error} onRetry={load} />
        ) : reviews.length === 0 ? (
          <EmptyState icon={IconStar} title="No reviews yet" message="Buyer reviews will appear here for moderation." />
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <article key={r._id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-900">{r.user?.name || 'User'}</span>
                      <span className="inline-flex items-center gap-1 rounded bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700">
                        <IconStar width={11} height={11} filled /> {r.rating}
                      </span>
                      <span className="text-xs text-brand-400">on {r.product?.name || '—'}</span>
                    </div>
                    <p className="mt-1 text-xs text-brand-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <button
                    disabled={busyId === r._id}
                    onClick={() => remove(r._id)}
                    className="btn-sm border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busyId === r._id ? 'Removing…' : 'Delete review'}
                  </button>
                </div>
                {r.comment ? (
                  <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-600">{r.comment}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-brand-400">No written comment.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
