import client from './client'

// ---- AUTH ----
export const apiRegister = (payload) => client.post('/auth/register', payload)
export const apiLogin = (payload) => client.post('/auth/login', payload)

// ---- PUBLIC MARKETPLACE ----
export const apiProducts = (params) => client.get('/products', { params })
export const apiProduct = (id) => client.get(`/products/${id}`)
export const apiProductReviews = (id) => client.get(`/products/${id}/reviews`)
export const apiCategories = () => client.get('/categories')

// ---- USER PROFILE / ADDRESSES ----
export const apiGetProfile = () => client.get('/users/profile')
export const apiUpdateProfile = (payload) => client.put('/users/profile', payload)
export const apiChangePassword = (payload) => client.put('/users/change-password', payload)
export const apiAddresses = () => client.get('/users/addresses')
export const apiCreateAddress = (payload) => client.post('/users/addresses', payload)
export const apiUpdateAddress = (id, payload) => client.put(`/users/addresses/${id}`, payload)
export const apiDeleteAddress = (id) => client.delete(`/users/addresses/${id}`)
export const apiSetDefaultAddress = (id) => client.patch(`/users/addresses/${id}/default`)

// ---- CART ----
export const apiGetCart = () => client.get('/cart')
export const apiAddCart = (productId, quantity = 1) => client.post('/cart/items', { productId, quantity })
export const apiUpdateCartItem = (productId, quantity) => client.put(`/cart/items/${productId}`, { quantity })
export const apiRemoveCartItem = (productId) => client.delete(`/cart/items/${productId}`)
export const apiClearCart = () => client.delete('/cart')

// ---- CHECKOUT ----
export const apiCheckoutSummary = (addressId) => client.get('/checkout/summary', { params: addressId ? { addressId } : {} })

export const apiGetWishlist = () => client.get('/wishlist')
export const apiAddWishlist = (productId) => client.post(`/wishlist/${productId}`)
export const apiRemoveWishlist = (productId) => client.delete(`/wishlist/${productId}`)
export const apiReviewEligibility = (productId) => client.get(`/products/${productId}/reviews/eligibility`)

// ---- ORDERS ----
export const apiPlaceOrder = (addressId, paymentMethod = 'COD', razorpay = {}) =>
  client.post('/orders', { addressId, paymentMethod, ...razorpay })
export const apiMyOrders = (params) => client.get('/orders', { params })
export const apiMyOrder = (id) => client.get(`/orders/${id}`)
export const apiCancelOrder = (id) => client.patch(`/orders/${id}/cancel`)
export const apiRequestReturn = (id, productId, reason) =>
  client.patch(`/orders/${id}/return`, { productId, reason })
export const apiCreatePaymentOrder = (addressId) => client.post('/payment/create-order', { addressId })
export const apiVerifyPayment = (payload) => client.post('/payment/verify', payload)

// ---- REVIEWS ----
export const apiCreateReview = (productId, payload) => client.post(`/products/${productId}/reviews`, payload)
export const apiMyReviews = () => client.get('/reviews/mine')
export const apiUpdateReview = (id, payload) => client.put(`/reviews/${id}`, payload)
export const apiDeleteReview = (id) => client.delete(`/reviews/${id}`)

// ---- UPLOADS ----
// Backend multer field names: 'file' for a single image, 'document' for KYC.
export const apiUploadImage = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const apiUploadDocument = (file) => {
  const fd = new FormData()
  fd.append('document', file)
  return client.post('/uploads/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// ---- SELLER ----
export const apiSellerRegister = (payload) => client.post('/sellers/register', payload)
export const apiSellerStatus = () => client.get('/sellers/status')
export const apiSellerProfile = () => client.get('/sellers/profile')
export const apiSellerDashboard = () => client.get('/sellers/dashboard')
export const apiUpdateStore = (payload) => client.put('/sellers/store', payload)
export const apiSellerProducts = (params) => client.get('/seller/products', { params })
export const apiSellerProduct = (id) => client.get(`/seller/products/${id}`)
export const apiCreateProduct = (payload) => client.post('/seller/products', payload)
export const apiUpdateProduct = (id, payload) => client.put(`/seller/products/${id}`, payload)
export const apiDeleteProduct = (id) => client.delete(`/seller/products/${id}`)
export const apiSellerOrders = (params) => client.get('/sellers/orders', { params })
export const apiSellerOrder = (id) => client.get(`/sellers/orders/${id}`)
export const apiSellerUpdateItemStatus = (id, productId, status) =>
  client.patch(`/sellers/orders/${id}/status`, { productId, status })
export const apiSellerHandleReturn = (id, productId, action) =>
  client.patch(`/sellers/orders/${id}/return`, { productId, action })
export const apiSellerReturns = () => client.get('/sellers/returns')

// ---- ADMIN ----
export const apiAdminDashboard = () => client.get('/admin/dashboard')
export const apiAdminUsers = (params) => client.get('/admin/users', { params })
export const apiAdminUser = (id) => client.get(`/admin/users/${id}`)
export const apiAdminBlockUser = (id) => client.patch(`/admin/users/${id}/block`)
export const apiAdminUnblockUser = (id) => client.patch(`/admin/users/${id}/unblock`)
export const apiAdminSellers = (params) => client.get('/admin/sellers', { params })
export const apiAdminSeller = (id) => client.get(`/admin/sellers/${id}`)
export const apiAdminSellerAction = (id, action, payload = {}) =>
  client.patch(`/admin/sellers/${id}/${action}`, payload)
export const apiAdminProducts = (params) => client.get('/admin/products', { params })
export const apiAdminProductAction = (id, action, payload = {}) =>
  client.patch(`/admin/products/${id}/${action}`, payload)
export const apiAdminCategories = (params) => client.get('/admin/categories', { params })
export const apiCreateCategory = (payload) => client.post('/admin/categories', payload)
export const apiUpdateCategory = (id, payload) => client.put(`/admin/categories/${id}`, payload)
export const apiDeleteCategory = (id) => client.delete(`/admin/categories/${id}`)
export const apiAdminOrders = (params) => client.get('/admin/orders', { params })
export const apiAdminOrder = (id) => client.get(`/admin/orders/${id}`)
export const apiAdminUpdateOrderStatus = (id, productId, status) =>
  client.patch(`/admin/orders/${id}/status`, { productId, status })
export const apiAdminRefund = (id, productId) => client.patch(`/admin/orders/${id}/refund`, { productId })
export const apiAdminReturnDecision = (id, productId, action) =>
  client.patch(`/admin/orders/${id}/return`, { productId, action })
export const apiAdminReturns = (params) => client.get('/admin/returns', { params })
export const apiAdminReviews = (params) => client.get('/admin/reviews', { params })
export const apiAdminDeleteReview = (id) => client.delete(`/admin/reviews/${id}`)