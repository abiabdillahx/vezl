# Vezl

Self-hosted URL shortener. Single binary, easy to deploy.

---

## Prerequisites

| Tool | Version |
|---|---|
| Go | 1.23+ |
| Node.js | 22+ |
| Docker + Docker Compose | latest |
| [sqlc](https://docs.sqlc.dev/en/latest/overview/install.html) | latest |

Database pakai SQLite (embedded, pure Go) — nggak perlu install database server.

---

## Setup

### 1. Clone & masuk ke repo

```bash
git clone <repo-url>
cd vezl
```

### 2. Backend — generate DB code

```bash
cd server

# Download dependencies
go mod tidy

# Generate type-safe DB code dari SQL queries
sqlc generate
```

> `sqlc generate` membaca `sqlc.yaml` dan menghasilkan kode Go di `internal/db/sqlc/`.
> Harus dijalankan sekali sebelum build, dan setiap kali ada perubahan di `internal/db/queries/*.sql`.

### 3. Frontend — install dependencies

```bash
cd ../web
npm install
```

---

## Run — Development

### Backend

```bash
cd server

# Set env vars (bisa juga buat file .env dan source dulu)
export DATABASE_PATH="vezl.db"   # opsional, default: vezl.db
export SESSION_SECRET="ganti-ini-min-32-karakter-ya-bro"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="ganti-ini"

go run ./cmd/vezl
```

Backend berjalan di `http://localhost:3000`.
File database SQLite dibuat otomatis, migrasi dijalankan saat startup.
Admin user dibuat otomatis jika belum ada.

### Frontend

```bash
cd web
npm run dev
```

Frontend berjalan di `http://localhost:5173`.
Semua request `/api/*` di-proxy ke backend `:3000`.

---

## Run — Production (Docker Compose)

### 1. Sesuaikan env di `docker-compose.yml`

```yaml
environment:
  SESSION_SECRET: ganti-ini-min-32-karakter      # WAJIB diganti
  ADMIN_EMAIL: admin@example.com
  ADMIN_USERNAME: admin
  ADMIN_PASSWORD: ganti-ini                       # WAJIB diganti
```

### 2. Build & Jalankan

```bash
docker compose up -d --build
```

Dockerfile otomatis build frontend → embed ke binary Go → jadi 1 container.
App berjalan di `http://localhost:3000`.
Data SQLite disimpan di volume `vezl-data` (`/data/vezl.db` di dalam container).

### Backup

```bash
docker compose exec vezl sh -c 'cat /data/vezl.db' > vezl-backup.db
```

> Untuk backup yang konsisten saat app sedang jalan, stop dulu (`docker compose stop`) atau jalankan saat traffic sepi — SQLite mode WAL menyimpan tulisan terbaru di `vezl.db-wal` sampai di-checkpoint.

### Stop

```bash
docker compose down
```

---

## Environment Variables

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_PATH` | — | `vezl.db` | Path file database SQLite |
| `SESSION_SECRET` | ✅ | — | Min 32 karakter, untuk signing session |
| `PORT` | — | `3000` | Port HTTP server |
| `BASE_URL` | — | — | Public URL, e.g. `https://s.example.com` |
| `ADMIN_EMAIL` | — | — | Email admin yang dibuat saat first run |
| `ADMIN_USERNAME` | — | `admin` | Username admin |
| `ADMIN_PASSWORD` | — | — | Password admin |
| `GEO_ENABLED` | — | `true` | Catat negara/region/kota tiap klik (lookup offline) |
| `GEO_DB_PATH` | — | `geo.mmdb` | Path database geo (`.mmdb`). Di Docker: `/data/geo.mmdb` |
| `GEO_AUTO_UPDATE` | — | `true` | Download otomatis database DB-IP City Lite kalau belum ada / lebih dari 35 hari |
| `REGISTRATION_ENABLED` | — | `false` | `true` = open signup |
| `SESSION_EXPIRY_DAYS` | — | `30` | Durasi session |

---

## Geolocation

Lokasi klik di-resolve **offline** dari database [DB-IP City Lite](https://db-ip.com/db/download/ip-to-city-lite) (format `.mmdb`, ~130MB) — tanpa request ke pihak ketiga per klik.

- Dengan `GEO_AUTO_UPDATE=true` (default), app mendownload database saat pertama jalan dan memperbaruinya tiap bulan di background. Selama database belum ada, klik tetap tercatat tanpa lokasi.
- Tanpa akses internet dari server: download manual lalu taruh di `GEO_DB_PATH`:
  ```bash
  curl -s https://download.db-ip.com/free/dbip-city-lite-$(date -u +%Y-%m).mmdb.gz | gunzip > geo.mmdb
  ```

> IP geolocation by [DB-IP](https://db-ip.com), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

## Struktur Project

```
vezl/
├── Dockerfile           # Multi-stage build (web → Go binary)
├── docker-compose.yml   # Production compose (port 3000)
├── server/              # Go backend (Gin + sqlc + golang-migrate)
└── web/                 # React frontend (Vite + HeroUI + Tailwind)
```

---

## Troubleshooting

**`sqlc generate` error "no queries found"**
Pastikan kamu di direktori `server` saat menjalankan perintah tersebut.

**Backend: `required env var missing: SESSION_SECRET`**
Set env var `SESSION_SECRET` sebelum menjalankan `go run`.

**Frontend tidak terhubung ke backend**
Pastikan backend berjalan di `:3000`. Vite proxy sudah dikonfigurasi di `vite.config.ts`.

**Port 3000 bentrok**
Set `PORT=3001` di env backend, lalu update proxy di `web/vite.config.ts`:
```ts
proxy: { "/api": "http://localhost:3001" }
```
