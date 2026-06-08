import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { Skeleton } from '../components/ui/Skeleton'
import { ConfidenceGauge } from '../components/ui/ConfidenceGauge'
import { Badge } from '../components/ui/Badge'
import { useObservation, useObservationAnalysis } from '../hooks/useObservation'
import type { SatelliteData } from '../types'

import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function SatelliteBreakdownInner({ data }: { data: SatelliteData }) {
  const sources = [
    { name: 'Sentinel-1 SAR', icon: '\u{1F4E1}', data: [`Water: ${data.sar.waterPercentage ?? 'N/A'}%`, `Backscatter: ${data.sar.backscatterMean ?? 'N/A'} dB`], badge: data.sar.confidence === 'no_data' ? 'warning' as const : data.sar.confidence === 'high' ? 'success' as const : 'default' as const, badgeLabel: data.sar.confidence },
    { name: 'Sentinel-2 NDWI', icon: '\u{1F30D}', data: [`NDWI: ${data.ndwi.value ?? 'N/A'}`, data.ndwi.cloudCover !== null ? `Cloud: ${data.ndwi.cloudCover}%` : 'Tidak tersedia'], badge: data.ndwi.available ? 'success' as const : 'warning' as const, badgeLabel: data.ndwi.available ? 'Tersedia' : 'Tidak Tersedia' },
    { name: 'CHIRPS Rainfall', icon: '\u{1F327}', data: [`7-hari: ${data.chirps.rainfall7day_mm} mm`, `Trend: ${data.chirps.trend}`], badge: 'default' as const, badgeLabel: data.chirps.trend },
    { name: 'Soil Type', icon: '\u{1F3D7}', data: [`Tipe: ${data.soil.type}`], badge: 'default' as const, badgeLabel: data.soil.type },
    { name: 'Elevation (SRTM)', icon: '\u{26F0}', data: [`Elevasi: ${data.elevation.meters} m`, `Terrain: ${data.elevation.terrain}`], badge: 'default' as const, badgeLabel: data.elevation.terrain },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sources.map((s) => (
        <Card key={s.name}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{s.icon}</span>
              <span className="font-medium text-sm text-gray-200">{s.name}</span>
            </div>
            <Badge variant={s.badge} label={s.badgeLabel} />
          </div>
          {s.data.map((d, i) => (
            <p key={i} className="text-xs text-gray-400">{d}</p>
          ))}
        </Card>
      ))}
    </div>
  )
}

export default function Result() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: obsData, isLoading: obsLoading, error: obsError } = useObservation(id)
  const { data: analysisData } = useObservationAnalysis(id)

  useEffect(() => {
    if (obsError) return
  }, [obsError])

  if (obsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (obsError || !obsData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-4 block">{'\u{1F50D}'}</span>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Observasi tidak ditemukan</h2>
        <p className="text-gray-400 mb-6">Observasi dengan ID tersebut tidak tersedia.</p>
        <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
      </div>
    )
  }

  const isProcessing = obsData.observation.status === 'processing' || analysisData?.status === 'processing'

  if (isProcessing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Spinner className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-200 mb-2">Menganalisis data satelit...</h2>
        <p className="text-gray-400">Ini akan memakan waktu sekitar 15-30 detik.</p>
      </div>
    )
  }

  if (obsData.observation.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <span className="text-4xl mb-4 block">{'\u26A0\uFE0F'}</span>
        <h2 className="text-xl font-semibold text-red-400 mb-2">Analisis Gagal</h2>
        <p className="text-gray-400 mb-4">Terjadi kegagalan saat memproses observasi.</p>
        <Button onClick={() => navigate('/submit')}>Coba Lagi</Button>
      </div>
    )
  }

  const analysis = obsData.analysis
  const satellite = obsData.satellite_data

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Hasil Analisis</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(obsData.observation.timestamp).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Badge
          variant={obsData.observation.status === 'completed' ? 'success' : 'default'}
          label={obsData.observation.status === 'completed' ? 'Selesai' : obsData.observation.status}
        />
      </div>

      <Card className="mb-6 overflow-hidden p-0">
        <div className="h-[250px]">
          <MapContainer
            center={[obsData.observation.latitude, obsData.observation.longitude]}
            zoom={14}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker position={[obsData.observation.latitude, obsData.observation.longitude]} />
          </MapContainer>
        </div>
        <div className="px-4 py-2 text-xs text-gray-500">
          {obsData.observation.latitude.toFixed(6)}, {obsData.observation.longitude.toFixed(6)}
        </div>
      </Card>

      {analysis && (
        <>
          <Card className="mb-6">
            <ConfidenceGauge confidence={analysis.confidence} verdict={analysis.verdict} />
          </Card>

          <Card className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">{'\u{1F4A1}'} Analisis AI</h3>
              {analysis.anomalies?.some((a: string) => a.includes('Gemini')) && (
                <Badge variant="warning" label="AI Tidak Tersedia" />
              )}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">{analysis.reasoning}</p>
            {analysis.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rekomendasi</h4>
                <ul className="space-y-1">
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                      <span className="text-brand-400 mt-0.5">{'\u2713'}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </>
      )}

      {satellite && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{'\u{1F4E1}'} Data Satelit</h3>
          <SatelliteBreakdownInner data={satellite} />
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => navigate('/submit')}>Observasi Baru</Button>
        <Button variant="secondary" onClick={() => navigate('/map')}>Lihat Peta</Button>
      </div>
    </div>
  )
}
