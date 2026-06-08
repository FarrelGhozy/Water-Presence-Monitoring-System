import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, type GeoJSONProps } from 'react-leaflet'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useRegions } from '../hooks/useRegions'
import 'leaflet/dist/leaflet.css'

function getConfidenceColor(avg: number | undefined): string {
  if (avg === undefined) return '#334155'
  if (avg <= 25) return '#ef4444'
  if (avg <= 50) return '#f97316'
  if (avg <= 75) return '#eab308'
  return '#22c55e'
}

export default function Home() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useRegions()
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONProps['data'] | null>(null)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson')
      .then((r) => r.json())
      .then(setGeoJsonData)
      .catch(() => setGeoJsonData(null))
  }, [])

  const regionsMap = new Map(data?.regions?.map((r) => [r.province.toLowerCase(), r]) || [])

  const totalObservations = data?.regions?.reduce((sum, r) => sum + r.observationCount, 0) ?? 0
  const provincesWithData = data?.regions?.length ?? 0

  return (
    <div>
      <section className="relative overflow-hidden border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-100 leading-tight mb-4">
              Water Presence Monitoring System
            </h1>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Platform citizen science untuk memantau keberadaan air permukaan di Indonesia
              menggunakan data satelit multi-source dan analisis AI.
            </p>
            <Button size="lg" onClick={() => navigate('/submit')}>
              Mulai Observasi
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <div className="text-2xl font-bold text-gray-100">{totalObservations}</div>
            <div className="text-sm text-gray-400">Total Observasi</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-gray-100">{provincesWithData}</div>
            <div className="text-sm text-gray-400">Provinsi Terobservasi</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-gray-100">
              {provincesWithData > 0
                ? Math.round(data!.regions.reduce((s, r) => s + r.waterPercentage, 0) / provincesWithData)
                : 0}%
            </div>
            <div className="text-sm text-gray-400">Rata-rata Keberadaan Air</div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Peta Indonesia</h2>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-64" />
            </div>
          )}

          {error && (
            <EmptyState
              icon="warning"
              title="Gagal memuat data wilayah"
              description="Tidak dapat memuat data peta. Periksa koneksi internet Anda."
              action={{ label: 'Coba Lagi', onClick: () => window.location.reload() }}
            />
          )}

          {!isLoading && !error && (
            <div className="h-[400px] md:h-[500px] rounded-lg overflow-hidden">
              {geoJsonData ? (
                <MapContainer center={[-2.5, 118]} zoom={5} className="h-full w-full" zoomControl={false}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <GeoJSON
                    key={provincesWithData}
                    data={geoJsonData}
                    style={(feature) => {
                      const province = regionsMap.get((feature?.properties?.NAME_1 || '').toLowerCase())
                      return {
                        fillColor: getConfidenceColor(province?.waterPercentage),
                        weight: 1,
                        opacity: 0.8,
                        color: '#1e293b',
                        fillOpacity: 0.7,
                      }
                    }}
                    onEachFeature={(feature, layer) => {
                      const name = feature.properties?.NAME_1 || ''
                      const region = regionsMap.get(name.toLowerCase())
                      layer.bindTooltip(
                        `<b>${name}</b><br/>Observasi: ${region?.observationCount ?? 0}<br/>Air: ${region?.waterPercentage !== undefined ? `${region.waterPercentage}%` : 'N/A'}`,
                        { className: 'bg-gray-900 text-gray-200 border border-gray-700 text-sm' }
                      )
                    }}
                  />
                </MapContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Memuat peta...
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && provincesWithData === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Belum ada observasi. Jadilah yang pertama!</p>
              <Button className="mt-2" size="sm" onClick={() => navigate('/submit')}>
                Mulai Observasi
              </Button>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
