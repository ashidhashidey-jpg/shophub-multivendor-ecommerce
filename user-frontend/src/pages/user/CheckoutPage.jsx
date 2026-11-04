import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  apiCheckoutSummary,
  apiAddresses,
  apiGetCart,
  apiCreatePaymentOrder,
  apiVerifyPayment,
  apiPlaceOrder,
} from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { setCartCount } from '../../store/slices/uiSlice'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'
import {
  IconMapPin,
  IconCreditCard,
  IconTruck,
  IconShield,
  IconPackage,
  IconPlus,
  IconChevronRight,
} from '../../components/common/icons'

const RAZORPAY_CHECKOUT_JS = 'https://checkout.razorpay.com/v1/checkout.js'
let checkoutScriptPromise = null

const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay)
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = RAZORPAY_CHECKOUT_JS
      script.onload = () =>
        window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay checkout failed to load'))
      script.onerror = () => {
        checkoutScriptPromise = null
        reject(new Error('Could not load the Razorpay checkout. Check your connection and try again.'))
      }
      document.body.appendChild(script)
    })
  }
  return checkoutScriptPromise
}

const SectionHeading = ({ step, title, description }) => (
  <div className="flex items-start gap-3">
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-charcoal-600 text-xs font-bold text-charcoal-50">
      {step}
    </span>
    <div>
      <h2 className="text-base font-bold text-charcoal-800">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-charcoal-400">{description}</p>}
    </div>
  </div>
)

export default function CheckoutPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [method, setMethod] = useState('RAZORPAY')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')

  const loadSummary = async (addressId) => {
    const res = await apiCheckoutSummary(addressId || undefined)
    setSummary(res.data.data)
    if (res.data.data.address) setSelectedAddress(res.data.data.address._id)
    setError('')
  }

  useEffect(() => {
    ;(async () => {
      try {
        const [addr] = await Promise.all([apiAddresses(), loadSummary()])
        setAddresses(addr.data.data.addresses)
      } catch (err) {
        const msg = getErrorMessage(err, 'Could not load checkout summary')
        setError(msg)
        if (msg.toLowerCase().includes('cart is empty')) {
          try {
            const cart = await apiGetCart()
            dispatch(setCartCount(cart.data.data.cart.items.length))
          } catch {
            /* ignore */
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const changeAddress = async (id) => {
    setSelectedAddress(id)
    try {
      await loadSummary(id)
    } catch (err) {
      dispatch(toastError(getErrorMessage(err)))
    }
  }

  const onVerified = (result) => {
    dispatch(setCartCount(0))
    const purchase = result.data.data.order || result.data.data.purchase
    navigate(`/order-success?orderId=${purchase._id}&method=${method}`)
  }

  const payOnline = async () => {
    setPlacing(true)
    setPaymentNote('')
    try {
      const res = await apiCreatePaymentOrder(selectedAddress)
      const { razorpayOrderId, amountPaise, currency, keyId } = res.data.data

      if (!keyId) {
        setPaymentNote('Razorpay is not configured on this server yet. Please use Cash on Delivery.')
        setMethod('COD')
        return
      }

      setPaymentNote('Opening the payment window...')
      const Razorpay = await loadRazorpayCheckout()

      const options = {
        key: keyId,
        order_id: razorpayOrderId,
        amount: amountPaise,
        currency: currency || 'INR',
        name: 'ShopHub',
        description: 'Order checkout',
        image: undefined,
        handler: async (response) => {
          setPaymentNote('Verifying payment...')
          try {
            const verify = await apiVerifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            dispatch(toastSuccess('Payment verified. Your order is confirmed.'))
            onVerified(verify)
          } catch (err) {
            setPlacing(false)
            setPaymentNote('')
            dispatch(
              toastError(getErrorMessage(err, 'Payment received but it could not be confirmed. Your cart is unchanged.'))
            )
          }
        },
        modal: {
          onDismiss: () => {
            setPlacing(false)
            setPaymentNote('Payment was not completed. Your cart is unchanged — you can try again.')
          },
        },
        theme: { color: '#171717' },
      }

      const rzp = new Razorpay(options)
      rzp.on('payment.failed', (payload) => {
        setPlacing(false)
        setPaymentNote(
          `Payment failed: ${payload.error?.description || 'Gateway rejected the payment'}. Your cart is unchanged.`
        )
      })
      rzp.open()
    } catch (err) {
      setPlacing(false)
      setPaymentNote(getErrorMessage(err, 'Could not start payment. Please try again.'))
    }
  }

  const orderCOD = async () => {
    setPlacing(true)
    setPaymentNote('')
    try {
      const res = await apiPlaceOrder(selectedAddress, 'COD')
      dispatch(setCartCount(0))
      dispatch(toastSuccess('Order placed. Pay on delivery.'))
      navigate(`/order-success?orderId=${res.data.data.order._id}&method=COD`)
    } catch (err) {
      setPlacing(false)
      setPaymentNote(getErrorMessage(err, 'Could not place your order. Please try again.'))
    }
  }

  const proceed = () => {
    if (method === 'RAZORPAY') payOnline()
    else orderCOD()
  }

  if (loading) return <Loader />

  if (error) {
    return (
      <div className="page-container py-16">
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 py-14 text-center">
          <p className="text-lg text-gray-600">{error}</p>
          <Link to="/products" className="link-quiet mt-3 inline-block text-sm">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  if (!summary || !summary.items || summary.items.length === 0) {
    return (
      <div className="page-container py-16">
        <div className="rounded-2xl border border-dashed border-brand-300 bg-brand-50 py-14 text-center">
          <p className="text-lg text-gray-600">No items in your cart.</p>
          <Link to="/products" className="link-quiet mt-3 inline-block text-sm">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  const { items, totals } = summary
  const hasAddress = Boolean(selectedAddress)

  return (
    <div className="page-container fade-in py-8">
      <nav className="text-xs text-charcoal-400">
        <Link to="/" className="hover:text-brand-900">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/cart" className="hover:text-brand-900">
          Cart
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-brand-600">Checkout</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Checkout</h1>
          <p className="mt-1 text-sm text-charcoal-500">Confirm your delivery details and payment method.</p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-brand-500 sm:flex">
          <span className="font-semibold text-brand-900">Cart</span>
          <IconChevronRight width={13} height={13} />
          <span className="font-semibold text-brand-900">Checkout</span>
          <IconChevronRight width={13} height={13} />
          <span>Confirmation</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_370px] lg:items-start">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionHeading step="1" title="Delivery address" description="Choose where this order should be delivered." />
              <Link to="/addresses" className="text-xs font-semibold text-charcoal-600 hover:underline">
                Manage addresses
              </Link>
            </div>
            {addresses.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-charcoal-300 bg-charcoal-50 p-5 text-center">
                <p className="text-sm text-charcoal-400">No saved addresses yet.</p>
                <Link to="/addresses" className="btn-primary btn-sm mt-3">
                  <IconPlus width={13} height={13} /> Add an address
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <label
                    key={a._id}
                    className={`cursor-pointer rounded-xl border p-4 text-sm transition ${
                      selectedAddress === a._id
                        ? 'border-charcoal-300 bg-charcoal-50 ring-1 ring-charcoal-300'
                        : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="address"
                        className="mt-1 accent-charcoal-600"
                        checked={selectedAddress === a._id}
                        onChange={() => changeAddress(a._id)}
                      />
                      <div>
                        <p className="font-semibold text-charcoal-800">
                          {a.name}
                          {a.isDefault && (
                            <span className="status-pill ml-2 text-charcoal-300">Default</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-charcoal-400">
                          {a.addressLine1}
                          {a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city} {a.postalCode}, {a.country}
                        </p>
                        {a.phone && <p className="mt-1 text-[11px] text-charcoal-300">{a.phone}</p>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <SectionHeading step="2" title="Payment method" description="Online payments are verified by the server before confirmation." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border p-4 text-sm transition ${
                  method === 'RAZORPAY'
                    ? 'border-charcoal-300 bg-charcoal-50 ring-1 ring-charcoal-300'
                    : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="method"
                    className="mt-1 accent-charcoal-600"
                    checked={method === 'RAZORPAY'}
                    onChange={() => {
                      setMethod('RAZORPAY')
                      setPaymentNote('')
                    }}
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-charcoal-400">
                    <IconCreditCard width={16} height={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal-800">Cards / UPI / Netbanking</p>
                    <p className="mt-0.5 text-xs text-charcoal-400">Secure online payment via Razorpay</p>
                  </div>
                </div>
              </label>
              <label
                className={`cursor-pointer rounded-xl border p-4 text-sm transition ${
                  method === 'COD'
                    ? 'border-charcoal-300 bg-charcoal-50 ring-1 ring-charcoal-300'
                    : 'border-charcoal-200 bg-white hover:border-charcoal-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="method"
                    className="mt-1 accent-charcoal-600"
                    checked={method === 'COD'}
                    onChange={() => {
                      setMethod('COD')
                      setPaymentNote('')
                    }}
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-charcoal-400">
                    <IconTruck width={16} height={16} />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal-800">Cash on Delivery</p>
                    <p className="mt-0.5 text-xs text-charcoal-400">Pay when your order arrives</p>
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-charcoal-200 p-5 sm:p-6">
              <SectionHeading step="3" title="Review items" description={`${items.length} item${items.length === 1 ? '' : 's'} in this order.`} />
            </div>
            <ul className="divide-y divide-charcoal-200">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center gap-3 p-4 sm:px-6">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-charcoal-100">
                    {i.image ? (
                      <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-brand-300">
                        <IconPackage width={20} height={20} />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-charcoal-800">
                      {i.name} × {i.quantity}
                    </p>
                    {i.seller && <p className="text-xs text-charcoal-400">Sold by {i.seller.storeName}</p>}
                    <p className="text-[11px] text-charcoal-300">{formatINR(i.finalPrice)} each</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-brand-900">{formatINR(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="card h-fit p-5 lg:sticky lg:top-40">
          <h2 className="section-title">Order summary</h2>
          <div className="mt-4 space-y-2.5 text-sm text-charcoal-400">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="font-medium text-emerald-700">−{formatINR(totals.discount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="font-medium text-emerald-700">Free</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-charcoal-200 pt-4 text-base font-bold text-charcoal-800">
            <span>Total</span>
            <span>{formatINR(totals.total)}</span>
          </div>

          <button onClick={proceed} disabled={!hasAddress || placing} className="btn-primary mt-5 w-full">
            {placing
              ? method === 'RAZORPAY'
                ? 'Opening payment…'
                : 'Placing order…'
              : method === 'RAZORPAY'
                ? 'Pay now'
                : 'Place order (COD)'}
          </button>

          {!hasAddress && (
            <p className="mt-2 text-center text-xs text-amber-700">Select a delivery address first.</p>
          )}

          {paymentNote && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{paymentNote}</p>
          )}

          <div className="mt-4 space-y-1.5 border-t border-brand-100 pt-4 text-[11px] text-brand-500">
            <p className="flex items-center gap-2">
              <IconShield width={13} height={13} className="text-accent-700" /> Your order is confirmed only after
              server verification.
            </p>
            <p className="flex items-center gap-2">
              <IconMapPin width={13} height={13} className="text-accent-700" /> Delivery to the selected address.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
