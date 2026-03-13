# 🚀 PostgreSQL + Node.js + Express + Prisma Setup Guide

## 📋 Prerequisites Installed
✅ Node.js & npm
✅ Express.js
✅ Prisma ORM
✅ TypeScript
✅ All dependencies

## 🐘 Install PostgreSQL

### On Ubuntu/WSL:
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Check status
sudo service postgresql status
```

### Setup PostgreSQL Database:
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, create database and user:
CREATE DATABASE climate_db;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE climate_db TO postgres;
ALTER DATABASE climate_db OWNER TO postgres;
\q
```

## 🔧 Setup Steps

### 1. Install PostgreSQL (see above)

### 2. Generate Prisma Client
```bash
cd /home/esu/projects/finalyr/backend
npm run prisma:generate
```

### 3. Push Database Schema
```bash
npm run db:push
```

### 4. Seed Database with CSV Data
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

## 🌐 API Endpoints

Once running on `http://localhost:5000`:

### Health Check
- `GET /health` - Check server status

### Verilator Comparison
- `POST /compare` - Compare two temperatures
  ```json
  { "tempA": 25.5, "tempB": 26.2, "raw8": false }
  ```

### Climate Data
- `GET /api/climate/exogenous?view=monthly&year=2024` - Get climate data
  - Params: `view` (daily/monthly), `year` (2000-2024), `month` (1-12 for daily)

### Historical Comparison
- `POST /api/temperature/historical` - Compare historical data
  ```json
  { "yearA": 2020, "yearB": 2021, "month": 1, "view": "Day-to-Day" }
  ```

### Forecast Data
- `GET /api/temperature/prediction` - Get forecast data
- `POST /api/temperature/forecast-comparison` - Compare forecast vs historical
  ```json
  { "historicalYear": 2024, "forecastYear": 2025 }
  ```

### Comparison History
- `GET /api/comparisons/history?limit=100` - Get Verilator comparison logs

## 📊 Database Schema

### ClimateData Table
- Historical climate data (2000-2024)
- Fields: date, temperature, humidity, precipitation, windSpeed, pressure

### ForecastData Table
- Forecast data (2025-2035)
- Fields: year, month, temperature

### ComparisonLog Table
- Verilator comparison history
- Fields: tempA, tempB, result, executionTimeMs, timestamp

## 🛠️ Prisma Commands

```bash
# Open Prisma Studio (Database GUI)
npm run prisma:studio

# Create new migration
npm run prisma:migrate

# Reset database
npm run db:reset

# Generate Prisma Client
npm run prisma:generate
```

## 🔄 Frontend Integration

Update your frontend `.env` to point to the new backend:
```env
VITE_API_BASE_URL=http://localhost:5000
```

The frontend API calls remain the same - no changes needed!

## 📝 Environment Variables

`.env` file (already created):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/climate_db?schema=public"
PORT=5000
NODE_ENV=development
VERILATOR_BINARY_PATH="../obj_dir/Vcomparator"
```

## 🚦 Quick Start Commands

```bash
# 1. Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo service postgresql start

# 2. Create database (run in psql)
sudo -u postgres psql
CREATE DATABASE climate_db;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE climate_db TO postgres;
\q

# 3. Setup backend
cd /home/esu/projects/finalyr/backend
npm run prisma:generate
npm run db:push
npm run seed

# 4. Start server
npm run dev
```

## ✅ Benefits of This Stack

- 🎯 **Type Safety**: TypeScript + Prisma for full type safety
- 🚀 **Performance**: PostgreSQL for fast queries, indexed data
- 🔄 **Auto Migrations**: Prisma handles database changes
- 📊 **Query Builder**: Type-safe database queries
- 🛡️ **Data Validation**: Prisma schema ensures data integrity
- 📈 **Scalable**: PostgreSQL can handle millions of records
- 🔍 **Debugging**: Prisma Studio for visual database management
- 📝 **Logs**: All Verilator comparisons stored in database

## 🎨 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL |
| ORM | Prisma |
| Backend | Node.js + Express |
| Language | TypeScript |
| API | REST |
| Frontend | React + Vite (unchanged) |
| HDL | Verilator (integrated) |
