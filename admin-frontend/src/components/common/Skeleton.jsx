export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
)

export const ProductCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-brand-200 bg-white">
    <Skeleton className="aspect-[4/3] rounded-none" />
    <div className="space-y-3 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  </div>
)

export default Skeleton