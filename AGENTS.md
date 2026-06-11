# Water Presence Monitoring System — AGENTS

## Session Context (2026-06-11)

### Running Services

```bash
# All services via Docker Compose
cd /home/rasya-naufal/Coding/lomba/Water-Presence-Monitoring-System
docker compose -f docker-compose.dev.yml up -d --build

# Frontend (manual, terpisah)
cd frontend && npm run dev
```

| Service | Port | Status |
|---------|:----:|:------:|
| MongoDB 7 | 27017 | Docker |
| Python Worker (FastAPI) | 8000 | Docker |
| Backend (Bun/ElysiaJS) | 3000 | Docker |
| Frontend (React/Vite) | 5173 | Manual |

Frontend: http://localhost:5173

> **Catatan:** GEE tidak terautentikasi, python-worker otomatis fallback ke mock data.

### Bugs Fixed (branch: `fix/bugs`)

1. **Soil type selalu "clay"** — `python-worker/services/gee_pipeline.py`
   - Mock data hardcode `"soil": {"type": "clay"}` tanpa peduli lokasi
   - Fix: `_mock_result(lat, lng)` menggunakan hash koordinat → soil type bervariasi
   - Semua field mock lain (SAR, NDWI, CHIRPS, elevasi) juga dibuat bervariasi

2. **`waterPercentage = avg * 0.8` magic number** — `backend/src/services/pipeline.ts`
   - `RegionalIndex.waterPercentage` diisi `Math.round(avg * 0.8)` tanpa alasan
   - Fix: hapus field `waterPercentage` dari `RegionalIndex`, frontend pakai `waterIndex`

3. **Province bounding box tumpang tindih** — `backend/src/utils/geocode.ts`
   - `Sulawesi` overlap dengan Sulawesi Selatan/Tengah/Barat
   - `Maluku` overlap dengan Maluku Utara
   - `Papua` overlap dengan Papua Selatan/Tengah/Pegunungan
   - Fix: urutkan provinsi spesifik sebelum provinsi umum

### Files Modified

| File | Change |
|------|--------|
| `python-worker/services/gee_pipeline.py` | Mock data dinamis per koordinat |
| `backend/src/models/RegionalIndex.ts` | Hapus field `waterPercentage` |
| `backend/src/services/pipeline.ts` | Hapus `waterPercentage: avg * 0.8` |
| `backend/src/services/map.ts` | Hapus `waterPercentage` dari response |
| `backend/src/services/region.ts` | Hapus `waterPercentage` dari response |
| `backend/src/utils/geocode.ts` | Urut ulang provinsi spesifik duluan |
| `backend/src/__tests__/api.test.ts` | Update test data |
| `frontend/src/types/index.ts` | Hapus `waterPercentage` dari `RegionData` |
| `frontend/src/pages/Home.tsx` | Ganti `waterPercentage` → `waterIndex` |
| `frontend/src/pages/Map.tsx` | Ganti `waterPercentage` → `waterIndex` |
| `frontend/src/components/ui/ConfidenceGauge.tsx` | Fix SVG gauge rotation |

### Branch

Semua perubahan ada di branch `fix/bugs`:
```
https://github.com/FarrelGhozy/Water-Presence-Monitoring-System/tree/fix/bugs
```

Belum di-merge ke `main`. Buat PR jika ingin merge.

### What's Next / Ideas

- Autentikasi GEE (`earthengine authenticate`) untuk data satelit real
- Perbaiki pipeline error handling (banyak observasi status `error`)
- Province bounding box masih rough (pake polygon sebenarnya lebih akurat)
- OpenRouter API key di .env perlu diisi ulang jika habis masa
- Perhatikan port: `.env.example` pakai `:8000`, pastikan konsisten
