import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiProducts, apiCategories } from '../../api/endpoints'
import ProductCard from '../../components/common/ProductCard'
import Loader from '../../components/common/Loader'

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([apiProducts({ limit: 8, sort: 'newest' }), apiCategories()])
      .then(([p, c]) => {
        setFeatured(p.data.data.products)
        setCats(c.data.data.categories)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in">
      <section className="border-b border-brand-100 bg-[radial-gradient(70rem_circle_at_50%_-10%,#f2f2f3,transparent)] py-16 text-center sm:py-24">
        <div className="page-container">
          <p className="section-label mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5">
            A marketplace of independent stores
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-brand-900 sm:text-5xl">
            Discover products from<br className="hidden sm:block" /> sellers you'll love
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-500">
            One platform, hundreds of independent stores. Every product is reviewed before it goes live.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/products" className="btn-primary">
              Browse products
            </Link>
            <Link to="/seller/register" className="btn-secondary">
              Become a seller
            </Link>
          </div>
        </div>
      </section>

      <section className="page-container mt-12">
        <h2 className="section-title">Shop by category</h2>
        {cats.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No categories yet.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {cats.map((c) => (
              <Link
                key={c._id}
                to={`/categories/${c.slug}`}
                className="rounded-full border border-brand-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-brand-600 hover:text-brand-900"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="page-container mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="section-title">New arrivals</h2>
          <Link to="/products" className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <Loader />
        ) : featured.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-brand-300 bg-brand-50/50 py-16 text-center">
            <p className="text-gray-500">No products available yet.</p>
            <p className="mt-1 text-sm text-gray-400">Check back soon, or become a seller and list the first one.</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}