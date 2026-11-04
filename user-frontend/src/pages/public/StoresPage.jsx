import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiStores } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import Pagination from '../../components/common/Pagination'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { Skeleton } from '../../components/common/Skeleton'
import { IconSearch, IconStore } from '../../components/common/icons'

const CARD_SKELETONS = Array.from({ length: 6 }, (_, i) => i)

export default function StoresPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const page = Number(params.get('page')) || 1

  const [stores, setStores] = useState([])
  const [pagination, setPagination] = useState(null)
  const [input, setInput] = useState(search)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    apiStores({ page, limit: 12, search: search || undefined })
      .then((res) => {
        setStores(res.data.data.stores)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load stores')))
      .finally(() => setLoading(false))
  }, [page, search])

  const onSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (input.trim()) next.set('search', input.trim())
    next.set('page', '1')
    setParams(next)
  }

  const goToPage = (p) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  return (
    <div className="page-container pb-10 pt-8 fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-label">Marketplace</p>
          <h1 className="page-title mt-1">Independent stores</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Loading stores…' : `${pagination?.totalItems ?? stores.length} store${(pagination?.totalItems ?? stores.length) === 1 ? '' : 's'}`}
          </p>
        </div>
        <form onSubmit={onSearch} className="w-full md:w-72">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={16} height={16} />
            <input
              type="search"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search stores…"
              aria-label="Search stores"
              className="input pl-9"
            />
          </div>
        </form>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_SKELETONS.map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-brand-200 bg-white p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => goToPage(page)} />
        </div>
      ) : stores.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconStore}
            title={search ? 'No matching stores' : 'No stores yet'}
            message={
              search
                ? 'No store matches that name. Try a different search.'
                : 'Stores appear here as soon as a seller is approved.'
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <Link key={s._id} to={`/stores/${s._id}`} className="card card-hover group flex flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  {s.storeImage ? (
                    <img
                      src={s.storeImage}
                      alt={s.storeName}
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xl font-extrabold text-white">
                      {s.storeName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-900 group-hover:text-brand-700">{s.storeName}</p>
                    <p className="text-sm text-gray-500">
                      {s.productCount} product{s.productCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                {s.storeDescription && (
                  <p className="line-clamp-2 text-sm leading-6 text-gray-500">{s.storeDescription}</p>
                )}
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  View store
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            ))}
          </div>
          <Pagination pagination={pagination} onChange={goToPage} />
        </>
      )}
    </div>
  )
}