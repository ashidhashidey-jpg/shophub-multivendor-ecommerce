import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { apiGetMe } from '../../api/endpoints'
import { setUser, logout } from '../../store/slices/authSlice'
import Loader from './Loader'

// Re-validates the persisted session against the backend on every load so the
// server remains the source of truth for who the user is (role, block status).
// The role stored in localStorage is treated as untrusted until confirmed.
export default function SessionGate({ children }) {
  const dispatch = useDispatch()
  const { user, token } = useSelector((s) => s.auth)
  const [validatedToken, setValidatedToken] = useState(null)
  const hasUser = Boolean(user)

  useEffect(() => {
    if (!token || !hasUser) return

    let cancelled = false
    apiGetMe()
      .then((res) => {
        if (cancelled) return
        const me = res.data?.data?.user
        if (me) {
          dispatch(setUser(me))
        } else {
          dispatch(logout())
        }
      })
      .catch(() => {
        if (cancelled) return
        dispatch(logout())
      })
      .finally(() => {
        if (!cancelled) setValidatedToken(token)
      })

    return () => {
      cancelled = true
    }
  }, [token, hasUser, dispatch])

  if (token && hasUser && validatedToken !== token) {
    return <Loader text="Restoring session…" />
  }
  return children
}