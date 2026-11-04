import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  apiGetCart,
  apiUpdateCartItem,
  apiRemoveCartItem,
  apiClearCart,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { setCartCount } from '../../store/slices/uiSlice'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconBag, IconShirt, IconPlus, IconMinus, IconArrowLeft, IconShield, IconTruck, IconRefresh } from '../../components/common/icons'

export default function CartPage() {
  const dispatch = useDispatch()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const applyCart = (res) => {
    const c = res.data.data.cart
    setCart(c)
    dispatch(setCartCount(c.items.length))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    apiGetCart()
      .then((res) => {
        if (!cancelled) applyCart(res)
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e, 'Could not load your cart'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <Loader />

  if (error) {
    return (
      <div className="page-container py-16">
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  const refresh = async () => {
    const res = await apiGetCart()
    applyCart(res)
  }

  const updateQty = async (item, delta) => {
    const qty = item.quantity + delta
    if (qty < 1) return
    try {
      await apiUpdateCartItem(item.productId, qty)
      await refresh()
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const remove = async (productId, itemName) => {
    try {
      await apiRemoveCartItem(productId)
      await refresh()
      dispatch(toastSuccess(`${itemName || 'Item'} removed`))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  const clearCart = async () => {
    try {
      await apiClearCart()
      await refresh()
      dispatch(toastSuccess('Cart cleared'))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page-container py-16">
        <div className="mt-6">
          <EmptyState
            icon={IconBag}
            title="Your cart is empty"
            message="Browse the marketplace and add something you love."
            actionTo="/products"
            actionLabel="Start shopping"
          />
        </div>
      </div>
    )
  }

  const { items, totals } = cart

  return (
    <div className="page-container fade-in py-8">
      <nav className="text-xs text-charcoal-400">
        <Link to="/" className="hover:text-charcoal-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-charcoal-600">Cart</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Shopping cart</h1>
        <p className="text-sm text-charcoal-500">
          {totals.itemCount} item{totals.itemCount > 1 ? 's' : ''} · {totals.totalQuantity} unit
          {totals.totalQuantity > 1 ? 's' : ''}
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="card divide-y divide-charcoal-200 overflow-hidden">
          {items.map((item) => (
            <div key={item.productId} className={`flex gap-4 p-4 sm:p-5 ${item.availability ? '' : 'opacity-80'}`}>
              <Link
                to={`/products/${item.productId}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-charcoal-100 sm:h-28 sm:w-28"
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <IconShirt className="text-brand-300" width={28} height={28} />
                  </div>
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/products/${item.productId}`}
                        className="line-clamp-2 text-sm font-semibold text-charcoal-900 hover:text-charcoal-600"
                      >
                        {item.name}
                      </Link>
                      {!item.availability && (
                        <span className="status-pill bg-charcoal-100 text-charcoal-500">Unavailable</span>
                      )}
                    </p>
                    {item.seller && (
                      <p className="mt-1 text-xs text-brand-500">Sold by {item.seller.storeName || 'Unknown store'}</p>
                    )}
                    <p className="mt-2 flex items-baseline gap-2 text-sm">
                      <span className="font-bold text-charcoal-800">{formatINR(item.finalPrice)}</span>
                      {item.finalPrice < item.price && (
                        <span className="text-xs text-gray-400 line-through">{formatINR(item.price)}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-brand-400">{item.stock} available</p>
                  </div>
                  <div className="shrink-0 text-right font-semibold text-brand-900">
                    {item.availability ? formatINR(item.lineTotal) : '—'}
                  </div>
                </div>

                {!item.availability && item.unavailableReason && (
                  <p className="mt-1 text-xs text-amber-700">{item.unavailableReason}</p>
                )}

                {item.availability && (
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
                    <div className="inline-flex items-center rounded-md border border-charcoal-200">
                      <button
                        onClick={() => updateQty(item, -1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                        title="Decrease quantity"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-charcoal-200 bg-charcoal-50 text-charcoal-400 hover:bg-charcoal-100 transition-colors disabled:opacity-30"
                      >
                        <IconMinus width={13} height={13} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item, +1)}
                        disabled={item.quantity >= item.stock}
                        aria-label="Increase quantity"
                        title="Increase quantity"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-charcoal-200 bg-charcoal-50 text-charcoal-400 hover:bg-charcoal-100 transition-colors disabled:opacity-30"
                      >
                        <IconPlus width={13} height={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(item.productId, item.name)}
                      className="text-xs font-medium text-charcoal-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-charcoal-50 px-4 py-3">
            <Link to="/products" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-900 hover:text-accent-700">
              <IconArrowLeft width={14} height={14} /> Continue shopping
            </Link>
            <button onClick={clearCart} className="text-xs font-medium text-brand-500 hover:text-red-600">
              Clear cart
            </button>
          </div>
        </div>

        <div className="card h-fit p-5 lg:sticky lg:top-40">
          <h2 className="section-title">Order summary</h2>
          <div className="mt-4 space-y-2.5 text-sm text-charcoal-500">
            <div className="flex justify-between">
              <span className="text-charcoal-400">Subtotal</span>
              <span className="text-charcoal-800">{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Discount</span>
              <span className="font-medium text-charcoal-600">−{formatINR(totals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-400">Shipping</span>
              <span className="font-medium text-charcoal-600">Free</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-charcoal-200 pt-4 text-base font-bold text-charcoal-800">
            <span className="text-charcoal-400">Total</span>
            <span className="text-charcoal-800">{formatINR(totals.total)}</span>
          </div>
          <Link to="/checkout" className="btn-primary mt-5 w-full">
            Proceed to checkout
          </Link>
          <div className="mt-5 space-y-2 border-t border-brand-100 pt-4 text-[11px] text-brand-500">
            <p className="flex items-center gap-2">
              <IconTruck width={14} height={14} className="text-accent-700" /> Delivery details confirmed at checkout
            </p>
            <p className="flex items-center gap-2">
              <IconShield width={14} height={14} className="text-accent-700" /> Server-verified payment
            </p>
            <p className="flex items-center gap-2">
              <IconRefresh width={14} height={14} className="text-accent-700" /> Returns via your order page
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
