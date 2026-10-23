import axios from 'axios'
import type {
  DashboardSummary, Conversation, Evidence, Commitment,
  ImportBatch, AuditEvent, PaginatedResponse, RoutingDecision
} from '@/types'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error'
    return Promise.reject(new Error(String(msg)))
  }
)

// ── Health ─────────────────────────────────────────────
export const getHealth = () => api.get('/health').then(r => r.data)

// ── Dashboard ──────────────────────────────────────────
export const getDashboard = (): Promise<DashboardSummary> =>
  api.get('/dashboard/summary').then(r => r.data)

// ── Conversations / Deals ──────────────────────────────
export const getConversations = (params?: Record<string, unknown>): Promise<PaginatedResponse<Conversation>> =>
  api.get('/conversations', { params }).then(r => r.data)

export const getConversation = (id: string): Promise<Conversation> =>
  api.get(`/conversations/${id}`).then(r => r.data)

// ── Evidence ───────────────────────────────────────────
export const getEvidence = (params?: Record<string, unknown>): Promise<PaginatedResponse<Evidence>> =>
  api.get('/evidence', { params }).then(r => r.data)

// ── Commitments ────────────────────────────────────────
export const getCommitments = (params?: Record<string, unknown>): Promise<PaginatedResponse<Commitment>> =>
  api.get('/commitments', { params }).then(r => r.data)

export const updateCommitmentStatus = (
  id: string,
  status: string,
  reason?: string
): Promise<Commitment> =>
  api.patch(`/commitments/${id}`, { status, reason }).then(r => r.data)

// ── Routing ────────────────────────────────────────────
export const getDealRouting = (dealId: string): Promise<RoutingDecision> =>
  api.get(`/deals/${dealId}/routing`).then(r => r.data)

export const overrideDealRoute = (
  dealId: string,
  payload: { manual_route: string; override_reason?: string; overridden_by?: string }
): Promise<RoutingDecision> =>
  api.post(`/deals/${dealId}/route-override`, payload).then(r => r.data)

// ── Imports ────────────────────────────────────────────
export const uploadFile = (file: File): Promise<ImportBatch> => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/imports', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then(r => r.data)
}

export const getImports = (params?: Record<string, unknown>): Promise<PaginatedResponse<ImportBatch>> =>
  api.get('/imports', { params }).then(r => r.data)

export const getImportErrors = (batchId: string) =>
  api.get(`/imports/${batchId}/errors`).then(r => r.data)

// ── Audit ──────────────────────────────────────────────
export const getAuditEvents = (params?: Record<string, unknown>): Promise<PaginatedResponse<AuditEvent>> =>
  api.get('/audit', { params }).then(r => r.data)

// ── Exports ────────────────────────────────────────────
export const createExport = async (): Promise<void> => {
  const response = await api.post('/exports', null, {
    responseType: 'blob',
    timeout: 60000,
  })
  const url = URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = response.headers['content-disposition']?.split('filename=')[1] || 'dealradar_export.zip'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Search ─────────────────────────────────────────────
export const globalSearch = (q: string) =>
  api.get('/search', { params: { q } }).then(r => r.data)

export default api
