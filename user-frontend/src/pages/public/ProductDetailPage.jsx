import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  apiProduct,
  apiProducts,
  apiProductReviews,
  apiAddCart,
  apiGetCart,
  apiCreateReview,
  apiReviewEligibility,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { setCartCount } from '../../store/slices/uiSlice'
import { formatINR, formatDate } from '../../utils/format'
import Loader from '../../components/common/Loader'
import ProductCard from '../../components/common/ProductCard'
import { useWishlist } from '../../store/wishlist-context'
import {
  IconHeart,
  IconShirt,
  IconStar,
  IconStore,
  IconTruck,
  IconShield,
  IconRefresh,
  IconChevronRight,
  IconPlus,
  IconMinus,
} from '../../components/common/icons'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { isInWishlist, toggle } = useWishlist()

  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({ averageRating: 0, count: 0 })
  const [related, setRelated] = useState([])
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
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
    let cancelled = false
    setLoading(true)
    setActiveImage(0)
    setQty(1)
    setRelated([])
    Promise.all([apiProduct(id), apiProductReviews(id)])
      .then(([p, r]) => {
        if (cancelled) return
        const found = p.data.data.product
        setProduct(found)
        setReviews(r.data.data.reviews)
        setSummary(r.data.data.ratingSummary)
        // Related products: same category, real catalogue, current item excluded.
        if (found?.category?.slug) {
          apiProducts({ category: found.category.slug, limit: 5, sort: 'newest' })
            .then((res) => {
              if (!cancelled) {
                setRelated(res.data.data.products.filter((x) => String(x._id) !== String(found._id)).slice(0, 4))
              }
            })
            .catch(() => {})
        }
      })
      .catch(() => !cancelled && setProduct(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    loadEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.role])

  if (loading) return <Loader />
  if (!product) return <p className="page-container py-16 text-center text-gray-500">Product not found.</p>

  const syncCartCount = async () => {
    try {
      const cart = await apiGetCart()
      dispatch(setCartCount(cart.data.data.cart.items.length))
    } catch {
      /* ignore — navbar will reconcile on its own next fetch */
    }
  }

  const addToCart = async () => {
    if (!user) return dispatch(toastError('Please login to add items to cart'))
    try {
      await apiAddCart(product._id, qty)
      await syncCartCount()
      dispatch(toastSuccess('Added to cart'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  // "Buy now" must place the item in the cart first — checking out straight
  // from the detail page used to land on an empty cart.
  const buyNow = async () => {
    if (!user) return dispatch(toastError('Please login to add items to cart'))
    try {
      await apiAddCart(product._id, qty)
      await syncCartCount()
      dispatch(toastSuccess('Added to cart'))
      navigate('/checkout')
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

  const images = product.images || []
  const activeSrc = images[activeImage] || images[0]
  const outOfStock = product.stock === 0
  const storeId = product.seller?._id
  const storeName = product.seller?.storeName
  const maxQty = Math.max(1, Math.min(10, Number(product.stock) || 0))
  const inWishlist = isInWishlist(product._id)

  return (
    <div className="fade-in">
      <div className="page-container py-6">
        <nav className="text-xs text-charcoal-400" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-charcoal-900">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link to="/products" className="hover:text-charcoal-900">
            Shop
          </Link>
          {product.category?.slug && (
            <>
              <span className="mx-1.5">/</span>
              <Link to={`/categories/${product.category.slug}`} className="hover:text-charcoal-900">
                {product.category.name}
              </Link>
            </>
          )}
          <span className="mx-1.5">/</span>
          <span className="line-clamp-1 font-medium text-charcoal-700">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border charcoal-200 bg-warm-ivory">
              {activeSrc ? (
                <img src={activeSrc} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-brand-300">
                  <IconShirt width={80} height={80} />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">ShopHub</span>
                </div>
              )}
              {product.discount > 0 && (
                <span className="absolute left-4 top-4 rounded bg-muted-gold px-2.5 py-1 text-xs font-bold text-charcoal-900">
                  {product.discount}% off
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-brand-50 transition ${
                      i === activeImage ? 'border-brand-600' : 'border-brand-200 hover:border-brand-300'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-700">
                  {product.category?.name || 'Marketplace'}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-brand-900 sm:text-3xl">
                  {product.name}
                </h1>
              </div>
              <button
                onClick={() => toggle(product._id)}
                aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                  inWishlist
                    ? 'border-charcoal-200 bg-charcoal-100 text-charcoal-700'
                    : 'border-charcoal-200 bg-white text-charcoal-300 hover:text-charcoal-600'
                }`}
              >
                <IconHeart filled={inWishlist} width={18} height={18} />
              </button>
            </div>

            <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-0.5 text-muted-gold">
                {[1, 2, 3, 4, 5].map((n) => (
                  <IconStar
                    key={n}
                    filled={n <= Math.round(Number(summary.averageRating || 0))}
                    width={14}
                    height={14}
                    className={n <= Math.round(Number(summary.averageRating || 0)) ? '' : 'text-charcoal-300'}
                  />
                ))}
              </span>
              <span className="font-semibold text-charcoal-800">
                {summary.count > 0 ? Number(summary.averageRating || 0).toFixed(1) : 'New'}
              </span>
              <span className="text-charcoal-400">({summary.count} review{summary.count === 1 ? '' : 's'})</span>
            </a>

            <div className="mt-5 flex flex-wrap items-baseline gap-3 border-y charcoal-200 py-4">
              <span className="text-3xl font-extrabold tracking-tight text-charcoal-900">{formatINR(product.finalPrice)}</span>
              {product.discount > 0 && (
                <>
                  <span className="text-base text-charcoal-400 line-through">{formatINR(product.price)}</span>
                  <span className="rounded bg-muted-gold px-2 py-0.5 text-xs font-bold text-charcoal-700">
                    Save {formatINR(Number(product.price) - Number(product.finalPrice))}
                  </span>
                </>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm">
              {outOfStock ? (
                <span className="inline-flex items-center gap-2 font-semibold text-red-600">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Out of stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> In stock
                  <span className="font-normal text-brand-500">· {product.stock} available</span>
                </span>
              )}
              {!outOfStock && product.stock <= 5 && (
                <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Low stock</span>
              )}
            </div>

            <p className="mt-5 max-w-prose whitespace-pre-line text-sm leading-7 text-brand-500">{product.description}</p>

            {/* Seller */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-accent-700">
                  <IconStore width={18} height={18} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-400">Sold by</p>
                  {storeId ? (
                    <Link to={`/stores/${storeId}`} className="text-sm font-semibold text-brand-900 hover:text-accent-700">
                      {storeName || 'View store'}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-brand-900">{storeName || 'ShopHub'}</p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500">
                <IconShield width={14} height={14} className="text-accent-700" /> Approved seller
              </span>
            </div>

            {/* Purchase controls */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!outOfStock && (
                <div className="inline-flex items-center rounded-lg border border-brand-200">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-10 items-center justify-center text-gray-600 hover:bg-brand-50 disabled:opacity-30"
                  >
                    <IconMinus width={15} height={15} />
                  </button>
                  <span aria-live="polite" className="w-9 text-center text-sm font-semibold text-brand-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    aria-label="Increase quantity"
                    className="flex h-11 w-10 items-center justify-center text-gray-600 hover:bg-brand-50 disabled:opacity-30"
                  >
                    <IconPlus width={15} height={15} />
                  </button>
                </div>
              )}
              <button onClick={addToCart} disabled={outOfStock} className="btn-primary h-11 flex-1 sm:flex-none">
                {outOfStock ? 'Out of stock' : 'Add to cart'}
              </button>
              {user && (
                <button onClick={buyNow} disabled={outOfStock} className="btn-accent h-11 flex-1 sm:flex-none">
                  Buy now
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-brand-200 pt-5 text-center">
              {[
                { icon: IconTruck, label: 'Tracked delivery' },
                { icon: IconRefresh, label: 'Return requests' },
                { icon: IconShield, label: 'Secure payment' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-[11px] text-brand-500">
                  <Icon width={17} height={17} className="text-accent-700" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section id="reviews" className="mt-14 scroll-mt-32 border-t border-brand-200 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">Verified buyers</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900">
                Ratings &amp; reviews
              </h2>
            </div>
            <p className="text-sm text-brand-500">
              {summary.count === 0
                ? 'No reviews yet'
                : `${Number(summary.averageRating || 0).toFixed(1)} out of 5 · ${summary.count} review${summary.count === 1 ? '' : 's'}`}
            </p>
          </div>

          {user?.role === 'USER' && (
            <div className="mt-5">
              {eligibilityLoading ? (
                <p className="text-sm text-gray-400">Checking review eligibility…</p>
              ) : eligibility?.canReview ? (
                <details className="card px-5 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-900">
                    Write a review <span className="font-normal text-brand-400">— you purchased this item</span>
                  </summary>
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
                  <p className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-500">
                    {eligibility.reason || 'You can review this product after purchasing and receiving it.'}
                  </p>
                )
              )}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {reviews.length === 0 ? (
              <p className="text-sm text-brand-500">No reviews yet.</p>
            ) : (
              reviews.map((r) => (
                <div key={r._id} className="card p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-gray-800">
                      {r.user?.name || 'User'}
                      <span className="ml-2 inline-flex items-center gap-0.5 text-accent-600">
                        <IconStar filled width={13} height={13} /> {r.rating}
                      </span>
                    </p>
                    <span className="whitespace-nowrap text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment && <p className="mt-1.5 text-sm leading-6 text-gray-600">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Related products from real catalogue data */}
        {related.length > 0 && (
          <section className="mt-14 border-t border-brand-200 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-label">More from this category</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900">You may also like</h2>
              </div>
              {product.category?.slug && (
                <Link
                  to={`/categories/${product.category.slug}`}
                  className="link-quiet inline-flex items-center gap-1 text-sm"
                >
                  View category <IconChevronRight width={14} height={14} />
                </Link>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
