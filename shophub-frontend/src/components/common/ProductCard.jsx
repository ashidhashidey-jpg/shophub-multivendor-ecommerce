import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { formatINR } from '../../utils/format'
import { useWishlist } from '../../store/wishlist-context'

export default function ProductCard({ product }) {
  const p = product
  const user = useSelector((s) => s.auth.user)
  const { isInWishlist, toggle, busy } = useWishlist()

  const inWishlist = isInWishlist(p._id)

  const toggleWishlist = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(p._id)
  }

  return (
    <Link
      to={`/products/${p._id}`}
      className="card card-hover group relative flex flex-col overflow-hidden"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-brand-50">
        {p.images?.length ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-4xl grayscale">🛍️</span>
        )}
        {p.discount > 0 && (
          <span className="status-pill absolute left-3 top-3 bg-accent-500 text-white">
            {p.discount}% off
          </span>
        )}
        {user?.role === 'USER' && (
          <button
            type="button"
            onClick={toggleWishlist}
            disabled={busy === String(p._id)}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-brand-100 bg-white shadow-sm transition disabled:opacity-50 hover:shadow ${
              inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            {inWishlist ? '♥' : '♡'}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-700">{p.name}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">{p.category?.name || '—'}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-lg font-bold text-brand-900">{formatINR(p.finalPrice)}</span>
          {p.discount > 0 && <span className="text-sm text-gray-400 line-through">{formatINR(p.price)}</span>}
        </div>
        {typeof p.stock === 'number' && p.stock <= 5 && p.stock > 0 && (
          <p className="mt-1 text-xs font-medium text-amber-600">Only {p.stock} left</p>
        )}
        {p.stock === 0 && <p className="mt-1 text-xs font-medium text-red-500">Out of stock</p>}
      </div>
    </Link>
  )
}