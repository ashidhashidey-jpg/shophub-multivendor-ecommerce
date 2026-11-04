import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiCategories } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import ProductListPage from './ProductListPage'
import ErrorState from '../../components/common/ErrorState'
import { Skeleton } from '../../components/common/Skeleton'

export default function CategoryPage() {
  const { slug } = useParams()
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalItems, setTotalItems] = useState(0)

  const loadCategory = useCallback(() => {
    setLoading(true)
    setError('')
    apiCategories()
      .then((res) => {
        const found = res.data.data.categories.find((c) => c.slug === slug)
        if (found) setCategory(found)
        else setError('Category not found')
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load this category')))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    loadCategory()
  }, [loadCategory])

  // Stable callback so the list page does not refetch when the parent re-renders.
  const onLoadMeta = useCallback(({ totalItems: t }) => setTotalItems(t), [])

  return (
    <div className="page-container pb-10 pt-8 fade-in">
      {loading ? (
        <>
          <Skeleton className="h-8 w-40" />
          <div className="mt-6 overflow-hidden rounded-2xl border charcoal-200">
            <Skeleton className="aspect-[6/1] rounded-none" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={loadCategory} />
      ) : (
        <>
          <nav className="text-xs text-charcoal-400">
            <Link to="/" className="hover:text-charcoal-900">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <Link to="/products" className="hover:text-charcoal-900">
              Shop
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-medium text-charcoal-700">{category?.name}</span>
          </nav>

          <div className="mt-4 overflow-hidden rounded-2xl border charcoal-200 bg-warm-ivory">
            <div className="grid md:grid-cols-[1fr_280px]">
              <div className="p-6 sm:p-8">
                <p className="section-label">Category</p>
                <h1 className="mt-2 font-display text-4xl leading-none tracking-tight text-charcoal-900 sm:text-5xl">
                  {category?.name}
                </h1>
                {category?.description && (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal-500">{category.description}</p>
                )}
                <p className="mt-5 inline-flex items-center gap-2 rounded-xl border charcoal-200 bg-warm-ivory px-3 py-1 text-xs font-medium text-charcoal-400">
                  {totalItems} product{totalItems === 1 ? '' : 's'} available
                </p>
              </div>
              <div className="relative hidden md:block">
                {category?.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div
                  className="absolute inset-0 flex items-center justify-center charcoal-200"
                  style={category?.image ? { display: 'none' } : undefined}
                >
                  <span className="font-display text-8xl text-charcoal-300">
                    {category?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ProductListPage categorySlug={slug} onLoadMeta={onLoadMeta} />
        </>
      )}
    </div>
  )
}