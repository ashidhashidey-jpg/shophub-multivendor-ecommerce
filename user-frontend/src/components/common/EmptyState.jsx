import { Link } from 'react-router-dom'
import { IconShirt } from './icons'

export default function EmptyState({
  title = 'Nothing here yet',
  message,
  actionTo,
  actionLabel = 'Browse products',
  icon: Icon = IconShirt,
}) {
  return (
    <div className="state-panel rounded-xl border border-dashed border-brand-300 bg-brand-50/40">
      <span className="state-icon">
        <Icon width={28} height={28} />
      </span>
      <div className="state-panel-body">
        <p className="state-title">{title}</p>
        {message && <p className="state-text">{message}</p>}
      </div>
      {actionTo && (
        <Link to={actionTo} className="btn-primary btn-sm mt-1">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}