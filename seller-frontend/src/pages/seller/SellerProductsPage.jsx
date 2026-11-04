import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { apiSellerProducts, apiDeleteProduct } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { toastSuccess, toastError } from '../../store/slices/notifySlice'
import { formatINR, StatusBadge } from '../../utils/format'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconPackage, IconPlus, IconSearch } from '../../components/common/icons'

export default function SellerProductsPage() {
  const dispatch = useDispatch()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)

  const refresh = () => apiSellerProducts().then((res) => setProducts(res.data.data.products))

  const load = () => {
    setLoading(true)
    setError('')
    refresh()
      .catch((e) => setError(getErrorMessage(e, 'Could not load your products')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [products, query, statusFilter])

  const remove = async (p) => {
    setBusyId(p._id)
    try {
      const res = await apiDeleteProduct(p._id)
      dispatch(toastSuccess('Product removed'))
      setProducts((list) => list.map((x) => (x._id === p._id ? res.data.data.product : x)))
    } catch (e) {
      dispatch(toastError(getErrorMessage(e)))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-container fade-in py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="section-label">Catalogue</p>
          <h1 className="page-title mt-1">My products</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            {products.length} product{products.length === 1 ? '' : 's'} in your store
          </p>
        </div>
        <Link to="/seller/products/create" className="btn-primary">
          <IconPlus width={16} height={16} /> New product
        </Link>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your products…"
            aria-label="Search your products"
            className="input pl-9"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select sm:w-48"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING">Pending review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-4">
                <Skeleton className="h-14 w-14" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState icon={IconPackage} message={error} onRetry={load} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={IconPackage}
            title="No products yet"
            message="Create your first listing to start selling on ShopHub."
            actionTo="/seller/products/create"
            actionLabel="Add a product"
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={IconSearch}
            title="No matching products"
            message="Try a different search term or status filter."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="card hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-brand-100">
                              {p.images?.length ? (
                                <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full items-center justify-center text-brand-300">
                                  <IconPackage width={18} height={18} />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[280px] truncate font-semibold text-brand-900">{p.name}</p>
                              {!p.isActive && (
                                <p className="text-[11px] font-semibold text-red-600">Disabled by admin</p>
                              )}
                              {p.rejectionReason && (
                                <p className="max-w-[280px] truncate text-[11px] text-red-600">
                                  {p.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap font-semibold text-brand-900">
                          {formatINR(p.finalPrice)}
                          {p.discount > 0 && (
                            <span className="ml-1 text-[11px] font-medium text-brand-400">
                              ({p.discount}% off)
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`text-sm font-semibold ${
                              p.stock === 0 ? 'text-red-600' : 'text-brand-700'
                            }`}
                          >
                            {p.stock === 0 ? 'Out of stock' : p.stock}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Link to={`/seller/products/${p._id}/edit`} className="btn-secondary btn-sm">
                              Edit
                            </Link>
                            <button
                              disabled={busyId === p._id}
                              onClick={() => remove(p)}
                              className="btn-sm border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              {busyId === p._id ? 'Removing…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map((p) => (
                <div key={p._id} className="card p-4">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-brand-100">
                      {p.images?.length ? (
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-brand-300">
                          <IconPackage width={20} height={20} />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-brand-900">{p.name}</p>
                      <p className="mt-1 text-sm font-bold text-brand-900">{formatINR(p.finalPrice)}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={p.status} />
                        <span className={`text-[11px] font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-brand-500'}`}>
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                        </span>
                      </div>
                    </div>
                  </div>
                  {p.rejectionReason && (
                    <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                      {p.rejectionReason}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Link to={`/seller/products/${p._id}/edit`} className="btn-secondary btn-sm flex-1">
                      Edit
                    </Link>
                    <button
                      disabled={busyId === p._id}
                      onClick={() => remove(p)}
                      className="btn-sm border border-red-200 px-4 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
