import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerStatus } from '../../api/endpoints'
import Loader from '../../components/common/Loader'

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
      <div className="page-container max-w-xl py-16 text-center">
        <h1 className="page-title">No seller application yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          You have not applied to become a seller. Submit your store details to get started.
        </p>
        <Link to="/seller/register" className="btn-primary mt-5">
          Become a seller
        </Link>
      </div>
    )
  }

  if (status === 'APPROVED') {
    return (
      <div className="page-container max-w-xl py-16 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-green-700">Your store is approved!</h1>
        <p className="mt-2 text-gray-600">You can now manage products and orders.</p>
        <Link to="/seller/dashboard" className="btn-primary mt-5">
          Go to dashboard
        </Link>
      </div>
    )
  }

  if (status === 'SUSPENDED') {
    return (
      <div className="page-container max-w-xl rounded-xl border border-red-200 bg-red-50 py-16 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-red-700">Your store has been suspended</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your selling privileges have been revoked. Contact support if you believe this is an error.
        </p>
        {seller?.suspendedReason ? (
          <p className="mt-4 rounded-md bg-white px-3 py-2 text-sm text-red-700">
            Reason: {seller.suspendedReason}
          </p>
        ) : null}
      </div>
    )
  }

  if (status === 'REJECTED') {
    return (
      <div className="page-container max-w-xl rounded-xl border border-red-200 bg-red-50 py-16 text-center">
        <h1 className="text-xl font-extrabold tracking-tight text-red-700">Application rejected</h1>
        {seller?.rejectedReason ? (
          <p className="mt-2 text-sm text-gray-600">Reason: {seller.rejectedReason}</p>
        ) : null}
        <Link to="/seller/register" className="btn-primary mt-5">
          Reapply
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container max-w-xl py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-200 bg-brand-100 text-2xl">
        ⏳
      </div>
      <h1 className="page-title">Application under review</h1>
      <p className="mt-2 text-sm text-gray-600">
        Your seller application is <strong>{status || 'PENDING'}</strong>. You will get access to your store dashboard once an
        admin approves it.
      </p>
    </div>
  )
}
