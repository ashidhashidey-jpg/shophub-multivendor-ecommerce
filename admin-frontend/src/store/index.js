import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import notifyReducer from './slices/notifySlice'
import uiReducer from './slices/uiSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    toasts: notifyReducer,
    ui: uiReducer,
  },
})

export default store