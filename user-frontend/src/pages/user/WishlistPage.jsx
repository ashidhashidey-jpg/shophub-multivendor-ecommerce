import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiGetWishlist, apiAddCart, apiGetCart } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCartCount } from '../../store/slices/uiSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR } from '../../utils/format'
import { useWishlist } from '../../store/wishlist-context'
import { ProductCardSkeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconClose, IconHeart, IconShirt, IconStore } from '../../components/common/icons'

const SKELETONS = Array.from({ length: 4 }, (_, i) => i)

export default function WishlistPage() {
  const dispatch = useDispatch()
  const { toggle } = useWishlist()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGetWishlist()
      .then((res) => setList(res.data.data.wishlist.products))
      .catch((e) => setError(getErrorMessage(e, 'Could not load your wishlist')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="page-container py-8">
        <h1 className="page-title">My wishlist</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {SKELETONS.map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container py-16">
        <h1 className="page-title">My wishlist</h1>
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="page-container py-16">
        <h1 className="page-title">My wishlist</h1>
        <div className="mt-6">
          <EmptyState
            icon={IconHeart}
            title="Your wishlist is empty"
            message="Tap the heart on any product to save it here for later."
            actionTo="/products"
            actionLabel="Browse products"
          />
        </div>
      </div>
    )
  }

  const moveToCart = async (p) => {
    try {
      await apiAddCart(p._id, 1)
      const cart = await apiGetCart()
      dispatch(setCartCount(cart.data.data.cart.items.length))
      dispatch(toastSuccess('Added to cart'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  // Remove through the shared wishlist context so the navbar badge stays in
  // sync, then reconcile the local list with the backend.
  const remove = async (productId) => {
    await toggle(productId)
    try {
      const res = await apiGetWishlist()
      setList(res.data.data.wishlist.products)
    } catch {
      setList((l) => l.filter((x) => x._id !== productId))
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">My wishlist</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {list.length} saved product{list.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link to="/products" className="link-quiet text-sm">
          Continue shopping →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {list.map((p) => (
          <div key={p._id} className="card card-hover group flex flex-col overflow-hidden">
            <Link to={`/products/${p._id}`} className="relative block aspect-[4/5] overflow-hidden bg-charcoal-100">
              {p.images?.length ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-brand-300">
                  <IconShirt width={40} height={40} />
                </span>
              )}
              {p.discount > 0 && (
                <span className="absolute left-3 top-3 rounded bg-accent-500 px-2 py-1 text-[10px] font-bold text-brand-900">
                  {p.discount}% off
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  remove(p._id)
                }}
                aria-label="Remove from wishlist"
                title="Remove from wishlist"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-brand-200 bg-white/95 text-gray-500 shadow-sm transition hover:text-red-500"
              >
                <IconClose width={14} height={14} />
              </button>
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link to={`/products/${p._id}`} className="line-clamp-2 text-sm font-semibold text-brand-900">
                {p.name}
              </Link>
              {p.seller?.storeName && (
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-brand-500">
                  <IconStore width={12} height={12} className="text-accent-600" /> {p.seller.storeName}
                </p>
              )}
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm font-extrabold text-brand-900">{formatINR(p.finalPrice)}</span>
                {p.discount > 0 && (
                  <span className="text-xs text-gray-400 line-through">{formatINR(p.price)}</span>
                )}
              </div>
              {p.stock === 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-red-600">Out of stock</p>
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-emerald-700">In stock</p>
              )}
              <div className="mt-auto flex gap-2 pt-3">
                <button
                  onClick={() => moveToCart(p)}
                  disabled={p.stock === 0}
                  className="btn-primary btn-sm flex-1"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
