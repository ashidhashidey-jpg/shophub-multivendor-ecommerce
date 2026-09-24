import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { cartCount: 0 },
  reducers: {
    setCartCount(state, action) {
      state.cartCount = action.payload
    },
  },
})

export const { setCartCount } = uiSlice.actions
export default uiSlice.reducer