import type { ObservationDetail, AnalysisResult, RegionData, ObservationSummary } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
const API_KEY = import.meta.env.VITE_API_KEY || ''

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (API_KEY) headers['x-api-key'] = API_KEY
  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  getRegions: () => request<{ regions: RegionData[] }>('/regions'),

  getObservation: (id: string) => request<ObservationDetail>(`/observations/${id}`),

  getAnalysis: (id: string) => request<AnalysisResult>(`/observations/${id}/analysis`),

  submitObservation: (lat: string, lng: string) =>
    request<{ observation_id: string; status: string; message: string }>('/observations', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    }),

  getObservations: (params?: { status?: string; limit?: number; offset?: number; bbox?: string }) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.offset) search.set('offset', String(params.offset))
    if (params?.bbox) search.set('bbox', params.bbox)
    const qs = search.toString()
    return request<{ observations: ObservationSummary[]; total: number }>(`/observations${qs ? `?${qs}` : ''}`)
  },
}
