import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiProducts, apiCategories, apiStores } from '../../api/endpoints'
import { getErrorMessage } from '../../api/client'
import ProductCard from '../../components/common/ProductCard'
import { ProductCardSkeleton, Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import { IconArrow, IconStore, IconShield, IconTruck, IconTag } from '../../components/common/icons'
import { APP_URLS } from '../../utils/appNav'

const SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => i)

// Colour palette: charcoal-900 (deep charcoal), warm-ivory (light cream),
// brand-600 (charcoal accent), muted-gold (subtle gold accent)

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      apiProducts({ limit: 100, sort: 'newest' }),
      apiCategories(),
      // Stores are a supporting section: a stores outage must not blank the home page.
      apiStores({ limit: 4 }).catch(() => ({ data: { data: { stores: [] } } })),
    ])
      .then(([p, c, s]) => {
        setProducts(p.data.data.products)
        setCats(c.data.data.categories)
        setStores(s.data.data.stores || [])
      })
      .catch((e) => setError(getErrorMessage(e, 'Could not load the storefront')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const newArrivals = products.slice(0, 8)
  const offers = products.filter((p) => p.discount > 0).slice(0, 4)
  const budget = products.filter((p) => Number(p.finalPrice) <= 999).slice(0, 4)
  const heroImages = products.filter((p) => p.images?.length).slice(0, 3)

  return (
    <div className="fade-in">
      {/* Premium hero — real catalogue imagery with charcoal & warm-ivory styling */}
      <section className="border-b border-brand-600 bg-warm-ivory">
        <div className="page-container grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="section-label">ShopHub marketplace</p>
            <span className="section-rule" />
            <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.98] tracking-tight text-charcoal-900 sm:text-6xl lg:text-7xl">
              Everything you need,
              <br />
              from stores you can trust.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-brand-500 sm:text-base">
              Fashion, electronics, home, beauty and more — listed by independent sellers and approved by our
              team before they reach you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary">
                Shop the marketplace
                <IconArrow width={16} height={16} />
              </Link>
              <Link to="/stores" className="btn-secondary">
                Explore stores
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-brand-200 pt-5 text-xs text-brand-500">
              <span className="inline-flex items-center gap-2">
                <IconShield width={15} height={15} className="text-muted-gold" />
                Approved sellers only
              </span>
              <span className="inline-flex items-center gap-2">
                <IconTruck width={15} height={15} className="text-muted-gold" />
                Tracked delivery
              </span>
              <span className="inline-flex items-center gap-2">
                <IconTag width={15} height={15} className="text-muted-gold" />
                Real prices, no surprises
              </span>
            </div>
          </div>

          <div className="relative">
            {loading ? (
              <Skeleton className="aspect-[5/4] w-full rounded-2xl" />
            ) : heroImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`/products/${heroImages[0]._id}`}
                  className="group col-span-2 block overflow-hidden rounded-2xl border border-brand-200 bg-white"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={heroImages[0].images[0]}
                      alt={heroImages[0].name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-900/80 to-transparent p-4 pt-10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-gold">
                        {heroImages[0].category?.name || 'Featured'}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{heroImages[0].name}</p>
                    </div>
                  </div>
                </Link>
                {heroImages.slice(1, 3).map((p) => (
                  <Link
                    key={p._id}
                    to={`/products/${p._id}`}
                    className="group block overflow-hidden rounded-2xl border border-brand-200 bg-white"
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[5/4] flex-col items-center justify-center rounded-2xl border border-brand-200 bg-white text-center">
                <span className="font-display text-6xl text-muted-gold">S</span>
                <p className="mt-3 max-w-xs text-sm text-brand-500">
                  The marketplace is ready for its first listings.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="page-container mt-14 space-y-16 pb-4">
          <section>
            <Skeleton className="h-6 w-44" />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {SKELETON_KEYS.slice(0, 4).map((i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-brand-200 bg-warm-ivory">
                  <Skeleton className="aspect-[4/3] rounded-none" />
                  <div className="p-3">
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <Skeleton className="h-6 w-44" />
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {SKELETON_KEYS.map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      ) : error ? (
        <div className="page-container mt-14">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : (
        <>
          {/* Shop by category */}
          <section className="page-container pt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-label">Browse the marketplace</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">
                  Shop by category
                </h2>
              </div>
              <Link to="/products" className="link-quiet whitespace-nowrap text-sm">
                View all products →
              </Link>
            </div>
            {cats.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No categories yet" message="Categories appear here once a store lists its first product." />
              </div>
            ) : (
              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {cats.slice(0, 8).map((c) => (
                  <Link key={c._id} to={`/categories/${c.slug}`} className="card card-hover group overflow-hidden">
                    <div className="relative flex aspect-[3/2] items-center justify-center overflow-hidden bg-warm-ivory">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <span
                        className="absolute inset-0 flex items-center justify-center font-display text-5xl text-charcoal-300"
                        style={c.image ? { display: 'none' } : undefined}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-4">
                      <span className="truncate text-sm font-semibold text-charcoal-900">{c.name}</span>
                      <IconArrow
                        className="shrink-0 text-charcoal-300 transition-colors group-hover:text-muted-gold"
                        width={16}
                        height={16}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* New arrivals */}
          <section className="page-container pt-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-label">Freshly listed</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">New arrivals</h2>
              </div>
              <Link to="/products?sort=newest" className="link-quiet whitespace-nowrap text-sm">
                View all →
              </Link>
            </div>
            {newArrivals.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Nothing listed yet"
                  message="The storefront is empty at the moment — check back soon."
                />
              </div>
            ) : (
              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {newArrivals.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            )}
          </section>

          {/* Real offers, only when discounted products exist */}
          {offers.length > 0 && (
            <section className="mt-16 bg-brand-100 py-14">
              <div className="page-container">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="section-label">Marked down</p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">
                      Current offers
                    </h2>
                  </div>
                  <Link to="/products" className="link-quiet whitespace-nowrap text-sm">
                    Browse all deals →
                  </Link>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                  {offers.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Featured approved stores — real data from /stores */}
          {stores.length > 0 && (
            <section className="page-container pt-16">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="section-label">Independent sellers</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">
                    Featured stores
                  </h2>
                </div>
                <Link to="/stores" className="link-quiet whitespace-nowrap text-sm">
                  View all stores →
                </Link>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stores.map((s) => (
                  <Link key={s._id} to={`/stores/${s._id}`} className="card card-hover group flex flex-col p-5">
                    <div className="flex items-center gap-3">
                      {s.storeImage ? (
                        <img src={s.storeImage} alt={s.storeName} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-charcoal-600 font-display text-xl text-muted-gold">
                          {s.storeName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-charcoal-900 group-hover:text-charcoal-600">{s.storeName}</p>
                        <p className="text-xs text-charcoal-500">
                          {s.productCount} live product{s.productCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    {s.storeDescription && (
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-charcoal-500">{s.storeDescription}</p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-charcoal-900">
                      Visit store <IconArrow width={13} height={13} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Budget picks — only rendered when real products qualify */}
          {budget.length > 0 && (
            <section className="page-container pt-16">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="section-label">Everyday value</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-charcoal-900 sm:text-3xl">
                    Under ₹999
                  </h2>
                </div>
                <Link to="/products?maxPrice=999" className="link-quiet whitespace-nowrap text-sm">
                  Shop the range →
                </Link>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {budget.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Seller CTA */}
          <section className="page-container mt-16">
            <div className="grid overflow-hidden rounded-2xl bg-charcoal-600 text-warm-ivory lg:grid-cols-[1.2fr_0.8fr]">
              <div className="px-6 py-10 sm:px-10 sm:py-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-gold">
                  Sell on ShopHub
                </p>
                <h2 className="mt-3 max-w-lg font-display text-4xl leading-tight sm:text-5xl">
                  Turn your catalogue into a storefront.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
                  Independent sellers manage their own product listings, stock, orders and returns. Apply once and
                  start selling once approved.
                </p>
                <a
                  href={APP_URLS.seller}
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-muted-gold px-6 py-3 text-sm font-bold text-charcoal-900 transition-colors hover:bg-muted-700"
                >
                  Apply to become a seller
                  <IconArrow width={16} height={16} />
                </a>
              </div>
              <div className="relative hidden items-center justify-center border-l border-white/10 lg:flex">
                <span className="font-display text-[11rem] leading-none text-white/10">S</span>
                <div className="absolute bottom-8 left-8 right-8 rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur">
                  <p className="flex items-center gap-2 text-xs text-white/80">
                    <IconStore width={15} height={15} className="text-muted-gold" />
                    Seller tools for products, orders and returns
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
