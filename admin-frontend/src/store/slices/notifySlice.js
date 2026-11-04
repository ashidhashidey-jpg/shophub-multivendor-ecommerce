import { createSlice } from '@reduxjs/toolkit'

let nextId = 1

const notifySlice = createSlice({
  name: 'toasts',
  initialState: { toasts: [] },
  reducers: {
    addToast(state, action) {
      const { type = 'success', message } = action.payload
      state.toasts.push({ id: nextId++, type, message })
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { addToast, removeToast } = notifySlice.actions

export const toastSuccess = (message) => addToast({ type: 'success', message })
export const toastError = (message) => addToast({ type: 'error', message })

export default notifySlice.reducer