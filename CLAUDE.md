# Water Presence Monitoring System

Citizen science platform untuk memantau keberadaan air permukaan di Indonesia menggunakan data satelit multi-source (GEE) + analisis AI (Gemini 2.0 Flash).

## Arsitektur

```
User (GPS) → Backend API (Bun/ElysiaJS) → Python Worker (FastAPI + GEE) → Gemini AI → Hasil
                                   ↓
                              MongoDB 7
```

**5-source GEE pipeline:** Sentinel-1 SAR (primer, tembus awan), Sentinel-2 NDWI, CHIRPS rainfall, OpenLandMap soil, SRTM elevation.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Bun + ElysiaJS + TypeScript |
| Python Worker | FastAPI + earthengine-api |
| Database | MongoDB 7 (Mongoose) |
| AI | Gemini 2.0 Flash (REST API, text-only) |
| Container | Docker Compose |
| Frontend | React 19 + Vite + TypeScript + Leaflet + Zustand + React Query + Tailwind CSS (PLANNED) |

## Struktur Proyek

```
├── backend/               # Bun + ElysiaJS (SUDAH DIBANGUN)
│   ├── src/
│   │   ├── index.ts           # Entry point server
│   │   ├── config.ts          # Konfigurasi + env validation
│   │   ├── api/               # Route handlers (health, observations, regions)
│   │   ├── services/          # Business logic (pipeline.ts, gemini.ts)
│   │   ├── models/            # Mongoose schemas (Observation, SatelliteData, GeminiAnalysis)
│   │   ├── external/          # Gemini API client
│   │   ├── utils/             # Storage utility
│   │   ├── middleware/        # Error handling
│   │   └── types/             # TypeScript type definitions
│   ├── package.json
│   └── Dockerfile
├── python-worker/          # FastAPI + GEE (SUDAH DIBANGUN)
│   ├── app.py                 # FastAPI server (/analyze, /health)
│   ├── services/
│   │   └── gee_pipeline.py    # 5-source GEE pipeline + mock mode
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React + Vite (BELUM DIBANGUN)
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── MVP.md                  # Dokumen scope utama — baca ini dulu
```

## Menjalankan Proyek

### Development (Docker Compose)
```bash
cp backend/.env.example backend/.env   # Isi GEMINI_API_KEY
docker-compose -f docker-compose.dev.yml up -d
```
MongoDB di port 27017, Python Worker di 8000, Backend di 3000. Hot reload aktif untuk backend dan python-worker.

### Manual (tanpa Docker)
```bash
# Backend
cd backend && bun install && bun run dev

# Python Worker
cd python-worker && pip install -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Typecheck
```bash
cd backend && bunx tsc --noEmit
```

## API Endpoints

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/observations` | Submit GPS `{lat, lng}` → `observationId` |
| GET | `/api/observations/:id` | Detail observasi + data satelit + analisis |
| GET | `/api/observations/:id/analysis` | Polling status analisis |
| GET | `/api/regions` | Agregasi per provinsi |
| GET | `/api/health` | Health check |

## Database (MongoDB)

- **observations**: `{latitude, longitude, province?, timestamp, status: pending|processing|completed|error}`
- **satellite_data**: `{observationId, sar, ndwi, chirps, soil, elevation}`
- **gemini_analysis**: `{observationId, confidence, verdict, reasoning, recommendations}`

## Data Pipeline

1. User submit `POST /api/observations` → status `pending`
2. Status → `processing`
3. Backend panggil Python Worker `POST /analyze` → GEE 5-source pipeline
4. Data satelit disimpan ke `satellite_data`
5. Data dikirim ke Gemini → `{confidence, verdict, reasoning, recommendations}`
6. Hasil Gemini disimpan ke `gemini_analysis`
7. Status → `completed` (atau `error` jika gagal, dengan fallback analysis)

## Aturan Penting

- **NO photo upload** — input hanya GPS (lat, lng). Tidak ada komponen kamera/foto.
- **NO PostgreSQL/Redis/Bull** — hanya MongoDB, pipeline sync sequential.
- **Sentinel-1 SAR adalah sumber primer** — Indonesia memiliki tutupan awan 70-90%.
- **Gemini sebagai AI analyst** — bukan weighted formula. Gemini menerima structured JSON dari 5 sumber satelit dan memberikan penilaian natural language.
- **Bahasa Indonesia** untuk teks yang dilihat pengguna.
- **Tidak perlu test** untuk MVP — belum ada test file, fokus pada fitur yang berjalan.
- **GEE mock mode** — python-worker punya fallback mock data jika GEE tidak tersedia.

## Status Saat Ini

- **Backend**: SELESAI dibangun (ElysiaJS + Mongoose + Gemini + pipeline)
- **Python Worker**: SELESAI dibangun (FastAPI + GEE 5-source + mock mode)
- **Docker Compose**: SELESAI (dev + prod)
- **Frontend**: BELUM DIBANGUN — prioritas selanjutnya
- **Dokumen**: SELESAI (proposal, system design, implementation guide, roadmap, MVP)

## File Referensi Utama

- `MVP.md` — dokumen scope utama, baca ini untuk konteks lengkap
- `backend/src/services/pipeline.ts` — orchestrator pipeline utama
- `backend/src/external/gemini.ts` — integrasi Gemini API
- `python-worker/services/gee_pipeline.py` — GEE 5-source pipeline
- `WATER_PRESENCE_SYSTEM_DESIGN.md` — arsitektur sistem lengkap
- `WATER_PRESENCE_ROADMAP.md` — roadmap 3 minggu + strategi kompetisi
