import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  apiProduct,
  apiProductReviews,
  apiAddCart,
  apiCreateReview,
  apiReviewEligibility,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, formatDate } from '../../utils/format'
import Loader from '../../components/common/Loader'
import { useWishlist } from '../../store/wishlist-context'

export default function ProductDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { isInWishlist, toggle } = useWishlist()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({ averageRating: 0, count: 0 })
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [eligibility, setEligibility] = useState(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)

  const loadEligibility = () => {
    if (user?.role !== 'USER') {
      setEligibility(null)
      return
    }
    setEligibilityLoading(true)
    apiReviewEligibility(id)
      .then((res) => setEligibility(res.data.data.eligibility))
      .catch(() => setEligibility(null))
      .finally(() => setEligibilityLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([apiProduct(id), apiProductReviews(id)])
      .then(([p, r]) => {
        setProduct(p.data.data.product)
        setReviews(r.data.data.reviews)
        setSummary(r.data.data.ratingSummary)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.role])

  if (loading) return <Loader />
  if (!product) return <p className="page-container py-16 text-center text-gray-500">Product not found.</p>

  const addToCart = async () => {
    if (!user) return dispatch(toastError('Please login to add items to cart'))
    try {
      await apiAddCart(product._id, qty)
      dispatch(toastSuccess('Added to cart'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    try {
      await apiCreateReview(product._id, reviewForm)
      dispatch(toastSuccess('Review submitted'))
      setReviewForm({ rating: 5, comment: '' })
      const [r, el] = await Promise.all([apiProductReviews(product._id), apiReviewEligibility(product._id)])
      setReviews(r.data.data.reviews)
      setSummary(r.data.data.ratingSummary)
      setEligibility(el.data.data.eligibility)
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    }
  }

  return (
    <div className="page-container py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-brand-200 bg-brand-50 sm:aspect-[4/3] lg:aspect-square">
          {product.images?.length ? (
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-6xl">🛍️</span>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-500">
            {product.category?.name} · Sold by{' '}
            <span className="font-medium text-gray-700">{product.seller?.storeName || 'ShopHub'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold text-brand-900">{formatINR(product.finalPrice)}</span>
            {product.discount > 0 && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>
                <span className="status-pill bg-green-100 text-green-700">{product.discount}% off</span>
              </>
            )}
          </div>

          <p className="mt-2 text-sm text-gray-600">
            In stock: <strong>{product.stock}</strong>{' '}
            {product.stock <= 5 && <span className="font-medium text-amber-600">(low stock!)</span>}
          </p>

          <p className="mt-3 max-w-prose text-sm leading-6 text-gray-600">{product.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select
              aria-label="Quantity"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="select w-24"
            >
              {[...Array(Math.min(10, product.stock)).keys()].map((n) => (
                <option key={n + 1} value={n + 1}>
                  {n + 1}
                </option>
              ))}
            </select>
            <button onClick={addToCart} className="btn-primary">
              Add to cart
            </button>
            <button
              onClick={() => toggle(product._id)}
              className={`rounded-md border px-5 py-2.5 text-sm font-medium transition ${
                isInWishlist(product._id)
                  ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-brand-200 bg-white text-gray-700 hover:bg-brand-50'
              }`}
            >
              {isInWishlist(product._id) ? '♥ In wishlist' : '♡ Wishlist'}
            </button>
            {user && (
              <Link
                to="/checkout"
                className="rounded-md border border-brand-300 px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Buy now
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="section-title">
          Reviews ({summary.count}){' '}
          <span className="text-sm font-normal text-gray-500">
            ★ {Number(summary.averageRating || 0).toFixed(1)} avg
          </span>
        </h2>

        {user?.role === 'USER' && (
          <div className="mt-3">
            {eligibilityLoading ? (
              <p className="text-sm text-gray-400">Checking review eligibility…</p>
            ) : eligibility?.canReview ? (
              <details open className="card mt-4 px-5 py-4">
                <summary className="cursor-pointer text-sm font-medium text-brand-600">Write a review</summary>
                <form onSubmit={submitReview} className="mt-4 flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    Rating
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                      className="select w-auto"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} ★
                        </option>
                      ))}
                    </select>
                  </label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your experience…"
                    rows={3}
                    maxLength={1000}
                    className="textarea"
                  />
                  <button className="btn-primary w-fit" type="submit">
                    Submit review
                  </button>
                </form>
              </details>
            ) : (
              eligibility && (
                <p className="rounded-md border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-gray-500">
                  {eligibility.reason || 'You can review this product after purchasing and receiving it.'}
                </p>
              )
            )}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="card p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">
                    {r.user?.name || 'User'} <span className="text-amber-500">★ {r.rating}</span>
                  </p>
                  <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}