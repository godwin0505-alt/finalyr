# TempWatch Insights

Temperature analytics dashboard with Verilator HDL comparator integration, built with React + Vite (frontend) and Express + Prisma (backend).

## Project Structure

```
finalyr/
├── frontend/              # React + Vite web app
│   ├── src/              # React components, pages, services
│   ├── public/           # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── README.md
│
├── backend/              # Express API + Prisma ORM
│   ├── src/
│   │   ├── server.ts     # Main Express app
│   │   └── seed.ts       # Database seeding
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── docs/                 # Documentation
│   ├── SETUP.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── comparator.v          # Verilog HDL comparator
├── sim_main.cpp          # Verilator simulation harness
├── run_verilator.sh      # Build script for Verilator (run via `npm run verilator:build` from backend)
├── obj_dir/              # Compiled Verilator binary (built at deploy; not committed)
│
├── climate_forecast_using_sarimax/  # SARIMAX tools (optional)
├── env/                  # Python virtual environment (optional)
├── .env.example          # Example env variables
├── .gitignore
└── README.md (this file)
```

## Quick Start

### Prerequisites
- Node.js 18+ & npm
- PostgreSQL 12+
- Verilator (for HDL compilation)

### 1. Backend Setup

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your DB credentials
npm run ts-node src/seed.ts  # Seed climate data
npm run dev                   # Start Express server on :5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev  # Start Vite dev server on :8080
```

Backend API URL should be auto-detected as `http://127.0.0.1:5000`. If different, set `VITE_API_BASE_URL` in `frontend/.env`.

### 3. Verilator (HDL Comparator)

```bash
./run_verilator.sh  # Compile Verilog & build obj_dir/Vcomparator
```

Backend npm script (runs from backend/):
```bash
npm run verilator:build
```

Test the binary:
```bash
./obj_dir/Vcomparator 24.5 24   # Should output: Result: A>B
./obj_dir/Vcomparator 24.5 25   # Should output: Result: A<B
```

**Deployment note (Option B - recommended):** Do not commit `obj_dir/`; instead, run `npm run verilator:build` on the server (post-deploy) to generate `obj_dir/Vcomparator` before serving requests.

## Documentation

- **[SETUP.md](docs/SETUP.md)** — Detailed local setup and environment config
- **[API.md](docs/API.md)** — Backend REST API reference
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Deploying frontend to Vercel and backend to production

## Features

### Frontend
- Historical temperature analysis (daily/monthly/yearly comparisons)
- Forecast vs prediction views
- Manual Verilator comparator playground
- Real-time HDL debug panel with execution logs
- Tailwind CSS + Chart.js visualizations

### Backend
- Express REST API for climate data, forecasts, and HDL comparisons
- Prisma ORM with PostgreSQL
- Verilator integration for fixed-point Q8.8 comparisons
- Automatic comparison logging and statistics

### HDL
- 16-bit Verilog comparator for Q8.8 fixed-point temperatures
- Compiled via Verilator into C++ binary
- Supports fractional temperature inputs (e.g., 24.5°C)

## Environment Variables

See `.env.example` for all options. Key variables:

**Backend** (`backend/.env`):
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/climate_db
PORT=5000
ENABLE_LOGS=false  # Set to 'true' to enable debug logging
```

**Frontend** (`frontend/.env`):
```
VITE_API_BASE_URL=http://127.0.0.1:5000  # Or your production backend URL
```

## Development

### Lint
```bash
cd frontend
npm run lint
```
### Build Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Reset Database
```bash
psql postgresql://postgres:password@localhost:5432/climate_db \
  -c 'TRUNCATE "ClimateData", "ForecastData", "ComparisonLog" RESTART IDENTITY;'
```

Reseed:
```bash
cd backend
npm run ts-node src/seed.ts
```

## License

Proprietary. Do not redistribute without permission.

## Questions?

Refer to [docs/](docs/) for detailed guides.
