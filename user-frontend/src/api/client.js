import axios from 'axios'

const LOCAL_API_URL = 'http://localhost:5000/api'
const PRODUCTION_API_URL = 'https://shophub-api-4vp2.onrender.com/api'

const getApiUrl = () => {
  if (typeof window === 'undefined') return PRODUCTION_API_URL

  const { hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_URL
  }

  return PRODUCTION_API_URL
}

export const API_URL = getApiUrl()

const client = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  // Remove Content-Type header for FormData to let browser set multipart/form-data with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const body = error?.response?.data
  if (body?.errors?.length) {
    const parts = body.errors.map((e) => {
      if (typeof e === 'string') return e
      const msg = e.message || e.msg
      if (!msg) return ''
      const field = e.field || e.param || ''
      if (!field || /^kyc/i.test(field)) return msg
      return `${field}: ${msg}`
    })
    const clean = parts.filter(Boolean)
    if (clean.length) return clean.join('; ')
  }
  if (body?.message) return body.message
  return fallback
}

export default client