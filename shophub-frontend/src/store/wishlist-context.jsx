import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { apiGetWishlist, apiAddWishlist, apiRemoveWishlist } from '../api/endpoints'
import { getErrorMessage } from '../api/client'
import { toastSuccess, toastError } from '../store/slices/notifySlice'
import { useDispatch } from 'react-redux'

const WishlistContext = createContext(null)

export const WishlistProvider = ({ children }) => {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const [ids, setIds] = useState([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (user?.role !== 'USER') {
      setIds([])
      setReady(true)
      return
    }
    let cancelled = false
    setReady(false)
    apiGetWishlist()
      .then((res) => !cancelled && setIds(res.data.data.wishlist.products.map((p) => p._id)))
      .catch(() => !cancelled && setIds([]))
      .finally(() => !cancelled && setReady(true))
    return () => {
      cancelled = true
    }
  }, [user?.role])

  const isInWishlist = useCallback((productId) => ids.includes(String(productId)), [ids])

  const toggle = useCallback(
    async (productId) => {
      const id = String(productId)
      if (user?.role !== 'USER') {
        dispatch(toastError('Please sign in to use your wishlist'))
        return
      }
      const adding = !ids.includes(id)
      setBusy(id)
      try {
        if (adding) {
          await apiAddWishlist(id)
          setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
          dispatch(toastSuccess('Added to wishlist'))
        } else {
          await apiRemoveWishlist(id)
          setIds((prev) => prev.filter((x) => x !== id))
          dispatch(toastSuccess('Removed from wishlist'))
        }
      } catch (e) {
        dispatch(toastError(getErrorMessage(e)))
      } finally {
        setBusy('')
      }
    },
    [ids, user?.role, dispatch]
  )

  const value = useMemo(
    () => ({ wishlistIds: ids, ready, busy, isInWishlist, toggle }),
    [ids, ready, busy, isInWishlist, toggle]
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => useContext(WishlistContext)