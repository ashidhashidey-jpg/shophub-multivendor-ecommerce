import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { apiAdminSeller, apiAdminSellerAction, apiAdminProducts } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatDate, StatusBadge, formatINR } from '../../utils/format'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import {
  IconArrowLeft,
  IconStore,
  IconPackage,
  IconCheck,
  IconClose,
  IconMapPin,
  IconShield,
} from '../../components/common/icons'

export default function AdminSellerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = async () => {
    setError('')
    try {
      const [s, p] = await Promise.all([apiAdminSeller(id), apiAdminProducts({ seller: id })])
      setSeller(s.data.data.seller)
      setProducts(p.data.data.products)
    } catch (e) {
      setSeller(null)
      setError(getErrorMessage(e, 'Seller not found'))
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loader />

  if (!seller) {
    return (
      <div className="page-container max-w-4xl py-8">
        <button
          onClick={() => navigate('/admin/sellers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
        >
          <IconArrowLeft width={14} height={14} /> Back to sellers
        </button>
        <div className="mt-6">
          <ErrorState icon={IconStore} message={error} onRetry={load} />
        </div>
      </div>
    )
  }

  const act = async (action, label, needsReason = false) => {
    let payload = {}
    if (needsReason) {
      const reason = window.prompt('Reason (shown to the seller):')
      if (reason === null) return
      if (!reason.trim()) {
        dispatch(toastError('A reason is required'))
        return
      }
      payload = { reason: reason.trim() }
    }
    setBusy(action)
    try {
      const res = await apiAdminSellerAction(seller._id, action, payload)
      dispatch(toastSuccess(label))
      setSeller(res.data.data.seller)
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="page-container max-w-4xl fade-in py-8">
      <button
        onClick={() => navigate('/admin/sellers')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-500 hover:text-brand-900"
      >
        <IconArrowLeft width={14} height={14} /> Back to sellers
      </button>

      <div className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-100 bg-brand-50/50 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {seller.storeImage ? (
              <img
                src={seller.storeImage}
                alt={seller.storeName}
                className="h-16 w-16 rounded-full border border-brand-200 object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-900 font-display text-2xl text-white">
                {(seller.storeName || 'S').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="page-title">{seller.storeName}</h1>
              <p className="mt-0.5 break-all text-sm text-brand-500">
                {seller.user?.email || seller.email || '—'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={seller.status} />
                <span
                  className={`status-pill ${
                    seller.kycSubmitted || seller.kycDocuments?.length
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  KYC {seller.kycSubmitted || seller.kycDocuments?.length ? 'submitted' : 'missing'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-brand-400">Applied {formatDate(seller.createdAt)}</p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm leading-6 text-brand-600">{seller.storeDescription || 'No description provided.'}</p>

          {seller.status === 'REJECTED' && seller.rejectedReason && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Rejection reason: {seller.rejectedReason}
            </p>
          )}
          {seller.status === 'SUSPENDED' && seller.suspendedReason && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Suspension reason: {seller.suspendedReason}
            </p>
          )}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Applicant</dt>
              <dd className="mt-1 text-sm font-semibold text-brand-900">{seller.user?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Phone</dt>
              <dd className="mt-1 text-sm text-brand-700">{seller.phone || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">
                <IconMapPin width={12} height={12} /> Business address
              </dt>
              <dd className="mt-1 text-sm text-brand-700">{seller.address || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Approved</dt>
              <dd className="mt-1 text-sm text-brand-700">
                {seller.approvedAt ? formatDate(seller.approvedAt) : 'Not yet'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-400">Products</dt>
              <dd className="mt-1 text-sm text-brand-700">{products.length}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-brand-100 pt-5">
            {seller.status === 'PENDING' && (
              <>
                <button
                  disabled={Boolean(busy)}
                  onClick={() => act('approve', 'Seller approved')}
                  className="btn-primary btn-sm disabled:opacity-50"
                >
                  <IconCheck width={14} height={14} /> Approve store
                </button>
                <button
                  disabled={Boolean(busy)}
                  onClick={() => act('reject', 'Seller rejected', true)}
                  className="btn-sm border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <IconClose width={14} height={14} /> Reject application
                </button>
              </>
            )}
            {seller.status === 'APPROVED' && (
              <button
                disabled={Boolean(busy)}
                onClick={() => act('suspend', 'Seller suspended', true)}
                className="btn-sm border border-red-200 px-3 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Suspend store
              </button>
            )}
            {seller.status === 'SUSPENDED' && (
              <button
                disabled={Boolean(busy)}
                onClick={() => act('reactivate', 'Seller reactivated')}
                className="btn-primary btn-sm disabled:opacity-50"
              >
                Reactivate store
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 section-title">
            <IconShield width={16} height={16} className="text-accent-700" /> KYC documents
          </h2>
          {seller.kycDocuments?.length ? (
            <div className="mt-3 space-y-2">
              {seller.kycDocuments.map((doc, i) => (
                <a
                  key={i}
                  href={doc.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-700 hover:border-brand-400"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{doc.documentType}</span>
                    <span className="block truncate text-xs text-brand-400">
                      {doc.documentNumber || 'No number provided'}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-brand-600">View →</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-4 py-6 text-center text-sm text-brand-500">
              No KYC documents submitted.
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Store products</h2>
            <Link to="/admin/products" className="link-quiet text-xs">
              Manage products
            </Link>
          </div>
          <div className="mt-3">
            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-4 py-8 text-center text-sm text-brand-500">
                This store has no products.
              </div>
            ) : (
              <div className="card divide-y divide-brand-100 overflow-hidden">
                {products.slice(0, 6).map((p) => (
                  <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-brand-100">
                      {p.images?.length ? (
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-brand-300">
                          <IconPackage width={15} height={15} />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-brand-900">{p.name}</p>
                      <p className="text-xs text-brand-400">
                        {formatINR(p.price)} · {p.stock} in stock
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
                {products.length > 6 && (
                  <p className="px-4 py-2 text-center text-xs text-brand-400">
                    +{products.length - 6} more product{products.length - 6 === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
