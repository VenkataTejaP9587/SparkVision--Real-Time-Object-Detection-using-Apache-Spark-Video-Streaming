import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bda_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 ─────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bda_token')
      localStorage.removeItem('bda_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  profile:  ()     => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
}

// ── Videos ───────────────────────────────────────────────────────────────────
export const videoAPI = {
  upload: (formData, onProgress) =>
    api.post('/videos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  list:   (page = 1, perPage = 10) => api.get(`/videos/?page=${page}&per_page=${perPage}`),
  get:    (id)  => api.get(`/videos/${id}`),
  delete: (id)  => api.delete(`/videos/${id}`),
}

// ── Detection ─────────────────────────────────────────────────────────────────
export const detectionAPI = {
  start:  (videoId) => api.post(`/detection/start/${videoId}`),
  stop:   (videoId) => api.post(`/detection/stop/${videoId}`),
  status: (videoId) => api.get(`/detection/status/${videoId}`),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard:              () => api.get('/analytics/dashboard'),
  topObjects:             (limit = 10) => api.get(`/analytics/top-objects?limit=${limit}`),
  timeline:               () => api.get('/analytics/timeline'),
  confidenceDistribution: () => api.get('/analytics/confidence-distribution'),
  sparkResults:           () => api.get('/analytics/spark-results'),
}

// ── History ───────────────────────────────────────────────────────────────────
export const historyAPI = {
  list:      (params) => api.get('/history/', { params }),
  delete:    (id)     => api.delete(`/history/${id}`),
  exportCSV: ()       => api.get('/history/export/csv', { responseType: 'blob' }),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  generate: (type, filters = {}) => api.post('/reports/generate', { type, filters }),
  download: (id)  => api.get(`/reports/download/${id}`, { responseType: 'blob' }),
  list:     ()    => api.get('/reports/list'),
}

export default api
