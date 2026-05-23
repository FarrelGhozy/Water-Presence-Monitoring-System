# WATER PRESENCE MONITORING SYSTEM — MVP PLAN

## Filosofi MVP

**"Satu observasi diproses oleh GEE + Gemini, baru scale."**

Bukan:
- Foto dianalisis Gemini secara langsung
- Weighted formula confidence scoring
- Comparison engine

Tapi:
- **1 database** (MongoDB)
- **1 platform satelit** (GEE — multi-source)
- **1 AI analyst** (Gemini — untuk interpretasi data satelit)
- **1 runtime** (Bun) + **Python worker** (GEE)

---

## Arsitektur MVP (Revolutionary)

```
USER → React Form + Camera (foto = referensi visual)
         ↓
    Bun/ElysiaJS Backend
         ↓
    Python Worker → GEE Multi-Source:
    ├─ Sentinel-1 SAR → water mask (tembus awan)
    ├─ Sentinel-2     → NDWI (jika awan rendah)
    ├─ CHIRPS         → rainfall 7 hari
    ├─ OpenLandMap    → soil type
    └─ SRTM           → elevation
         ↓
    ALL DATA → Gemini 2.0 Flash (AI Analyst)
    ├─ Menganalisis data satelit
    ├─ Memberikan confidence score
    └─ Natural language assessment
         ↓
USER → Lihat: Confidence + AI Assessment + Peta Indonesia + Breakdown Satelit
```

**Tidak dipakai di MVP:**
- ❌ PostgreSQL / PostGIS → cukup MongoDB
- ❌ BMKG API → ganti CHIRPS via GEE (lebih reliable)
- ❌ Redis / Bull queue → proses sync dulu
- ❌ Gemini photo analysis → foto hanya referensi visual

---

## Database Schema (MVP — Cuma MongoDB)

### Collection: `observations`
```json
{
  "_id": "ObjectId",
  "photoUrl": "string",
  "latitude": "number",
  "longitude": "number",
  "province": "string",
  "timestamp": "Date",
  "status": "processing|completed|error"
}
```

### Collection: `satellite_data`
```json
{
  "_id": "ObjectId",
  "observationId": "ObjectId",
  "sar": {
    "waterPercentage": 34.2,
    "backscatterMean": -18.5,
    "confidence": "high"
  },
  "ndwi": {
    "value": 0.42,
    "cloudCover": 15,
    "available": true
  },
  "chirps": {
    "rainfall7day_mm": 120,
    "trend": "increasing"
  },
  "soil": {
    "type": "clay loam"
  },
  "elevation": {
    "meters": 45,
    "terrain": "flat"
  }
}
```

### Collection: `gemini_analysis`
```json
{
  "_id": "ObjectId",
  "observationId": "ObjectId",
  "confidence": 78,
  "verdict": "probable",
  "reasoning": "SAR analysis shows 34.2% water coverage...",
  "recommendations": ["Site verification recommended"]
}
```

---

## API Endpoints (MVP)

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/observations` | Submit GPS + foto |
| GET | `/api/observations/:id` | Detail hasil + analisis |
| GET | `/api/regions` | Data water index per provinsi (buat peta) |
| GET | `/api/health` | Health check |

Total: **4 endpoint**. Simple.

---

## Frontend Pages (MVP)

| Page | Konten |
|------|--------|
| **Home** | Hero + peta choropleth Indonesia + tombol "Submit" |
| **Submit** | GPS + camera + submit |
| **Result** | AI Assessment + confidence gauge + breakdown satelit + map |
| **Map** | Peta Indonesia choropleth + marker |

---

## User Flow MVP

```
1. Buka app → Lihat peta Indonesia (warna per provinsi dari GEE)
2. Klik "Submit Observation"
3. GPS auto-fill + ambil foto
4. Submit → Loading... (15-30 detik)
5. GEE proses SAR + NDWI + CHIRPS + Soil + Elevation
6. Gemini analisis semua data → hasil
7. Muncul: "78% confidence — PROBABLE water presence"
8. Observasi update peta
```

**Waktu tunggu: 15-30 detik.** Didominasi GEE query time.

---

## Kenapa Ini Cukup untuk Kompetisi?

| Kriteria | Dengan MVP Ini |
|----------|---------------|
| **Innovation** | Multi-source satellite + AI analyst — unik dan canggih |
| **Technical Execution** | Integrasi GEE multi-source + Gemini — impressive |
| **Practical Impact** | Peta Indonesia real-time dari satelit — dampak nyata |
| **Presentation** | Demo: tunjukkan peta Indonesia berwarna + analisis AI |
| **Team Capability** | Menguasai GEE, remote sensing, dan AI integration |

Yang juri lihat: **produk yang jalan dengan teknologi canggih**.

---

## Roadmap MVP (3 Minggu)

### Week 1: Foundation + GEE Setup
```
Day 1: Setup Bun + ElysiaJS + MongoDB
Day 2: Python worker skeleton + GEE auth
Day 3: Integrasi Sentinel-1 SAR (water mask)
Day 4: Integrasi Sentinel-2 NDWI + CHIRPS + Soil + Elevation
Day 5: Test GEE multi-source pipeline → output JSON
```

### Week 2: AI + Result Pipeline
```
Day 1: Gemini integration — kirim data satelit → dapat analysis
Day 2: Backend: full flow (submit → GEE → Gemini → result)
Day 3: Frontend: form submit + loading + result page
Day 4: Frontend: peta choropleth Indonesia (GeoJSON)
Day 5: Integrasi frontend-backend end-to-end
```

### Week 3: Polish + Testing
```
Day 1-2: Testing 5-10 lokasi berbeda + validasi akurasi
Day 3-4: UI polish, error handling, caching
Day 5: Deploy Vercel + Railway, demo prep
```

---

## Checklist MVP

- [ ] GEE Python worker: Sentinel-1 SAR water mask berfungsi
- [ ] GEE Python worker: CHIRPS + OpenLandMap + SRTM berfungsi
- [ ] Gemini: analisis data satelit → confidence + verdict
- [ ] Backend: full pipeline submit → GEE → Gemini → result
- [ ] Frontend: form submit + GPS + camera
- [ ] Frontend: result page (AI assessment + confidence)
- [ ] Frontend: Peta choropleth Indonesia (GeoJSON)
- [ ] Deploy ke Vercel + Railway
- [ ] Demo: 5 observasi real → berhasil semua
