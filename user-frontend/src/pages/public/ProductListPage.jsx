import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiProducts, apiCategories } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import ProductCard from '../../components/common/ProductCard'
import Pagination from '../../components/common/Pagination'
import { ProductCardSkeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconFilter, IconClose, IconChevron } from '../../components/common/icons'

const GRID_SKELETONS = Array.from({ length: 8 }, (_, i) => i)

const PRICE_RANGES = [
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹999', min: '500', max: '999' },
  { label: '₹1,000 – ₹2,999', min: '1000', max: '2999' },
  { label: '₹3,000 and above', min: '3000', max: '' },
]

export default function ProductListPage({ categorySlug, onLoadMeta }) {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const search = params.get('search') || ''
  const category = params.get('category') || ''
  const minPrice = params.get('minPrice') || ''
  const maxPrice = params.get('maxPrice') || ''
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page')) || 1

  // Local copies of the price inputs so each keystroke does not fire a request.
  // Only after a quiet 400ms pause is the URL (and therefore the fetch) updated.
  const [priceDraft, setPriceDraft] = useState({ min: minPrice, max: maxPrice })

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  const setPriceRange = (min, max) => {
    setPriceDraft({ min, max })
    const next = new URLSearchParams(params)
    if (min) next.set('minPrice', min)
    else next.delete('minPrice')
    if (max) next.set('maxPrice', max)
    else next.delete('maxPrice')
    next.set('page', '1')
    setParams(next)
  }

  const goToPage = (p) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
    setFiltersOpen(false)
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    next.set('sort', 'newest')
    next.set('page', '1')
    setParams(next)
    setPriceDraft({ min: '', max: '' })
  }

  useEffect(() => {
    setPriceDraft({ min: minPrice, max: maxPrice })
  }, [minPrice, maxPrice])

  useEffect(() => {
    const t = setTimeout(() => updateParam('minPrice', priceDraft.min), 400)
    return () => clearTimeout(t)
  }, [priceDraft.min]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => updateParam('maxPrice', priceDraft.max), 400)
    return () => clearTimeout(t)
  }, [priceDraft.max]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiCategories()
      .then((res) => setCats(res.data.data.categories))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    const query = { page, limit: 12, sort }
    if (categorySlug) query.category = categorySlug
    else if (category) query.category = category
    if (search) query.search = search
    if (minPrice) query.minPrice = minPrice
    if (maxPrice) query.maxPrice = maxPrice

    apiProducts(query)
      .then((res) => {
        const { products: list, pagination: p } = res.data.data
        setProducts(list)
        setPagination(p)
        if (onLoadMeta) onLoadMeta({ totalItems: p.totalItems, products: list })
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load products')))
      .finally(() => setLoading(false))
  }, [search, minPrice, maxPrice, sort, page, category, categorySlug, onLoadMeta, reloadKey])

  // Close the mobile filter drawer with Escape.
  useEffect(() => {
    if (!filtersOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtersOpen])

  const chips = []
  if (search) chips.push({ key: 'search', label: `“${search}”`, clear: () => updateParam('search', '') })
  if (!categorySlug && category) {
    const name = cats.find((c) => c.slug === category)?.name || category
    chips.push({ key: 'cat', label: name, clear: () => updateParam('category', '') })
  }
  if (minPrice) chips.push({ key: 'min', label: `From ₹${minPrice}`, clear: () => updateParam('minPrice', '') })
  if (maxPrice) chips.push({ key: 'max', label: `Up to ₹${maxPrice}`, clear: () => updateParam('maxPrice', '') })

  const hasChrome = Boolean(search || minPrice || maxPrice || (!categorySlug && category))
  const totalItems = pagination?.totalItems ?? products.length
  const activeSlug = categorySlug || category
  const gridClass = 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4'

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal-900">Category</p>
        <ul className="mt-3 space-y-0.5 text-sm">
          <li>
            <Link
              to="/products"
              onClick={() => setFiltersOpen(false)}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                activeSlug ? 'text-gray-600 hover:bg-brand-50' : 'bg-brand-100 font-semibold text-brand-900'
              }`}
            >
              All categories
            </Link>
          </li>
          {cats.map((c) => (
            <li key={c._id}>
              <Link
                to={`/categories/${c.slug}`}
                onClick={() => setFiltersOpen(false)}
                className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                  activeSlug === c.slug
                    ? 'bg-brand-100 font-semibold text-brand-900'
                    : 'text-gray-600 hover:bg-brand-50'
                }`}
              >
                <span className="truncate">{c.name}</span>
                {activeSlug === c.slug && <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-brand-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal-900">Price</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="number"
            aria-label="Minimum price"
            placeholder="Min ₹"
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((d) => ({ ...d, min: e.target.value }))}
            className="input"
          />
          <input
            type="number"
            aria-label="Maximum price"
            placeholder="Max ₹"
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((d) => ({ ...d, max: e.target.value }))}
            className="input"
          />
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {PRICE_RANGES.map((r) => {
            const active = minPrice === r.min && maxPrice === r.max
            return (
              <li key={r.label}>
                <button
                  type="button"
                  onClick={() => (active ? setPriceRange('', '') : setPriceRange(r.min, r.max))}
                  className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? 'bg-warm-ivory font-semibold text-charcoal-900' : 'text-charcoal-400 hover:bg-charcoal-50'
                  }`}
                >
                  {r.label}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-brand-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-900">Availability</p>
        <p className="mt-2 text-xs leading-5 text-charcoal-500">
          Only approved products from approved stores are shown. Out-of-stock items stay visible while stocks last.
        </p>
      </div>

      {hasChrome && (
        <button type="button" onClick={clearFilters} className="btn-secondary w-full py-2 text-xs">
          Clear all filters
        </button>
      )}
    </div>
  )

  return (
    <div className={categorySlug ? 'mt-6' : 'page-container py-8'}>
      {!categorySlug && (
        <div className="border-b border-charcoal-200 pb-5">
          <nav className="text-xs text-charcoal-400">
            <Link to="/" className="hover:text-charcoal-900">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-charcoal-600">Shop</span>
          </nav>
          <div className="mt-2">
            <h1 className="page-title">
              {search ? `Results for “${search}”` : 'All products'}
            </h1>
            <p className="mt-1 text-sm text-charcoal-500">
              {loading ? 'Loading products…' : `${totalItems} product${totalItems === 1 ? '' : 's'} from verified sellers`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-40">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-900">
              <IconFilter width={16} height={16} /> Filters
            </div>
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="btn-secondary px-3 py-2 text-xs lg:hidden"
            >
              <IconFilter width={15} height={15} /> Filters
              {hasChrome && <span className="ml-1 rounded-full bg-charcoal-600 px-1.5 text-[10px] text-white">{chips.length}</span>}
            </button>
            <p className="text-xs text-charcoal-500">
              {loading ? 'Loading…' : `${totalItems} result${totalItems === 1 ? '' : 's'}`}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort-mobile" className="sr-only">
                Sort products
              </label>
              <select
                id="sort-mobile"
                aria-label="Sort products"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="select w-auto min-w-[9.5rem] py-2 text-xs"
              >
                <option value="newest">Newest first</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button key={chip.key} onClick={chip.clear} className="chip chip-active" type="button">
                  {chip.label}
                  <span className="chip-remove">×</span>
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className={`${gridClass} mt-6`}>
              {GRID_SKELETONS.map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6">
              <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
            </div>
          ) : products.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No products found"
                message={
                  hasChrome
                    ? 'Nothing matches the current filters — try widening the price range or clearing some filters.'
                    : 'This storefront has not listed any products yet.'
                }
                actionTo="/products"
                actionLabel="View all products"
              />
            </div>
          ) : (
            <>
              <div className={`${gridClass} mt-6`}>
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              <Pagination pagination={pagination} onChange={goToPage} />
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Product filters">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-base font-bold text-charcoal-900">
                <IconFilter width={17} height={17} /> Filters
              </p>
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-charcoal-200 text-charcoal-400"
              >
                <IconClose width={16} height={16} />
              </button>
            </div>
            <div className="mt-5">{filterPanel}</div>
            <button onClick={() => setFiltersOpen(false)} className="btn-primary mt-6 w-full">
              Show {totalItems} product{totalItems === 1 ? '' : 's'}
              <IconChevron className="-rotate-90" width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
