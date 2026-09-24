import { useEffect, useState } from 'react'
import { apiAdminDashboard } from '../../api/endpoints'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminDashboardPage() {
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiAdminDashboard()
      .then((res) => setDash(res.data.data.dashboard))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (!dash) return <p className="page-container py-16 text-center text-gray-500">Dashboard unavailable.</p>

  const stats = [
    { label: 'Users', value: dash.totalUsers },
    { label: 'Sellers', value: dash.totalSellers },
    { label: 'Pending sellers', value: dash.pendingSellerApprovals },
    { label: 'Products', value: dash.totalProducts },
    { label: 'Pending products', value: dash.pendingProductApprovals },
    { label: 'Orders', value: dash.totalOrders },
    { label: 'Pending refunds', value: dash.pendingRefunds },
    { label: 'Revenue', value: formatINR(dash.totalRevenue) },
  ]

  return (
    <div className="page-container fade-in py-8">
      <h1 className="page-title">Admin dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}