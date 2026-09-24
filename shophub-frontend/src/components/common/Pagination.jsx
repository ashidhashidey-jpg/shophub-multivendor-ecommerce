import { useNavigate } from 'react-router-dom'

export default function Pagination({ pagination, onChange }) {
  const navigate = useNavigate()
  if (!pagination || pagination.totalPages <= 1) return null
  const { page, totalPages } = pagination

  const go = (p) => {
    if (onChange) onChange(p)
    else navigate(`?page=${p}`)
  }

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
  }

  const items = []
  let prev = 0
  for (const p of pages) {
    if (p - prev > 1) items.push('…')
    items.push(p)
    prev = p
  }

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => go(page - 1)}
        className="btn-secondary px-3 py-1.5 disabled:opacity-40"
      >
        Prev
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={i} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={i}
            onClick={() => go(it)}
            aria-current={it === page ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-md px-3 text-sm ${
              it === page
                ? 'bg-brand-600 font-semibold text-white'
                : 'border border-brand-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {it}
          </button>
        )
      )}
      <button
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
        className="btn-secondary px-3 py-1.5 disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  )
}