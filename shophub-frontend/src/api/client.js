import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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