import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiProducts } from '../../api/endpoints'
import ProductCard from '../../components/common/ProductCard'
import Pagination from '../../components/common/Pagination'
import Loader from '../../components/common/Loader'

export default function ProductListPage({ categorySlug }) {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)

  const search = params.get('search') || ''
  const minPrice = params.get('minPrice') || ''
  const maxPrice = params.get('maxPrice') || ''
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page')) || 1

  useEffect(() => {
    setLoading(true)
    const query = {
      page,
      limit: 12,
      sort,
    }
    if (categorySlug) query.category = categorySlug
    if (search) query.search = search
    if (minPrice) query.minPrice = minPrice
    if (maxPrice) query.maxPrice = maxPrice

    apiProducts(query)
      .then((res) => {
        setProducts(res.data.data.products)
        setPagination(res.data.data.pagination)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [search, minPrice, maxPrice, sort, page, categorySlug])

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="page-container py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">{categorySlug ? 'Category products' : 'Products'}</h1>
          {search && (
            <p className="mt-1 text-sm text-gray-500">
              Results for <span className="font-medium text-gray-700">“{search}”</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            aria-label="Minimum price"
            placeholder="Min ₹"
            value={minPrice}
            onChange={(e) => updateParam('minPrice', e.target.value)}
            className="input w-24"
          />
          <input
            type="number"
            aria-label="Maximum price"
            placeholder="Max ₹"
            value={maxPrice}
            onChange={(e) => updateParam('maxPrice', e.target.value)}
            className="input w-24"
          />
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
      </div>

      {loading ? (
        <Loader />
      ) : products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-16 text-center">
          <p className="text-gray-500">No products available yet.</p>
          {search && <p className="mt-1 text-sm text-gray-400">Nothing matches your search.</p>}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
          <Pagination pagination={pagination} />
        </>
      )}
    </div>
  )
}