export const formatINR = (value = 0) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const orderStatusClasses = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-brand-100 text-brand-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800',
  RETURNED: 'bg-teal-100 text-teal-800',
  REFUND_PENDING: 'bg-purple-100 text-purple-800',
  REFUNDED: 'bg-indigo-100 text-indigo-800',
}

export const paymentStatusClasses = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUND_PENDING: 'bg-purple-100 text-purple-800',
  REFUND_FAILED: 'bg-red-100 text-red-800',
  PARTIALLY_REFUNDED: 'bg-teal-100 text-teal-800',
  REFUNDED: 'bg-indigo-100 text-indigo-800',
}

export const StatusBadge = ({ status }) => (
  <span className={`status-pill ${orderStatusClasses[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
)

export const PaymentBadge = ({ status }) => (
  <span className={`status-pill ${paymentStatusClasses[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
)