# API Reference

REST API endpoints served by `backend/src/server.ts` on port 5000.

## Health & Status

### `GET /health`
Check backend and database connectivity.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-26T...",
  "database": "connected",
  "verilog": "available"
}
```

---

## Comparator (HDL)

### `POST /compare`
Run Verilator comparator on two temperature values.

**Body**:
```json
{
  "a": 24.5,
  "b": 24,
  "raw8": false
}
```

**Params**:
- `a`, `b`: Temperature values (0–255 for raw8=true, any float for Q8.8)
- `raw8` (optional): If `true`, treats inputs as 8-bit integers; if `false` (default), uses Q8.8 fixed-point

**Response**:
```json
{
  "tempA": 24.5,
  "tempB": 24,
  "fixedPointA": 6272,
  "fixedPointB": 6144,
  "result": "A>B",
  "executionTimeMs": 1.23,
  "raw8Mode": false
}
```

**Result Values**:
- `A>B` — Input A is greater
- `A<B` — Input A is less
- `A=B` — Equal

---

## Climate Data

### `GET /api/climate/exogenous`
Fetch aggregate climate statistics and correlations.

**Query Params** (all optional):
- `view`: `'yearly'` | `'monthly'` | `'daily'` (default: `'monthly'`)
- `year`: Year filter for monthly/daily (default: latest year in dataset)
- `month`: Month (1–12) for daily view

**Response**:
```json
{
  "yearlyData": [
    {
      "year": 2000,
      "temperature": 15.2,
      "humidity": 65.3,
      "precipitation": 1200.5,
      "windSpeed": 3.5,
      "pressure": 1013.2
    }
  ],
  "monthlyData": [
    {
      "month": "January",
      "temperature": 5.1,
      "humidity": 70.2,
      "precipitation": 100.3,
      "windSpeed": 4.2,
      "pressure": 1015.1
    }
  ],
  "dailyData": [
    {
      "date": "2024-01-01",
      "temperature": 4.8,
      "humidity": 72.1,
      "precipitation": 2.1,
      "windSpeed": 3.8,
      "pressure": 1013.5
    }
  ],
  "overallStats": {
    "temperature": { "mean": 13.5, "min": -10.2, "max": 35.8, "std": 8.2 },
    "humidity": { "mean": 65.2, "min": 20.1, "max": 95.3 },
    "precipitation": { "totalYearly": 1200.5, "mean": 100.1, "max": 500.2 },
    "windSpeed": { "mean": 3.5, "max": 25.1 },
    "pressure": { "mean": 1013.2, "min": 998.1, "max": 1025.3 }
  },
  "correlations": {
    "temperature_humidity": -0.65,
    "temperature_precipitation": 0.12,
    "temperature_windSpeed": 0.35,
    "temperature_pressure": 0.42
  },
  "dataRange": {
    "startYear": 2000,
    "endYear": 2024,
    "totalRecords": 9131
  }
}
```

---

## Temperature Analysis

### `POST /api/temperature/historical`
Compare historical temperatures between two years.

**Body**:
```json
{
  "year1": "2020",
  "year2": "2024",
  "month": "all",
  "viewMode": "Month-to-Month"
}
```

**Params**:
- `year1`, `year2`: Years to compare (as strings)
- `month`: `"all"` or month number `"1"–"12"`
- `viewMode`: `"Day-to-Day"` | `"Month-to-Month"` | `"Year-to-Year"`

**Response** (Month-to-Month example):
```json
{
  "result": "A<B",
  "year1_avg": 13.2,
  "year2_avg": 14.5,
  "monthly_data": [
    {
      "month": "January",
      "year1_avg": 5.1,
      "year2_avg": 6.2,
      "deviation": 1.1
    }
  ],
  "daily_data": null
}
```

---

### `GET /api/temperature/prediction`
Fetch 2025 prediction data.

**Response**:
```json
{
  "overall": {
    "avg2024": 14.5,
    "pred2025": 15.2,
    "change": 0.7,
    "changePercent": 4.8
  },
  "hottestMonth": {
    "month": "July",
    "temp": 28.5
  },
  "coldestMonth": {
    "month": "January",
    "temp": 2.1
  },
  "monthly_comparison": [
    {
      "month": "January",
      "temp2024": 5.1,
      "temp2025": 5.5,
      "change": 0.4,
      "change_percent": 7.8
    }
  ]
}
```

---

### `POST /api/temperature/forecast-comparison`
Compare forecast years (e.g., 2025 vs 2035).

**Body**:
```json
{
  "year1": 2025,
  "year2": 2035
}
```

**Response**: Same structure as prediction + year fields.

---

## Logs & Debug

### `GET /api/comparison-logs`
Fetch recent Verilator comparison logs with statistics.

**Query Params**:
- `limit` (optional): Max results (default: 50, max: 1000)
- `since` (optional): Timestamp or milliseconds since epoch to filter logs after

**Response**:
```json
{
  "logs": [
    {
      "timestamp": "2025-12-26T...",
      "input_a_celsius": 24.5,
      "input_b_celsius": 24,
      "fixed_point_a": 6272,
      "fixed_point_b": 6144,
      "result": "A>B",
      "execution_time_ms": 1.23,
      "verilator_binary": "obj_dir/Vcomparator",
      "verilator_output": "A>B",
      "method": "HDL_VERILATOR"
    }
  ],
  "statistics": {
    "total_comparisons_window": 42,
    "total_comparisons_all": 150,
    "hdl_comparisons_window": 42,
    "fallback_comparisons_window": 0,
    "avg_execution_time_ms": 1.15,
    "verilator_binary": "obj_dir/Vcomparator",
    "verilator_available": true
  }
}
```

---

### `GET /api/comparisons/history`
Fetch all comparison history (convenience endpoint).

**Query Params**:
- `limit` (optional): Max results (default: 100)

**Response**: Same structure as `/api/comparison-logs`.

---

## Error Responses

All endpoints return HTTP status codes:
- `200` — Success
- `400` — Bad request (missing/invalid params)
- `500` — Server error

Error body:
```json
{
  "error": "Database connection failed"
}
```

---

## CORS & Auth

- **CORS**: Enabled globally; frontend can call from any origin
- **Auth**: None (add if needed for production)

---

## Rate Limiting

No rate limits currently enforced. Add if needed for production.

---

## Examples

### Compare two temperatures
```bash
curl -X POST http://localhost:5000/compare \
  -H "Content-Type: application/json" \
  -d '{"a": 24.5, "b": 24, "raw8": false}'
```

### Get historical comparison
```bash
curl -X POST http://localhost:5000/api/temperature/historical \
  -H "Content-Type: application/json" \
  -d '{"year1": "2020", "year2": "2024", "month": "all", "viewMode": "Month-to-Month"}'
```

### Fetch climate exogenous data
```bash
curl 'http://localhost:5000/api/climate/exogenous?view=monthly&year=2024'
```

### Get recent comparisons (last 50)
```bash
curl 'http://localhost:5000/api/comparison-logs?limit=50'
```
