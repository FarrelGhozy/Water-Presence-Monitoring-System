export interface SarData {
  waterPercentage: number | null
  backscatterMean: number | null
  confidence: 'high' | 'low' | 'no_data'
}

export interface NdwiData {
  value: number | null
  available: boolean
  cloudCover: number | null
}

export interface ChirpsData {
  rainfall7day_mm: number
  trend: string
}

export interface SoilData {
  type: string
}

export interface ElevationData {
  meters: number
  terrain: string
}

export interface SatelliteDataPayload {
  sar: SarData
  ndwi: NdwiData
  chirps: ChirpsData
  soil: SoilData
  elevation: ElevationData
}

export type Verdict = 'definitive' | 'probable' | 'possible' | 'unlikely'

export interface GeminiAnalysisResult {
  confidence: number
  verdict: Verdict
  reasoning: string
  recommendations: string[]
}
