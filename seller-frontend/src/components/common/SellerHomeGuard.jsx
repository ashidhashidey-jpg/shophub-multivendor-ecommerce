import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { apiSellerStatus } from '../../api/endpoints'
import Loader from './Loader'

// The seller application's root route. Approved sellers are routed to their
// dashboard; applicants (PENDING/REJECTED/SUSPENDED) and users with no
// application land on the status page. Guests are asked to sign in.
export default function SellerHomeGuard() {
  const { user, token } = useSelector((s) => s.auth)
  const [status, setStatus] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token || !user) {
      setDone(true)
      return
    }
    apiSellerStatus()
      .then((res) => setStatus(res.data.data.seller?.status ?? null))
      .catch(() => setStatus(null))
      .finally(() => setDone(true))
  }, [token, user])

  if (!done) return <Loader />
  if (!token || !user) return <Navigate to="/login" replace />
  if (status === 'APPROVED') return <Navigate to="/seller/dashboard" replace />
  return <Navigate to="/seller/pending" replace />
}