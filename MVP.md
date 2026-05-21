# WATER PRESENCE MONITORING SYSTEM — MVP PLAN

## Filosofi MVP

**"Satu observasi bekerja dulu, baru scale."**

Bukan:
- 2 database
- 3 API integration
- Queue system
- Python microservice
- 4-panel dashboard

Tapi:
- **1 database** (MongoDB)
- **1 API integration utama** (Gemini Vision)
- **1 runtime** (Bun)
- **1 panel hasil** (foto + verdict + confidence)

---

## Arsitektur MVP (Simplify)

```
USER → React Form + Camera
         ↓
    Bun/ElysiaJS Backend (monolith)
         ↓
    ┌─────────────────────────────┐
    │ 1. Validasi input           │
    │ 2. Simpan ke MongoDB        │
    │ 3. Panggil Gemini Vision    │
    │ 4. Parse response           │
    │ 5. Hitung confidence        │
    │ 6. Return ke user           │
    └─────────────────────────────┘
         ↓
USER → Lihat: Foto + Confidence Score + Verdict
```

**Tidak dipakai di MVP:**
- ❌ PostgreSQL / PostGIS → nanti aja
- ❌ Google Earth Engine → secondary feature, tambah setelah inti jalan
- ❌ BMKG API → unreliable, skip
- ❌ Redis / Bull queue → proses sync dulu, cukup
- ❌ Python worker → Bun bisa handle semuanya
- ❌ Heatmap / clustering / regional stats → cukup map sederhana
- ❌ 4-panel layout → cukup 1 halaman hasil

---

## Database Schema (MVP — Cuma MongoDB)

### Collection: `observations`
```json
{
  "_id": "ObjectId",
  "photoUrl": "string",
  "latitude": "number",
  "longitude": "number",
  "timestamp": "Date",
  "geminiResult": {
    "waterPresence": "high|medium|low|none",
    "confidence": 0-100,
    "soilType": "string",
    "surfaceCondition": "string",
    "vegetation": "string",
    "anomalies": ["string"],
    "rawResponse": "string"
  },
  "verdict": "high|medium|low|none",
  "confidenceScore": 0-100,
  "status": "pending|completed|error",
  "errorMessage": "string | null"
}
```

Semua dalam satu collection. Satu dokumen = satu observasi. Selesai.

---

## API Endpoints (MVP)

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/observations` | Submit foto + GPS |
| GET | `/api/observations/:id` | Detail hasil |
| GET | `/api/observations` | List observasi (terbaru) |
| GET | `/api/health` | Health check |

Total: **4 endpoint**. Bukan 15+ seperti di proposal.

---

## Frontend Pages (MVP)

| Page | Konten |
|------|--------|
| **Home** | Hero + tombol "Submit Observation" + map preview (marker hasil observasi) |
| **Submit** | GPS auto + manual adjust + camera capture + preview + submit |
| **Result** | Foto besar + confidence gauge (0-100%) + verdict + metadata |
| **Map** | Leaflet map dengan marker observasi |

Total: **4 halaman**. Masing-masing sederhana, tanpa 4-panel complex layout.

---

## User Flow MVP

```
1. Buka app → Lihat home + map
2. Klik "Submit Observation"
3. App minta izin lokasi → GPS auto-fill
4. Ambil foto (native camera)
5. Preview foto → klik submit
6. Loading... (3-8 detik)
7. Muncul: foto + "72% confidence — MEDIUM water presence"
8. Observasi muncul di map
```

**Waktu tunggu: 3-8 detik.** Bukan 10-15 detik karena tanpa GEE/BMKG.

---

## Confidence Score (MVP — Hanya Gemini)

```text
confidence = gemini.confidence  (dari API langsung)

verdict:
  >= 75  → HIGH
  50-74  → MEDIUM
  25-49  → LOW
  < 25   → NONE
```

Nanti setelah GEE ditambahkan, baru pakai weighted formula. Untuk MVP, cukup dari Gemini — sudah valid karena Gemininya yang analisis fotonya.

---

## Kenapa Ini Cukup untuk Kompetisi?

| Kriteria | Dengan MVP Ini |
|----------|---------------|
| **Innovation** | Citizen science + AI vision via smartphone — tetap unik |
| **Technical Execution** | Kode sederhana, working product dalam 2 minggu |
| **Practical Impact** | Demo langsung: foto → analisis → hasil dalam 5 detik |
| **Presentation** | Bisa demo live tanpa khawatir API satellite mati/down |
| **Team Capability** | Selesai tepat waktu, fokus, tidak over-promise |

Yang juri lihat: **produk yang jalan**, bukan arsitektur yang rumit.

---

## Roadmap MVP (2 Minggu)

### Week 1: Foundation
```
Day 1-2: Setup Bun + ElysiaJS + MongoDB
         └─ Health endpoint, koneksi DB
Day 3-4: Frontend React + Vite + Tailwind
         └─ Form submit, camera capture, GPS
Day 5:   Integrasi backend-frontend
         └─ Submit foto → simpan ke MongoDB → return ID
```

### Week 2: AI + Result
```
Day 1-2: Integrasi Gemini Vision API
         └─ Kirim foto → parse JSON → simpan result
Day 3:   Result page + confidence gauge
         └─ Tampilkan hasil ke user
Day 4:   Map view + marker observasi
         └─ Leaflet sederhana
Day 5:   Polish + testing + deploy
         └─ Vercel (frontend) + Railway (backend)
```

---

## Bonus (Kalau Waktu Sisa)

Setelah inti jalan, baru tambah:
- **Satellite (GEE)**: Sebagai "enhanced analysis" — optional, bukan blocker
- **Weather**: Kalau BMKG lagi hidup
- **Filter map**: Date range, confidence threshold
- **Better UI**: Animasi loading, transition

---

## Checklist MVP

- [ ] Backend: POST /observations (foto + GPS → simpan → return ID)
- [ ] Gemini: Kirim foto → parse response → simpan result
- [ ] Frontend: Form submit (camera + GPS)
- [ ] Frontend: Result page (foto + confidence + verdict)
- [ ] Frontend: Map (Leaflet marker)
- [ ] Deploy ke Vercel + Railway
- [ ] Demo: 5 observasi real → berhasil semua
