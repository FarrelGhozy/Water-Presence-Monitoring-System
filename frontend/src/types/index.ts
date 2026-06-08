export interface ObservationSummary {
  _id: string
  latitude: number
  longitude: number
  province: string | null
  timestamp: string
  status: 'pending' | 'processing' | 'completed' | 'error'
}

export interface ObservationDetail {
  observation: {
    _id: string
    latitude: number
    longitude: number
    province: string | null
    timestamp: string
    status: 'pending' | 'processing' | 'completed' | 'error'
  }
  satellite_data: SatelliteData | null
  analysis: GeminiAnalysis | null
}

export interface SatelliteData {
  sar: { waterPercentage: number | null; backscatterMean: number | null; confidence: string }
  ndwi: { value: number | null; available: boolean; cloudCover: number | null }
  chirps: { rainfall7day_mm: number; trend: string }
  soil: { type: string }
  elevation: { meters: number; terrain: string }
}

export interface GeminiAnalysis {
  confidence: number
  verdict: 'definitive' | 'probable' | 'possible' | 'unlikely'
  reasoning: string
  contributingFactors: string[]
  anomalies: string[]
  recommendations: string[]
}

export interface RegionData {
  province: string
  waterIndex: number
  waterPercentage: number
  observationCount: number
  lastUpdated: string
}

export interface AnalysisResult {
  status: 'processing' | 'completed' | 'error'
  confidence?: number | null
  verdict?: string | null
  reasoning?: string | null
  contributingFactors?: string[]
  anomalies?: string[]
  recommendations?: string[]
  satellite?: SatelliteData | null
  message?: string
}
