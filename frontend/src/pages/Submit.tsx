import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L, { type LeafletMouseEvent } from 'leaflet'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSubmitObservation } from '../hooks/useObservation'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapClickHandler({ onMapClick }: { onMapClick: (e: LeafletMouseEvent) => void }) {
  useMapEvents({ click: onMapClick })
  return null
}

export default function Submit() {
  const navigate = useNavigate()
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const { loading: gpsLoading, error: gpsError, position: gpsPosition, requestPosition } = useGeolocation()
  const submitMutation = useSubmitObservation()

  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
  }, [])

  const handleUseGPS = () => {
    requestPosition()
  }

  const center = gpsPosition || position || { lat: -2.5, lng: 118 }

  const handleSubmit = async () => {
    if (!position) return
    try {
      const result = await submitMutation.mutateAsync({
        lat: String(position.lat),
        lng: String(position.lng),
      })
      navigate(`/result/${result.observation_id}`)
    } catch {
      // error handled by mutation state
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-4">Observasi Baru</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Card className="overflow-hidden p-0">
            <div className="h-[400px] md:h-[500px]">
              <MapContainer center={center} zoom={position || gpsPosition ? 15 : 5} className="h-full w-full">
                <TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapClickHandler onMapClick={handleMapClick} />
                {(position || gpsPosition) && (
                  <Marker position={[position?.lat ?? gpsPosition!.lat, position?.lng ?? gpsPosition!.lng]} />
                )}
              </MapContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Pilih Lokasi</h3>
            <p className="text-xs text-gray-500 mb-4">
              Klik di peta untuk memilih lokasi, atau gunakan GPS otomatis.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full mb-3"
              onClick={handleUseGPS}
              loading={gpsLoading}
            >
              {gpsLoading ? 'Mendeteksi...' : '\u{1F4CD} Gunakan Lokasi Saya'}
            </Button>
            {gpsError && (
              <p className="text-xs text-red-400 mb-3">{gpsError}</p>
            )}
          </Card>

          {position && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Koordinat</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-400">
                  Latitude: <span className="text-gray-200 font-mono">{position.lat.toFixed(6)}</span>
                </p>
                <p className="text-gray-400">
                  Longitude: <span className="text-gray-200 font-mono">{position.lng.toFixed(6)}</span>
                </p>
              </div>
              <Button
                className="w-full mt-4"
                size="sm"
                onClick={handleSubmit}
                loading={submitMutation.isPending}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Menganalisis...' : 'Kirim Observasi'}
              </Button>
              {submitMutation.isError && (
                <p className="text-xs text-red-400 mt-2">
                  Gagal mengirim. {submitMutation.error instanceof Error ? submitMutation.error.message : 'Coba lagi.'}
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
