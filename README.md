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
| PostgreSQL | 16+ (or via Docker) |

---

## Setup

### 1. Clone & masuk ke repo

```bash
git clone <repo-url>
cd vezl
```

### 2. Backend — generate DB code

```bash
cd vezl-be

# Download dependencies
go mod tidy

# Generate type-safe DB code dari SQL queries
sqlc generate
```

> `sqlc generate` membaca `sqlc.yaml` dan menghasilkan kode Go di `internal/db/sqlc/`.
> Harus dijalankan sekali sebelum build, dan setiap kali ada perubahan di `internal/db/queries/*.sql`.

### 3. Frontend — install dependencies

```bash
cd ../vezl-fe
npm install
```

---

## Run — Development

### Jalankan PostgreSQL via Docker

```bash
docker run -d \
  --name vezl-db \
  -e POSTGRES_USER=vezl \
  -e POSTGRES_PASSWORD=vezl \
  -e POSTGRES_DB=vezl \
  -p 5432:5432 \
  postgres:16
```

### Backend

```bash
cd vezl-be

# Set env vars (bisa juga buat file .env dan source dulu)
export DATABASE_URL="postgres://vezl:vezl@localhost:5432/vezl"
export SESSION_SECRET="ganti-ini-min-32-karakter-ya-bro"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="ganti-ini"

go run ./cmd/vezl
```

Backend berjalan di `http://localhost:3000`.
Migrasi DB dijalankan otomatis saat startup.
Admin user dibuat otomatis jika belum ada.

### Frontend

```bash
cd vezl-fe
npm run dev
```

Frontend berjalan di `http://localhost:5173`.
Semua request `/api/*` di-proxy ke backend `:3000`.

---

## Run — Production (Docker Compose)

### 1. Sesuaikan env di `docker-compose.yml`

```yaml
environment:
  DATABASE_URL: postgres://snip:snip@db:5432/snip
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

### Stop

```bash
docker compose down
```

---

## Environment Variables

| Variabel | Wajib | Default | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | — | Min 32 karakter, untuk signing session |
| `PORT` | — | `3000` | Port HTTP server |
| `BASE_URL` | — | — | Public URL, e.g. `https://s.example.com` |
| `ADMIN_EMAIL` | — | — | Email admin yang dibuat saat first run |
| `ADMIN_USERNAME` | — | `admin` | Username admin |
| `ADMIN_PASSWORD` | — | — | Password admin |
| `GEO_ENABLED` | — | `true` | Enable geo lookup via ip-api.com |
| `REGISTRATION_ENABLED` | — | `false` | `true` = open signup |
| `SESSION_EXPIRY_DAYS` | — | `30` | Durasi session |

---

## Struktur Project

```
vezl/
├── Dockerfile           # Multi-stage build (FE → Go binary)
├── docker-compose.yml   # Production compose (port 3000)
├── vezl-be/             # Go backend (Gin + sqlc + golang-migrate)
└── vezl-fe/             # React frontend (Vite + HeroUI + Tailwind)
```

---

## Troubleshooting

**`sqlc generate` error "no queries found"**
Pastikan kamu di direktori `vezl-be` saat menjalankan perintah tersebut.

**Backend: `required env var missing: DATABASE_URL`**
Set env var `DATABASE_URL` sebelum menjalankan `go run`.

**Frontend tidak terhubung ke backend**
Pastikan backend berjalan di `:3000`. Vite proxy sudah dikonfigurasi di `vite.config.ts`.

**Port 3000 bentrok**
Set `PORT=3001` di env backend, lalu update proxy di `vezl-fe/vite.config.ts`:
```ts
proxy: { "/api": "http://localhost:3001" }
```
