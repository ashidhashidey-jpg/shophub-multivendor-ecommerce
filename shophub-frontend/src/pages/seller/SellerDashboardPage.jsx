import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiSellerDashboard } from '../../api/endpoints'
import { formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function SellerDashboardPage() {
  const [dash, setDash] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiSellerDashboard()
      .then((res) => setDash(res.data.data.dashboard))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (!dash) return <p className="page-container py-16 text-center text-gray-500">Dashboard unavailable.</p>

  const stats = [
    { label: 'Total products', value: dash.totalProducts },
    { label: 'Pending orders', value: dash.pendingOrders },
    { label: 'Delivered', value: dash.completedOrders },
    { label: 'Total sales', value: formatINR(dash.totalSales) },
    { label: 'Total earnings', value: formatINR(dash.totalEarnings) },
    { label: 'Total orders', value: dash.totalOrders },
    { label: 'Pending returns', value: dash.pendingReturns },
  ]

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Store dashboard</h1>
        <Link to="/seller/products/create" className="btn-primary">
          + New product
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="section-label">{s.label}</p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
