import { createSlice } from '@reduxjs/toolkit'

const persistedToken = localStorage.getItem('token')
const persistedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null
  } catch {
    return null
  }
})()

const initialState = {
  user: persistedUser,
  token: persistedToken,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, token } = action.payload
      state.user = user
      state.token = token
      localStorage.setItem('user', JSON.stringify(user))
      localStorage.setItem('token', token)
    },
    logout(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
    },
    setUser(state, action) {
      state.user = action.payload
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
  },
})

export const { setCredentials, logout, setUser } = authSlice.actions
export default authSlice.reducer