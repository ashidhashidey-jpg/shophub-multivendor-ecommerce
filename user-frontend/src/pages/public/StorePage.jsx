import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { apiStore, apiProducts } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import { formatDate } from '../../utils/format'
import ProductCard from '../../components/common/ProductCard'
import Pagination from '../../components/common/Pagination'
import ErrorState from '../../components/common/ErrorState'
import EmptyState from '../../components/common/EmptyState'
import { ProductCardSkeleton } from '../../components/common/Skeleton'
import { IconStore } from '../../components/common/icons'

const GRID_SKELETONS = Array.from({ length: 8 }, (_, i) => i)

export default function StorePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page')) || 1

  const [store, setStore] = useState(null)
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loadingStore, setLoadingStore] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [storeError, setStoreError] = useState('')
  const [productError, setProductError] = useState('')

  useEffect(() => {
    setLoadingStore(true)
    setStoreError('')
    apiStore(id)
      .then((res) => setStore(res.data.data.store))
      .catch((e) => setStoreError(getErrorMessage(e, 'Store not found')))
      .finally(() => setLoadingStore(false))
  }, [id])

  useEffect(() => {
    setLoadingProducts(true)
    setProductError('')
    apiProducts({ seller: id, page, limit: 12, sort })
      .then((res) => {
        setProducts(res.data.data.products)
        setPagination(res.data.data.pagination)
      })
      .catch((e) => setProductError(getErrorMessage(e, 'Could not load this store’s products')))
      .finally(() => setLoadingProducts(false))
  }, [id, page, sort])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  const goToPage = (p) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
  }

  if (loadingStore) {
    return (
      <div className="page-container pb-10 pt-8">
        <div className="flex items-center gap-5">
          <div className="skeleton h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-1/2" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {GRID_SKELETONS.map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (storeError) {
    return (
      <div className="page-container pb-10 pt-8">
        <ErrorState icon={IconStore} title="Store not found" message={storeError} actionTo="/stores" actionLabel="Browse stores" />
      </div>
    )
  }

  return (
    <div className="page-container pb-10 pt-8 fade-in">
      <nav className="text-sm text-gray-500">
        <Link to="/stores" className="hover:text-brand-900">
          Stores
        </Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="font-medium text-gray-700">{store.storeName}</span>
      </nav>

      <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-900 text-3xl font-extrabold text-white">
            {store.storeName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-900 sm:text-3xl">{store.storeName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{store.storeDescription}</p>
            <p className="mt-3 text-xs text-gray-400">
              {store.productCount} live product{store.productCount === 1 ? '' : 's'} · Member since{' '}
              {store.approvedAt ? formatDate(store.approvedAt).split(',')[0] : '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-gray-600">
            <IconStore width={16} height={16} className="text-brand-600" />
            Authorized seller
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {loadingProducts ? 'Loading products…' : `${pagination?.totalItems ?? products.length} product${(pagination?.totalItems ?? products.length) === 1 ? '' : 's'}`}
        </p>
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => updateParam('sort', e.target.value)}
          className="select w-auto"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name_asc">Name A–Z</option>
        </select>
      </div>

      {loadingProducts ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {GRID_SKELETONS.map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : productError ? (
        <div className="mt-6">
          <ErrorState message={productError} onRetry={() => goToPage(page)} />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={IconStore}
            title="No products in this store"
            message="This store has not listed any products yet. Check back soon."
            actionTo="/stores"
            actionLabel="Browse other stores"
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          <Pagination pagination={pagination} onChange={goToPage} />
        </>
      )}
    </div>
  )
}