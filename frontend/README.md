# TempWatch Insights (Frontend)

React + Vite dashboard for temperature analytics and HDL comparator monitoring.

## Quick Start

```bash
cd tempwatch-insights-main
npm install
npm run dev
```

Backend API should run at `http://127.0.0.1:5000` or set `VITE_API_BASE_URL` in `.env`.

## Features
- Historical analysis (daily/monthly/yearly)
- Prediction and forecast comparison
- Verilator debug panel and comparator playground
- Tailwind UI, Chart.js visualizations

## Build
```bash
npm run build
npm run preview
```

## Project Structure
- `src/` React components and pages
- `public/` static assets (e.g., `og-image.png`)
- `vite.config.ts` Vite + React config
- `tailwind.config.ts` Tailwind setup

## Environment
- `VITE_API_BASE_URL` (optional): override API base URL

## License
Proprietary. Do not redistribute without permission.
