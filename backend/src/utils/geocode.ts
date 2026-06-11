interface BBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

const PROVINCES: Record<string, BBox> = {
  Aceh: { minLat: 2, maxLat: 6, minLng: 95, maxLng: 98 },
  'Sumatera Utara': { minLat: 0, maxLat: 4, minLng: 97, maxLng: 101 },
  'Sumatera Barat': { minLat: -2, maxLat: 1, minLng: 98, maxLng: 102 },
  Riau: { minLat: -1, maxLat: 3, minLng: 100, maxLng: 105 },
  Jambi: { minLat: -3, maxLat: -1, minLng: 101, maxLng: 105 },
  'Sumatera Selatan': { minLat: -5, maxLat: -1, minLng: 102, maxLng: 106 },
  Bengkulu: { minLat: -6, maxLat: -2, minLng: 101, maxLng: 104 },
  Lampung: { minLat: -6, maxLat: -3, minLng: 103, maxLng: 106 },
  'Bangka Belitung': { minLat: -4, maxLat: -1, minLng: 105, maxLng: 110 },
  'Kepulauan Riau': { minLat: -1, maxLat: 5, minLng: 103, maxLng: 109 },
  'DKI Jakarta': { minLat: -6.4, maxLat: -6, minLng: 106.6, maxLng: 107 },
  'Jawa Barat': { minLat: -8, maxLat: -5, minLng: 105, maxLng: 109 },
  'Jawa Tengah': { minLat: -8, maxLat: -5, minLng: 108, maxLng: 112 },
  'DI Yogyakarta': { minLat: -8.2, maxLat: -7.5, minLng: 110, maxLng: 111 },
  'Jawa Timur': { minLat: -9, maxLat: -5, minLng: 111, maxLng: 115 },
  Banten: { minLat: -7, maxLat: -5, minLng: 105, maxLng: 107 },
  Bali: { minLat: -9, maxLat: -8, minLng: 114, maxLng: 116 },
  'Nusa Tenggara Barat': { minLat: -9, maxLat: -8, minLng: 115, maxLng: 120 },
  'Nusa Tenggara Timur': { minLat: -11, maxLat: -8, minLng: 118, maxLng: 125 },
  'Kalimantan Barat': { minLat: -3, maxLat: 3, minLng: 108, maxLng: 114 },
  'Kalimantan Tengah': { minLat: -4, maxLat: 0, minLng: 110, maxLng: 116 },
  'Kalimantan Selatan': { minLat: -5, maxLat: -1, minLng: 114, maxLng: 117 },
  'Kalimantan Timur': { minLat: -3, maxLat: 3, minLng: 113, maxLng: 119 },
  'Kalimantan Utara': { minLat: 1, maxLat: 5, minLng: 114, maxLng: 118 },
  'Sulawesi Utara': { minLat: 0, maxLat: 5, minLng: 123, maxLng: 127 },
  'Sulawesi Tengah': { minLat: -4, maxLat: 2, minLng: 119, maxLng: 124 },
  'Sulawesi Selatan': { minLat: -7, maxLat: -1, minLng: 118, maxLng: 122 },
  'Sulawesi Tenggara': { minLat: -6, maxLat: -2, minLng: 120, maxLng: 125 },
  Gorontalo: { minLat: 0, maxLat: 2, minLng: 121, maxLng: 124 },
  'Sulawesi Barat': { minLat: -4, maxLat: -1, minLng: 118, maxLng: 120 },
  'Maluku Utara': { minLat: -3, maxLat: 4, minLng: 124, maxLng: 130 },
  'Papua Barat': { minLat: -5, maxLat: 2, minLng: 128, maxLng: 134 },
  'Papua Selatan': { minLat: -8, maxLat: -4, minLng: 138, maxLng: 141 },
  'Papua Tengah': { minLat: -5, maxLat: -2, minLng: 135, maxLng: 140 },
  'Papua Pegunungan': { minLat: -5, maxLat: -2, minLng: 137, maxLng: 141 },
  Sulawesi: { minLat: -6, maxLat: 2, minLng: 118, maxLng: 122 },
  Maluku: { minLat: -5, maxLat: -1, minLng: 124, maxLng: 131 },
  Papua: { minLat: -8, maxLat: 0, minLng: 131, maxLng: 141 },
}

export function latLngToProvince(lat: number, lng: number): string | null {
  for (const [province, bbox] of Object.entries(PROVINCES)) {
    if (lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng) {
      return province
    }
  }
  return null
}
