import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { apiAdminSeller, apiAdminSellerAction, apiAdminProducts } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate, StatusBadge, formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'

export default function AdminSellerDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiAdminSeller(id), apiAdminProducts({ seller: id })])
      .then(([s, p]) => {
        setSeller(s.data.data.seller)
        setProducts(p.data.data.products)
      })
      .catch(() => setSeller(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />
  if (!seller) return <p className="page-container py-16 text-center text-gray-500">Seller not found.</p>

  const act = async (action, label) => {
    try {
      const res = await apiAdminSellerAction(seller._id, action)
      dispatch(toastSuccess(label))
      setSeller(res.data.data.seller)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    }
  }

  return (
    <div className="page-container fade-in max-w-3xl py-8">
      <Link to="/admin/sellers" className="text-sm text-brand-600 hover:underline">
        ← All sellers
      </Link>
      <div className="card mt-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="page-title">{seller.storeName}</h1>
            <p className="mt-1 text-sm text-gray-500">{seller.user?.email} · applied {formatDate(seller.createdAt)}</p>
          </div>
          <StatusBadge status={seller.status} />
        </div>
        <p className="mt-3 text-sm text-gray-600">{seller.storeDescription}</p>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="section-label">Phone</dt>
            <dd className="mt-1 text-gray-900">{seller.phone}</dd>
          </div>
          <div>
            <dt className="section-label">Address</dt>
            <dd className="mt-1 text-gray-900">{seller.address}</dd>
          </div>
          <div>
            <dt className="section-label">Approved</dt>
            <dd className="mt-1 text-gray-900">{seller.approvedAt ? formatDate(seller.approvedAt) : 'Not yet'}</dd>
          </div>
        </dl>

        {seller.status === 'REJECTED' && seller.rejectedReason && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Reason: {seller.rejectedReason}</p>
        )}
        {seller.status === 'SUSPENDED' && seller.suspendedReason && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Reason: {seller.suspendedReason}
          </p>
        )}

        <div className="mt-5">
          <p className="section-title">KYC documents</p>
          {seller.kycDocuments?.length ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {seller.kycDocuments.map((doc, i) => (
                <a
                  key={i}
                  href={doc.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:border-brand-400 hover:text-brand-700"
                >
                  <span>
                    {doc.documentType}
                    {doc.documentNumber ? ` · ${doc.documentNumber}` : ''}
                  </span>
                  <span className="text-xs text-brand-600">View →</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No documents submitted.</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {seller.status === 'PENDING' && (
            <>
              <button onClick={() => act('approve', 'Approved')} className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Approve</button>
              <button onClick={() => act('reject', 'Rejected')} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Reject</button>
            </>
          )}
          {seller.status === 'APPROVED' && (
            <button onClick={() => act('suspend', 'Suspended')} className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Suspend</button>
          )}
          {seller.status === 'SUSPENDED' && (
            <button onClick={() => act('reactivate', 'Reactivated')} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Reactivate</button>
          )}
        </div>
      </div>

      <h2 className="section-title mt-6">Products</h2>
      <div className="mt-2 space-y-2">
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No products.</p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p._id} className="card flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">{p.name}</p>
                <p className="text-gray-500">{formatINR(p.price)} · {p.stock} stock</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}