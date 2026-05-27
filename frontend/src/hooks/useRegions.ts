import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: () => api.getRegions(),
    staleTime: 60_000,
  })
}
