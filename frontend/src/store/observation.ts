import { create } from 'zustand'

interface ObservationStore {
  selectedLocation: { lat: number; lng: number } | null
  setSelectedLocation: (loc: { lat: number; lng: number }) => void
  clearSelection: () => void
}

export const useObservationStore = create<ObservationStore>((set) => ({
  selectedLocation: null,
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),
  clearSelection: () => set({ selectedLocation: null }),
}))
