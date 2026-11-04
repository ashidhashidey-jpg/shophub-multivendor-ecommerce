import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiSellerStatus } from '../../api/endpoints'
import Loader from './Loader'

export default function ApprovedSellerRoute({ children }) {
  const [status, setStatus] = useState(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    apiSellerStatus()
      .then((res) => setStatus(res.data.data.seller?.status ?? null))
      .catch(() => setStatus(null))
      .finally(() => setDone(true))
  }, [])

  if (!done) return <Loader />
  if (status !== 'APPROVED') return <Navigate to="/seller/pending" replace />
  return children
}