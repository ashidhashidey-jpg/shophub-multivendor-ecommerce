import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerStatus } from '../../api/endpoints'
import Loader from '../../components/common/Loader'
import {
  IconStore,
  IconCheck,
  IconClose,
  IconShield,
  IconArrow,
} from '../../components/common/icons'

export default function SellerPendingPage() {
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiSellerStatus()
      .then((res) => setSeller(res.data.data.seller))
      .catch(() => setSeller(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  const status = seller?.status

  if (!seller) {
    return (
      <StatusShell
        icon={IconStore}
        tone="neutral"
        eyebrow="Seller programme"
        title="No seller application yet"
        message="Submit your store details to apply. An admin reviews every application before a store goes live."
        action={
          <Link to="/seller/register" className="btn-primary">
            Become a seller <IconArrow width={16} height={16} />
          </Link>
        }
      />
    )
  }

  if (status === 'APPROVED') {
    return (
      <StatusShell
        icon={IconCheck}
        tone="success"
        eyebrow="Approved"
        title="Your store is approved"
        message="You can now manage products, orders and returns from your seller dashboard."
        action={
          <Link to="/seller/dashboard" className="btn-primary">
            Go to dashboard <IconArrow width={16} height={16} />
          </Link>
        }
      />
    )
  }

  if (status === 'SUSPENDED') {
    return (
      <StatusShell
        icon={IconClose}
        tone="danger"
        eyebrow="Account suspended"
        title="Your store has been suspended"
        message="Your selling privileges have been revoked. Contact support if you believe this is an error."
        detail={seller.suspendedReason ? `Reason: ${seller.suspendedReason}` : null}
      />
    )
  }

  if (status === 'REJECTED') {
    return (
      <StatusShell
        icon={IconClose}
        tone="danger"
        eyebrow="Application rejected"
        title="Your application was not approved"
        message="Review the reason below, update your details, and submit a new application."
        detail={seller.rejectedReason ? `Reason: ${seller.rejectedReason}` : null}
        action={
          <Link to="/seller/register" className="btn-primary">
            Reapply <IconArrow width={16} height={16} />
          </Link>
        }
      />
    )
  }

  return (
    <StatusShell
      icon={IconShield}
      tone="pending"
      eyebrow="Application received"
      title="Your application is under review"
      message={`Your seller application is currently ${status || 'PENDING'}. You will get access to the seller dashboard once an admin approves it.`}
      detail="No action is needed right now. You can check back here at any time."
    />
  )
}

function StatusShell({ icon: Icon, tone, eyebrow, title, message, detail, action }) {
  const tones = {
    neutral: 'bg-charcoal-100 text-charcoal-600',
    success: 'bg-emerald-100 text-emerald-700',
    danger: 'bg-charcoal-100 text-charcoal-600',
    pending: 'bg-charcoal-100 text-charcoal-500',
  }

  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-xl rounded-2xl border border-charcoal-200 bg-warm-ivory p-8 text-center shadow-sm sm:p-10">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${tones[tone] || tones.neutral}`}>
          <Icon width={28} height={28} />
        </span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-400">{eyebrow}</p>
        <h1 className="mt-1 font-display text-3xl text-charcoal-900">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-charcoal-500">{message}</p>
        {detail && (
          <p className="mx-auto mt-4 max-w-md rounded-lg bg-charcoal-50 px-4 py-3 text-sm text-charcoal-400">
            {detail}
          </p>
        )}
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}
