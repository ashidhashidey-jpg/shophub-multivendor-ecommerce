import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { apiGetWishlist, apiRemoveWishlist, apiAddCart } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function WishlistPage() {
  const dispatch = useDispatch()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGetWishlist()
      .then((res) => setList(res.data.data.wishlist.products))
      .catch((e) => setError(getErrorMessage(e, 'Could not load your wishlist')))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  if (error) {
    return (
      <div className="page-container py-16">
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-lg text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="page-container py-16">
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-lg text-gray-600">Your wishlist is empty.</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  const moveToCart = async (p) => {
    try {
      await apiAddCart(p._id, 1)
      dispatch(toastSuccess('Moved to cart'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const remove = async (productId) => {
    try {
      await apiRemoveWishlist(productId)
      setList((l) => l.filter((x) => x._id !== productId))
      dispatch(toastSuccess('Removed from wishlist'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">My wishlist</h1>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <div key={p._id} className="card card-hover flex flex-col p-4">
            <Link to={`/products/${p._id}`}>
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg bg-brand-50">
                {p.images?.length ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl">🛍️</span>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium text-gray-900">{p.name}</p>
              <p className="text-sm text-gray-600">
                {formatINR(p.finalPrice)}
                {p.discount > 0 && <span className="ml-1 text-xs text-gray-400 line-through">{formatINR(p.price)}</span>}
              </p>
              {p.stock === 0 ? (
                <p className="mt-1 text-xs font-medium text-red-500">Out of stock</p>
              ) : (
                <p className="mt-1 text-xs font-medium text-green-600">In stock</p>
              )}
            </Link>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => moveToCart(p)}
                disabled={p.stock === 0}
                className="btn-primary btn-sm flex-1"
              >
                Add to cart
              </button>
              <button
                onClick={() => remove(p._id)}
                aria-label="Remove from wishlist"
                title="Remove from wishlist"
                className="btn-sm border border-brand-200 bg-white text-gray-600 hover:bg-brand-50"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}