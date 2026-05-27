import { useState, useCallback } from 'react'

interface GeolocationState {
  loading: boolean
  error: string | null
  position: { lat: number; lng: number } | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    position: null,
  })

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Browser tidak mendukung GPS' }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          loading: false,
          error: null,
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
      },
      (err) => {
        const messages: Record<number, string> = {
          [err.PERMISSION_DENIED]: 'GPS tidak diaktifkan. Pilih lokasi di peta.',
          [err.POSITION_UNAVAILABLE]: 'Posisi tidak tersedia.',
          [err.TIMEOUT]: 'Gagal mendapatkan lokasi. Coba lagi.',
        }
        setState((s) => ({ ...s, loading: false, error: messages[err.code] || 'Gagal mendapatkan lokasi.' }))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  return { ...state, requestPosition }
}
