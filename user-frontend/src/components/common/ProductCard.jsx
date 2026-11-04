import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { formatINR } from '../../utils/format'
import { useWishlist } from '../../store/wishlist-context'
import { IconHeart, IconShirt, IconStore } from './icons'

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

  const lowStock = typeof p.stock === 'number' && p.stock <= 5 && p.stock > 0

  return (
    <Link
      to={`/products/${p._id}`}
      className="card card-hover group relative flex flex-col overflow-hidden"
    >
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-brand-50">
        {p.images?.length ? (
          <img
            src={p.images[0]}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-brand-300">
            <IconShirt width={44} height={44} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">ShopHub</span>
          </div>
        )}

        {p.discount > 0 && (
          <span className="absolute left-3 top-3 rounded bg-accent-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-900">
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
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-brand-200 bg-white/95 shadow-sm backdrop-blur transition disabled:opacity-50 hover:shadow ${
              inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
          >
            <IconHeart filled={inWishlist} width={16} height={16} />
          </button>
        )}

        {p.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
            <span className="rounded bg-brand-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-400">
          {p.category?.name || 'Marketplace'}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-gray-900 transition-colors group-hover:text-brand-600">
          {p.name}
        </p>
        {p.seller?.storeName && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-brand-500">
            <IconStore width={12} height={12} className="shrink-0 text-accent-600" />
            {p.seller.storeName}
          </p>
        )}

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-base font-extrabold tracking-tight text-brand-900">{formatINR(p.finalPrice)}</span>
            {p.discount > 0 && <span className="text-xs text-gray-400 line-through">{formatINR(p.price)}</span>}
          </div>
          {lowStock && <p className="mt-1 text-[11px] font-semibold text-amber-700">Only {p.stock} left</p>}
          {p.stock === 0 && <p className="mt-1 text-[11px] font-semibold text-red-600">Currently unavailable</p>}
        </div>
      </div>
    </Link>
  )
}
