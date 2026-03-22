import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(new Error(err.response?.data?.error || err.message || 'Request failed'))
)

export const analysesApi = {
  getAll:     (params) => api.get('/analyses', { params }),
  getSummary: ()       => api.get('/analyses/summary'),
  getById:    (id)     => api.get(`/analyses/${id}`),
  create:     (data)   => api.post('/analyses', data),
  delete:     (id)     => api.delete(`/analyses/${id}`),
}

export const resourcesApi = {
  getAll: (params) => api.get('/resources', { params }),
}

export const recommendationsApi = {
  getAll:       (params)       => api.get('/recommendations', { params }),
  updateStatus: (id, status)   => api.patch(`/recommendations/${id}/status`, { status }),
}

export const riskApi = {
  getAll: (params) => api.get('/risk', { params }),
}

export const terraformApi = {
  getAnalysis: ()     => api.get('/terraform/analysis'),
  estimate:    (code) => api.post('/terraform/estimate', { code }),
}

export const aiApi = {
  chat:            (messages)               => api.post('/ai/chat', { messages }),
  analyzeTerraform:(code)                   => api.post('/ai/analyze-terraform', { code }),
  generateReport:  (analysisId, reportType) => api.post('/ai/generate-report', { analysisId, reportType }),
}

export default api
