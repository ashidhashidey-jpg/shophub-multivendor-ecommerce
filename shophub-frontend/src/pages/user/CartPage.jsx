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

export default function CartPage() {
  const dispatch = useDispatch()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const res = await apiGetCart()
    setCart(res.data.data.cart)
    dispatch(setCartCount(res.data.data.cart.items.length))
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

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

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page-container py-16">
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-lg text-gray-600">No items in your cart.</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  const { items, totals } = cart

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Shopping cart</h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card divide-y divide-brand-100 overflow-hidden">
          {items.map((item) => (
            <div key={item.productId} className={`flex gap-4 p-4 ${item.availability ? '' : 'opacity-80'}`}>
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🛍️</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {item.name}
                  {!item.availability && (
                    <span className="status-pill ml-2 bg-amber-100 text-amber-700">
                      Unavailable
                    </span>
                  )}
                </p>
                {item.seller && (
                  <p className="text-xs text-gray-500">Store: {item.seller.storeName || 'Unknown store'}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formatINR(item.finalPrice)} each
                  {item.finalPrice < item.price && (
                    <span className="ml-2 text-xs line-through text-gray-400">{formatINR(item.price)}</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{item.stock} in stock</p>
                {!item.availability && item.unavailableReason && (
                  <p className="mt-1 text-xs text-amber-600">{item.unavailableReason}</p>
                )}
                {item.availability && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item, -1)}
                      aria-label="Decrease quantity"
                      title="Decrease quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-200 bg-white text-sm transition-colors hover:bg-brand-50"
                    >
                      −
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item, +1)}
                      disabled={item.quantity >= item.stock}
                      aria-label="Increase quantity"
                      title="Increase quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-200 bg-white text-sm transition-colors hover:bg-brand-50 disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      onClick={() => remove(item.productId, item.name)}
                      aria-label="Remove item"
                      className="ml-3 text-sm text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="text-right font-semibold text-gray-900">
                {item.availability ? formatINR(item.lineTotal) : '—'}
              </div>
            </div>
          ))}
        </div>

        <div className="card h-fit p-5">
          <h2 className="section-title">Order summary</h2>
          <div className="mt-3 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-green-600">−{formatINR(totals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-brand-100 pt-3 font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {totals.itemCount} item{totals.itemCount > 1 ? 's' : ''} · {totals.totalQuantity} units
          </p>
          <Link to="/checkout" className="btn-primary mt-4 w-full">
            Checkout
          </Link>
          <button
            onClick={async () => {
              await apiClearCart()
              await refresh()
            }}
            className="btn-secondary mt-2 w-full"
          >
            Clear cart
          </button>
        </div>
      </div>
    </div>
  )
}