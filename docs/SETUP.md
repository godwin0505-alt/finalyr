# Setup Guide

Detailed instructions for setting up the TempWatch Insights project locally.

## Prerequisites

- **Node.js** 18+ ([install](https://nodejs.org/))
- **npm** 9+ (comes with Node)
- **PostgreSQL** 12+ ([install](https://www.postgresql.org/download/))
- **Verilator** ([install](https://verilator.org/guide/latest/install.html))
- **Git** ([install](https://git-scm.com/))

## Step 1: Clone & Initialize

```bash
cd /path/to/projects
git clone <your-repo-url>
cd finalyr
```

## Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (copy from root .env.example)
cp ../.env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/climate_db
PORT=5000
ENABLE_LOGS=false
```

### Create PostgreSQL Database

```bash
# Connect to Postgres as superuser
psql -U postgres

# Create database
CREATE DATABASE climate_db;
\q
```

### Seed Database

```bash
# From backend folder
npm run ts-node src/seed.ts
```

You should see output like:
```
🌱 Starting database seeding...
✅ Cleared
📊 Seeding climate data...
Found 9131 climate records
✅ Imported 9131/9131 records
✅ Climate data seeded successfully
📈 Seeding forecast data...
Found 121 forecast records
✅ Forecast data seeded successfully
🎉 Database seeding completed successfully!
```

### Run Backend

```bash
npm run dev
```

You should see:
```
✅ Database connected
🚀 Server running on http://localhost:5000
📊 Endpoints:
  - GET  /health
  - POST /compare
  - GET  /api/climate/exogenous
  - ...
```

## Step 3: Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file (optional, auto-detects http://127.0.0.1:5000)
cp ../.env.example .env
```

Edit `frontend/.env` if your backend is on a different URL:
```
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### Run Frontend

```bash
npm run dev
```

You should see:
```
VITE v5.x.x  dev server running at:

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Open `http://localhost:5173/` in your browser.

## Step 4: Verilator (Optional, for HDL Comparator)

If you haven't compiled the Verilator binary yet:

```bash
cd /path/to/finalyr

# Compile Verilog and build Verilator binary
./run_verilator.sh
```

Expected output:
```
✅ Verilator build successful!
🧪 Testing comparator...
Result: A>B
Fixed A: 2560
Fixed B: 1280
💡 Test completed.
```

Test manually:
```bash
./obj_dir/Vcomparator 24.5 24   # A>B
./obj_dir/Vcomparator 24.5 25   # A<B
./obj_dir/Vcomparator 25 25     # A=B
```

## Step 5: Verify Everything Works

1. **Backend Health**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "verilog": "available"
   }
   ```

2. **Frontend**
   - Navigate to `http://localhost:5173/`
   - Check Historical Analysis tab
   - Run a manual comparison in Verilator Playground

3. **Database**
   ```bash
   psql postgresql://postgres:password@localhost:5432/climate_db \
     -c 'SELECT COUNT(*) FROM "ClimateData";'
   ```
   Should show ~9131 records.

## Troubleshooting

### PostgreSQL Connection Error
- Ensure Postgres is running: `pg_isready`
- Check credentials in `.env`
- Create database if missing: `createdb climate_db`

### Verilator Not Found
- Install: `sudo apt-get install verilator` (Ubuntu/Debian)
- Or follow [Verilator install guide](https://verilator.org/guide/latest/install.html)

### Port Already in Use
- Backend uses 5000, frontend uses 5173
- Change in code or kill existing process:
  ```bash
  lsof -i :5000
  kill -9 <PID>
  ```

### Build Errors
- Clear node_modules and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Environment Variables Reference

**Backend** (`backend/.env`):
```
# Database
DATABASE_URL=postgresql://user:password@host:5432/climate_db

# Server
PORT=5000
NODE_ENV=development

# Logging (set to 'true' to enable request/health/comparison logs)
ENABLE_LOGS=false
```

**Frontend** (`frontend/.env`):
```
# API endpoint (auto-detects if omitted)
VITE_API_BASE_URL=http://127.0.0.1:5000
```

## Next Steps

- Read [API.md](API.md) to understand backend endpoints
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
