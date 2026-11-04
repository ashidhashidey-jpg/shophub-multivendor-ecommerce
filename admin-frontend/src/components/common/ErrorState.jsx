import { IconShirt } from './icons'

export default function ErrorState({ message = 'Something went wrong', onRetry, icon: Icon = IconShirt }) {
  return (
    <div className="state-panel rounded-xl border border-dashed border-brand-300 bg-brand-50/40">
      <span className="state-icon">
        <Icon width={28} height={28} />
      </span>
      <div className="state-panel-body">
        <p className="state-title">Could not load</p>
        {message && <p className="state-text">{message}</p>}
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm mt-1">
          Try again
        </button>
      )}
    </div>
  )
}