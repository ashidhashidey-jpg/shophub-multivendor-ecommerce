import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerProducts, apiDeleteProduct } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, StatusBadge } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function SellerProductsPage() {
  const dispatch = useDispatch()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = () =>
    apiSellerProducts().then((res) => setProducts(res.data.data.products))

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">My products</h1>
        <Link to="/seller/products/create" className="btn-primary">
          + New product
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-14 text-center">
            <p className="text-gray-500">No products available yet.</p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p._id} className="card flex items-center gap-4 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-brand-100">
                {p.images?.length ? (
                  <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">🛍️</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {formatINR(p.finalPrice)} · {p.stock} in stock
                </p>
                {p.rejectionReason && (
                  <p className="text-xs text-red-600">Rejection reason: {p.rejectionReason}</p>
                )}
              </div>
              <StatusBadge status={p.status} />
              {!p.isActive && <span className="text-xs text-red-500">Disabled</span>}
              <div className="flex gap-2">
                <Link to={`/seller/products/${p._id}/edit`} className="btn-secondary btn-sm">
                  Edit
                </Link>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiDeleteProduct(p._id)
                      dispatch(toastSuccess('Product removed'))
                      setProducts((list) => list.map((x) => (x._id === p._id ? res.data.data.product : x)))
                    } catch (e) {
                      dispatch(toastError(getErrorMessage(e)))
                    }
                  }}
                  className="btn-sm border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}