import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { removeToast } from '../../store/slices/notifySlice'

function Toast({ toast }) {
  const dispatch = useDispatch()

  useEffect(() => {
    const timer = setTimeout(() => dispatch(removeToast(toast.id)), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, dispatch])

  const styles =
    toast.type === 'error'
      ? 'bg-red-600 text-white'
      : toast.type === 'success'
        ? 'bg-emerald-600 text-white'
        : 'bg-slate-900 text-white'

  return (
    <div className={`fade-in flex items-start gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${styles}`}>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => dispatch(removeToast(toast.id))}
        aria-label="Dismiss"
        className="text-white/70 hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}

export default function Toasts() {
  const toasts = useSelector((s) => s.toasts.toasts)
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  )
}