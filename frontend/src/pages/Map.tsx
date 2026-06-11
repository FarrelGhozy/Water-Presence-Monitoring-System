import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { useRegions } from '../hooks/useRegions'
import { useObservations } from '../hooks/useObservation'
import type { ObservationSummary } from '../types'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const GEOJSON_PROVINCE_MAP: Record<string, string> = {
  'Jakarta Raya': 'DKI Jakarta',
  'Bangka-Belitung': 'Bangka Belitung',
  Yogyakarta: 'DI Yogyakarta',
}

const statusColors: Record<string, string> = {
  completed: '#22c55e',
  processing: '#3b82f6',
  error: '#ef4444',
  pending: '#9ca3af',
}

function getConfidenceColor(avg: number | undefined): string {
  if (avg === undefined) return '#334155'
  if (avg <= 25) return '#ef4444'
  if (avg <= 50) return '#f97316'
  if (avg <= 75) return '#eab308'
  return '#22c55e'
}

function MapBoundsUpdater({ onBoundsChange }: { onBoundsChange: (bbox: string) => void }) {
  const map = useMap()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        const b = map.getBounds()
        onBoundsChange(`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`)
      }, 500)
    }
    map.on('moveend', handler)
    handler()
    return () => {
      map.off('moveend', handler)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [map, onBoundsChange])

  return null
}

export default function MapPage() {
  const [bbox, setBbox] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const { data: regionsData, isLoading: regionsLoading } = useRegions()
  const { data: obsData, isLoading: obsLoading } = useObservations(
    bbox ? { bbox, status: statusFilter || undefined, limit: 200 } : undefined
  )
  const [geoJsonData, setGeoJsonData] = useState<any>(null)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson')
      .then((r) => r.json())
      .then(setGeoJsonData)
      .catch(() => setGeoJsonData(null))
  }, [])

  const handleBoundsChange = useCallback((newBbox: string) => {
    setBbox(newBbox)
  }, [])

  const regionsMap = new Map(regionsData?.regions?.map((r) => [r.province.toLowerCase(), r]) || [])
  const observations = obsData?.observations ?? []

  return (
    <div className="h-[calc(100vh-56px)] relative z-0">
      {regionsLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-dark/50">
          <Spinner className="w-8 h-8" />
        </div>
      )}

      <MapContainer center={[-2.5, 118]} zoom={5} className="h-full w-full" zoomControl={false}>
        <TileLayer
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapBoundsUpdater onBoundsChange={handleBoundsChange} />

        {geoJsonData && (
          <GeoJSON
            key={regionsData?.regions?.length ?? 0}
            data={geoJsonData}
            style={(feature) => {
              const rawName = feature?.properties?.state || ''
              const mappedName = GEOJSON_PROVINCE_MAP[rawName] || rawName
              const province = regionsMap.get(mappedName.toLowerCase())
              return {
                fillColor: getConfidenceColor(province?.waterIndex),
                weight: 1,
                opacity: 0.8,
                color: '#1e293b',
                fillOpacity: 0.7,
              }
            }}
            onEachFeature={(feature, layer) => {
              const rawName = feature.properties?.state || ''
              const mappedName = GEOJSON_PROVINCE_MAP[rawName] || rawName
              const region = regionsMap.get(mappedName.toLowerCase())
              layer.bindTooltip(
                `<b>${rawName}</b><br/>Observasi: ${region?.observationCount ?? 0}<br/>Air: ${region?.waterIndex !== undefined ? `${region.waterIndex}%` : 'N/A'}`,
                { className: 'bg-gray-900 text-gray-200 border border-gray-700' }
              )
            }}
          />
        )}

        {observations.map((obs: ObservationSummary) => (
          <Marker
            key={obs._id}
            position={[obs.latitude, obs.longitude]}
            icon={L.divIcon({
              className: 'border-0 bg-transparent',
              html: `<div style="width:12px;height:12px;border-radius:50%;background:${statusColors[obs.status] || '#9ca3af'};border:2px solid #0a0f1a;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            })}
          >
            <Popup className="bg-gray-900 text-gray-200 border border-gray-700">
              <div className="text-xs">
                <p className="font-semibold mb-1">Observasi</p>
                <p>Lat: {obs.latitude.toFixed(4)}</p>
                <p>Lng: {obs.longitude.toFixed(4)}</p>
                <p>Status: {obs.status}</p>
                <a
                  href={`/result/${obs._id}`}
                  className="text-brand-400 hover:text-brand-300 mt-1 inline-block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat Detail
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <Card className="p-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Filter Status</h3>
          <div className="flex flex-wrap gap-1">
            {['', 'completed', 'processing', 'error'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded ${
                  statusFilter === s
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {s || 'Semua'}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            Completed
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
            Processing
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            Error
          </div>
        </Card>

        {observations.length === 0 && !obsLoading && (
          <Card className="p-3">
            <p className="text-xs text-gray-500">Tidak ada observasi dengan filter ini</p>
          </Card>
        )}
      </div>
    </div>
  )
}
