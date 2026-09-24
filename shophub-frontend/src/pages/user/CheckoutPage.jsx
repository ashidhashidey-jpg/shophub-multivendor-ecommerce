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
        name: 'Shophub',
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
        theme: { color: '#0284c7' },
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
        <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
          <p className="text-lg text-gray-600">{error}</p>
          <Link to="/products" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  if (!summary || !summary.items || summary.items.length === 0) {
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

  const { items, totals } = summary
  const hasAddress = Boolean(selectedAddress)

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Checkout</h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card space-y-6 p-6">
          <section>
            <h2 className="section-title">Delivery address</h2>
            {addresses.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No saved addresses yet.{' '}
                <Link to="/addresses" className="text-brand-600 hover:underline">
                  Add one
                </Link>
              </p>
            ) : (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {addresses.map((a) => (
                  <label
                    key={a._id}
                    className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                      selectedAddress === a._id ? 'border-brand-600 bg-brand-50' : 'border-brand-200 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      className="mr-2"
                      checked={selectedAddress === a._id}
                      onChange={() => changeAddress(a._id)}
                    />
                    <span className="font-medium">{a.name}</span>
                    {a.isDefault && (
                      <span className="status-pill ml-1 bg-brand-100 text-brand-700">Default</span>
                    )}
                    <span className="block text-gray-600">
                      {a.addressLine1}, {a.city} {a.postalCode}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="section-title">Payment method</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                  method === 'RAZORPAY' ? 'border-brand-600 bg-brand-50' : 'border-brand-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  className="mr-2"
                  checked={method === 'RAZORPAY'}
                  onChange={() => {
                    setMethod('RAZORPAY')
                    setPaymentNote('')
                  }}
                />
                <span className="font-medium">Cards / UPI / Netbanking</span>
                <span className="block text-gray-600">Secure online payment via Razorpay</span>
              </label>
              <label
                className={`cursor-pointer rounded-lg border p-3 text-sm transition ${
                  method === 'COD' ? 'border-brand-600 bg-brand-50' : 'border-brand-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  className="mr-2"
                  checked={method === 'COD'}
                  onChange={() => {
                    setMethod('COD')
                    setPaymentNote('')
                  }}
                />
                <span className="font-medium">Cash on Delivery</span>
                <span className="block text-gray-600">Pay when your order arrives</span>
              </label>
            </div>
          </section>

          <section>
            <h2 className="section-title">Items</h2>
            <ul className="mt-2 divide-y divide-brand-100">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {i.name} × {i.quantity}
                    </p>
                    {i.seller && <p className="text-xs text-gray-500">Sold by {i.seller.storeName}</p>}
                  </div>
                  <div className="shrink-0">
                    <p className="text-right font-medium text-gray-900">{formatINR(i.lineTotal)}</p>
                    <p className="text-right text-xs text-gray-400">{formatINR(i.finalPrice)} each</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
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

          <button
            onClick={proceed}
            disabled={!hasAddress || placing}
            className="btn-primary mt-4 w-full"
          >
            {placing
              ? method === 'RAZORPAY'
                ? 'Opening payment…'
                : 'Placing order…'
              : method === 'RAZORPAY'
                ? 'Pay Now'
                : 'Place Order (COD)'}
          </button>

          {!hasAddress && (
            <p className="mt-2 text-center text-xs text-gray-400">Select a delivery address first.</p>
          )}

          {paymentNote && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{paymentNote}</p>
          )}

          <p className="mt-2 text-center text-xs text-gray-400">
            Your order is only confirmed after the payment is verified by the server.
          </p>
        </div>
      </div>
    </div>
  )
}