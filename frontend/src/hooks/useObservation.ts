import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

export function useObservation(id: string) {
  return useQuery({
    queryKey: ['observation', id],
    queryFn: () => api.getObservation(id),
    enabled: !!id,
  })
}

export function useObservationAnalysis(id: string) {
  return useQuery({
    queryKey: ['analysis', id],
    queryFn: () => api.getAnalysis(id),
    enabled: !!id,
    refetchInterval: (query) => {
      if (query.state.data?.status === 'processing') return 3000
      return false
    },
  })
}

export function useSubmitObservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: string; lng: string }) => api.submitObservation(lat, lng),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] })
    },
  })
}

export function useObservations(params?: { status?: string; limit?: number; offset?: number; bbox?: string }) {
  return useQuery({
    queryKey: ['observations', params],
    queryFn: () => api.getObservations(params),
  })
}
