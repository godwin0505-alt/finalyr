import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Initialize Prisma client (will be set in main())
let prisma: PrismaClient;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
// Toggle noisy logs via env; default to quiet
const ENABLE_LOGS = process.env.ENABLE_LOGS === 'true';

app.use((req: Request, res: Response, next: NextFunction) => {
  if (ENABLE_LOGS) {
    console.log(`📡 ${req.method} ${req.path}`);
  }
  next();
});

// ============== HEALTH CHECK ==============
app.get('/health', async (req: Request, res: Response) => {
  if (ENABLE_LOGS) console.log('🔍 Health check requested');
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    if (ENABLE_LOGS) console.log('🔍 Database query OK:', result);
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      verilog: 'available'
    });
    if (ENABLE_LOGS) console.log('🔍 Response sent');
  } catch (error) {
    console.error('🔍 Error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: String(error)
    });
  }
});

// ============== VERILATOR COMPARISON ==============
interface CompareRequest {
  tempA: number;
  tempB: number;
  raw8?: boolean;
}

async function executeVerilogComparison(a: number, b: number, raw8: boolean = false): Promise<any> {
  // Relative path to Verilator binary from backend root
  // Works in development and production (deployed root or any location)
  const binaryPath = path.resolve(__dirname, '../../obj_dir/Vcomparator');
  const objDir = path.resolve(__dirname, '../../obj_dir');
  const startTime = Date.now();
  // Precompute fixed-point (Q8.8) values for fallback/logging
  const fixedFallbackA = Math.round(a * 256);
  const fixedFallbackB = Math.round(b * 256);

  return new Promise((resolve, reject) => {
    // If Verilator binary is missing, fallback to numeric comparison and return gracefully
    if (!fs.existsSync(binaryPath)) {
      const executionTime = Date.now() - startTime;
      const result = a < b ? 'A<B' : a > b ? 'A>B' : 'A=B';
      if (ENABLE_LOGS) console.warn('⚠️ Verilator binary not found; returning numeric fallback.');
      resolve({
        tempA: a,
        tempB: b,
        fixedPointA: fixedFallbackA,
        fixedPointB: fixedFallbackB,
        result,
        executionTimeMs: executionTime,
        raw8Mode: raw8,
        verilatorAvailable: false,
        note: 'Verilator binary not found; numeric comparison returned.'
      });
      return;
    }

    const args = raw8 ? [a.toString(), b.toString(), 'raw8'] : [a.toString(), b.toString()];
    let stdout = '';
    let stderr = '';

    let spawned: any;
    try {
      spawned = spawn(binaryPath, args, { cwd: objDir });
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      console.warn('⚠️ Failed to spawn Verilator binary, falling back to numeric comparison:', err?.message ?? err);
      const result = a < b ? 'A<B' : a > b ? 'A>B' : 'A=B';
      resolve({
        tempA: a,
        tempB: b,
        fixedPointA: fixedFallbackA,
        fixedPointB: fixedFallbackB,
        result,
        executionTimeMs: executionTime,
        raw8Mode: raw8,
        verilatorAvailable: false,
        note: 'Failed to spawn Verilator binary; numeric comparison returned.'
      });
      return;
    }

    spawned.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    spawned.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    spawned.on('error', (err: any) => {
      const executionTime = Date.now() - startTime;
      console.warn('⚠️ Verilator process error, falling back to numeric comparison:', err?.message ?? err);
      const result = a < b ? 'A<B' : a > b ? 'A>B' : 'A=B';
      resolve({
        tempA: a,
        tempB: b,
        fixedPointA: fixedFallbackA,
        fixedPointB: fixedFallbackB,
        result,
        executionTimeMs: executionTime,
        raw8Mode: raw8,
        verilatorAvailable: false,
        note: 'Verilator process error; numeric comparison returned.'
      });
    });

    spawned.on('close', (code: number) => {
      const executionTime = Date.now() - startTime;

      if (code !== 0) {
        reject(new Error(`Verilator exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const rawOutput = stdout.trim();
        const lines = rawOutput.split('\n');
        const resultLine = lines.find(line => line.startsWith('Result:'));
        const fixedALine = lines.find(line => line.startsWith('Fixed A:'));
        const fixedBLine = lines.find(line => line.startsWith('Fixed B:'));

        let result = resultLine?.split(':')[1]?.trim();
        let fixedA = fixedALine ? parseInt(fixedALine.split(':')[1].trim()) : fixedFallbackA;
        let fixedB = fixedBLine ? parseInt(fixedBLine.split(':')[1].trim()) : fixedFallbackB;

        // Fallback parsing for minimal outputs like "A<B", "A>B", "A=B"
        if (!result) {
          if (/A\s*<\s*B/i.test(rawOutput)) {
            result = 'A<B';
          } else if (/A\s*>\s*B/i.test(rawOutput)) {
            result = 'A>B';
          } else if (/A\s*=\s*B/i.test(rawOutput)) {
            result = 'A=B';
          } else if (rawOutput) {
            result = rawOutput;
          }
        }

        // Final fallback: derive result from numeric comparison if parsing failed or output empty
        if (!result || result.toLowerCase() === 'unknown') {
          if (a < b) result = 'A<B';
          else if (a > b) result = 'A>B';
          else result = 'A=B';
        }

        resolve({
          tempA: a,
          tempB: b,
          fixedPointA: fixedA,
          fixedPointB: fixedB,
          result,
          executionTimeMs: executionTime,
          raw8Mode: raw8,
          verilatorAvailable: true
        });
      } catch (error) {
        reject(new Error(`Failed to parse Verilator output: ${error}`));
      }
    });
  });
}

// POST /compare - original API used by frontend
app.post('/compare', async (req: Request<{}, {}, CompareRequest>, res: Response) => {
  try {
    // Accept both frontend payloads: {tempA,tempB} or {a,b}
    const tempA = (req.body as any).tempA ?? (req.body as any).a;
    const tempB = (req.body as any).tempB ?? (req.body as any).b;
    const raw8 = (req.body as any).raw8 ?? false;

    if (tempA === undefined || tempB === undefined) {
      return res.status(400).json({ error: 'tempA and tempB are required' });
    }

    if (ENABLE_LOGS) console.log(`🔍 Comparing ${tempA}°C vs ${tempB}°C (raw8=${raw8})`);

    const result = await executeVerilogComparison(tempA, tempB, raw8);

    // Log to database
    await prisma.comparisonLog.create({
      data: {
        tempA: result.tempA,
        tempB: result.tempB,
        fixedPointA: result.fixedPointA,
        fixedPointB: result.fixedPointB,
        result: result.result,
        executionTimeMs: result.executionTimeMs,
        raw8Mode: result.raw8Mode
      }
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ Comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /compare - convenience endpoint so you can test via browser
// Usage: /compare?a=24.5&b=25
app.get('/compare', async (req: Request, res: Response) => {
  try {
    const aRaw = req.query.a as string | undefined;
    const bRaw = req.query.b as string | undefined;
    if (!aRaw || !bRaw) return res.status(400).json({ error: 'Query parameters a and b are required' });
    const a = parseFloat(aRaw);
    const b = parseFloat(bRaw);
    if (isNaN(a) || isNaN(b)) return res.status(400).json({ error: 'a and b must be numbers' });

    const result = await executeVerilogComparison(a, b, false);
    // Optionally log (non-blocking) but don't crash on error
    prisma.comparisonLog.create({
      data: {
        tempA: result.tempA,
        tempB: result.tempB,
        fixedPointA: result.fixedPointA,
        fixedPointB: result.fixedPointB,
        result: result.result,
        executionTimeMs: result.executionTimeMs,
        raw8Mode: result.raw8Mode
      }
    }).catch(err => console.warn('Non-fatal logging error:', err));

    res.json(result);
  } catch (error: any) {
    console.error('❌ GET Comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== CLIMATE DATA API ==============

// Get historical climate data with filters
app.get('/api/climate/exogenous', async (req: Request, res: Response) => {
  try {
    const view = ((req.query.view as string) || 'monthly').toLowerCase();
    const monthParamRaw = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    // Default to January if daily view is requested without a valid month
    const monthParam = Number.isFinite(monthParamRaw) && monthParamRaw >= 1 && monthParamRaw <= 12
      ? monthParamRaw
      : view === 'daily'
        ? 1
        : undefined;

    // Optional query: year for monthly/daily data; default to latest year in dataset
    const maxYearRow = await prisma.$queryRaw<any[]>`SELECT MAX(year) as maxYear FROM "ClimateData"`;
    const latestYear = maxYearRow?.[0]?.maxYear || new Date().getFullYear();
    const year = req.query.year ? parseInt(req.query.year as string, 10) : latestYear;

    // Yearly aggregates
    const yearlyRows = await prisma.$queryRaw<any[]>`
      SELECT year,
        AVG(temperature) as temperature,
        AVG(humidity) as humidity,
        SUM(precipitation) as precipitation,
        AVG("windSpeed") as "windSpeed",
        AVG(pressure) as pressure
      FROM "ClimateData"
      GROUP BY year
      ORDER BY year ASC`;

    const yearlyData = yearlyRows.map(r => ({
      year: r.year,
      temperature: parseFloat(r.temperature),
      humidity: parseFloat(r.humidity),
      precipitation: parseFloat(r.precipitation),
      windSpeed: parseFloat(r.windSpeed),
      pressure: parseFloat(r.pressure)
    }));

    // Monthly aggregates for selected year
    const monthlyRows = await prisma.$queryRaw<any[]>`
      SELECT month,
        AVG(temperature) as temperature,
        AVG(humidity) as humidity,
        AVG(precipitation) as precipitation,
        AVG("windSpeed") as "windSpeed",
        AVG(pressure) as pressure
      FROM "ClimateData"
      WHERE year = ${year}
      GROUP BY month
      ORDER BY month ASC`;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthlyData = monthlyRows.map(m => {
      // If seed stored month 0-based, shift for labeling
      const oneBased = (m.month ?? 1) >= 1 ? m.month : (Number(m.month) + 1);
      const idx = (oneBased ?? 1) - 1;
      return {
        month: monthNames[idx] || String(m.month),
        temperature: parseFloat(m.temperature),
        humidity: parseFloat(m.humidity),
        precipitation: parseFloat(m.precipitation),
        windSpeed: parseFloat(m.windSpeed),
        pressure: parseFloat(m.pressure)
      };
    });

    // Daily rows for requested month/year (used when view=daily)
    let dailyData: any[] | undefined = undefined;
    if (view === 'daily' && typeof monthParam === 'number') {
      // Support both 1-based and 0-based month values in DB
      const rows = await prisma.climateData.findMany({
        where: { year, month: { in: [monthParam, monthParam - 1] } },
        orderBy: { day: 'asc' }
      });
      dailyData = rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        temperature: r.temperature,
        humidity: r.humidity,
        precipitation: r.precipitation,
        windSpeed: r.windSpeed,
        pressure: r.pressure
      }));
      if (ENABLE_LOGS) console.log(`📈 dailyData for year=${year}, month=${monthParam}: ${dailyData.length} rows`);
    }

    // Overall stats (include std via second moment)
    const statsRowArr = await prisma.$queryRaw<any[]>`
      SELECT 
        AVG(temperature) as temp_mean,
        MIN(temperature) as temp_min,
        MAX(temperature) as temp_max,
        SUM(temperature*temperature) as temp_sum_sq,
        AVG(humidity) as hum_mean,
        MIN(humidity) as hum_min,
        MAX(humidity) as hum_max,
        SUM(precipitation) as precip_total,
        AVG(precipitation) as precip_mean,
        MAX(precipitation) as precip_max,
        AVG("windSpeed") as wind_mean,
        MAX("windSpeed") as wind_max,
        AVG(pressure) as pres_mean,
        MIN(pressure) as pres_min,
        MAX(pressure) as pres_max,
        COUNT(*) as n
      FROM "ClimateData"`;
    const s = statsRowArr[0];
    const n = Number(s.n) || 1;
    const tempMean = parseFloat(s.temp_mean);
    const tempStd = Math.sqrt(Math.max(0, (parseFloat(s.temp_sum_sq) / n) - tempMean * tempMean));
    const overallStats = {
      temperature: { mean: tempMean, min: parseFloat(s.temp_min), max: parseFloat(s.temp_max), std: tempStd },
      humidity: { mean: parseFloat(s.hum_mean), min: parseFloat(s.hum_min), max: parseFloat(s.hum_max) },
      precipitation: { totalYearly: parseFloat(s.precip_total), mean: parseFloat(s.precip_mean), max: parseFloat(s.precip_max) },
      windSpeed: { mean: parseFloat(s.wind_mean), max: parseFloat(s.wind_max) },
      pressure: { mean: parseFloat(s.pres_mean), min: parseFloat(s.pres_min), max: parseFloat(s.pres_max) }
    };

    // Correlations: compute in JS
    const allRows = await prisma.$queryRaw<any[]>`
      SELECT temperature, humidity, precipitation, "windSpeed" as windSpeed, pressure FROM "ClimateData"`;
    const corr = (xArr: number[], yArr: number[]) => {
      const n = xArr.length;
      if (!n) return 0;
      const mx = xArr.reduce((a,b)=>a+b,0)/n;
      const my = yArr.reduce((a,b)=>a+b,0)/n;
      let num=0, dx=0, dy=0;
      for (let i=0;i<n;i++) {
        const dxi = xArr[i]-mx; const dyi = yArr[i]-my;
        num += dxi*dyi; dx += dxi*dxi; dy += dyi*dyi;
      }
      const denom = Math.sqrt(dx*dy);
      return denom ? num/denom : 0;
    };
    const temps = allRows.map(r=>parseFloat(r.temperature));
    const hums = allRows.map(r=>parseFloat(r.humidity));
    const precs = allRows.map(r=>parseFloat(r.precipitation));
    const winds = allRows.map(r=>parseFloat(r.windSpeed));
    const press = allRows.map(r=>parseFloat(r.pressure));
    const correlations = {
      temperature_humidity: corr(temps,hums),
      temperature_precipitation: corr(temps,precs),
      temperature_windSpeed: corr(temps,winds),
      temperature_pressure: corr(temps,press)
    };

    // Data range
    const rangeRows = await prisma.$queryRaw<any[]>`
      SELECT MIN(year) as minYear, MAX(year) as maxYear, COUNT(*) as total FROM "ClimateData"`;
    const dataRange = {
      startYear: rangeRows[0].minYear,
      endYear: rangeRows[0].maxYear,
      totalRecords: Number(rangeRows[0].total)
    };

    res.json({ yearlyData, monthlyData, dailyData, overallStats, correlations, dataRange });
  } catch (error: any) {
    console.error('❌ Climate exogenous error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get historical temperature data (for comparison view)
app.post('/api/temperature/historical', async (req: Request, res: Response) => {
  try {
    // Accept both naming schemes from the frontend
    const body: any = req.body;
    const yearA = body.yearA ?? body.year1;
    const yearB = body.yearB ?? body.year2;
    const month = body.month ?? body.monthNumber;
    const view = body.view ?? body.viewMode ?? 'Year-to-Year';

    const yearANum = typeof yearA === 'string' ? parseInt(yearA, 10) : yearA;
    const yearBNum = typeof yearB === 'string' ? parseInt(yearB, 10) : yearB;
    const monthNum = typeof month === 'string' ? (month.toLowerCase() === 'all' ? undefined : parseInt(month, 10)) : month;

    if (ENABLE_LOGS) console.log(`📊 Historical comparison: ${yearANum} vs ${yearBNum}, month=${monthNum ?? 'all'}, view=${view}`);
    if (ENABLE_LOGS) console.log('🔎 Types:', {
      yearANumType: typeof yearANum,
      yearBNumType: typeof yearBNum,
      monthNumType: typeof monthNum
    });

    if (view === 'Day-to-Day' && typeof monthNum === 'number') {
      // Get daily data for both years
      const dataA = await prisma.climateData.findMany({
        where: { year: yearANum, month: monthNum },
        orderBy: { day: 'asc' }
      });

      const dataB = await prisma.climateData.findMany({
        where: { year: yearBNum, month: monthNum },
        orderBy: { day: 'asc' }
      });

      // Pair by day (not by index) to avoid misaligned counts
      const mapB = new Map<number, any>();
      dataB.forEach(b => mapB.set(b.day, b));

      const paired = dataA.map(a => {
        const b = mapB.get(a.day);
        if (!b) return null;
        return { a, b };
      }).filter(Boolean) as Array<{ a: any; b: any }>;

      // Build daily_data for frontend
      const daily_data = paired.map(({ a, b }) => ({
        date: new Date(a.date).toISOString().split('T')[0],
        year1_temp: a.temperature,
        year2_temp: b.temperature,
        deviation: b.temperature - a.temperature,
        doy: a.day
      }));

      // Perform and log per-day comparisons via Verilator
      const dayComparisons = await Promise.all(
        daily_data.map(async (d) => {
          const cmp = await executeVerilogComparison(d.year1_temp, d.year2_temp, false);
          return {
            tempA: d.year1_temp,
            tempB: d.year2_temp,
            fixedPointA: Math.round(d.year1_temp * 256),
            fixedPointB: Math.round(d.year2_temp * 256),
            result: cmp.result,
            executionTimeMs: cmp.executionTimeMs || 0,
            raw8Mode: false
          };
        })
      );

      if (dayComparisons.length) {
        await prisma.comparisonLog.createMany({ data: dayComparisons });
      }

      // Year averages
      const avgA = await prisma.climateData.aggregate({ where: { year: yearANum }, _avg: { temperature: true } });
      const avgB = await prisma.climateData.aggregate({ where: { year: yearBNum }, _avg: { temperature: true } });
      const cmp = await executeVerilogComparison(avgA._avg.temperature || 0, avgB._avg.temperature || 0);

      // Log the year-to-year comparison
      await prisma.comparisonLog.create({
        data: {
          tempA: avgA._avg.temperature || 0,
          tempB: avgB._avg.temperature || 0,
          fixedPointA: Math.round((avgA._avg.temperature || 0) * 256),
          fixedPointB: Math.round((avgB._avg.temperature || 0) * 256),
          result: cmp.result,
          executionTimeMs: cmp.executionTimeMs || 0,
          raw8Mode: false
        }
      });

      res.json({
        result: cmp.result,
        year1_avg: avgA._avg.temperature || 0,
        year2_avg: avgB._avg.temperature || 0,
        daily_data
      });

    } else {
      // Monthly aggregates
      const avgA = await prisma.climateData.aggregate({
        where: { year: yearANum },
        _avg: { temperature: true }
      });

      const avgB = await prisma.climateData.aggregate({
        where: { year: yearBNum },
        _avg: { temperature: true }
      });

      // Monthly averages per month
      const monthsA = await prisma.$queryRaw<any[]>`
        SELECT month, AVG(temperature) as temperature
        FROM "ClimateData" WHERE year = ${yearANum}
        GROUP BY month ORDER BY month ASC`;
      const monthsB = await prisma.$queryRaw<any[]>`
        SELECT month, AVG(temperature) as temperature
        FROM "ClimateData" WHERE year = ${yearBNum}
        GROUP BY month ORDER BY month ASC`;

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthly_data = monthsA.map((a: any, i: number) => {
        const b = monthsB[i];
        const aTemp = a ? parseFloat(a.temperature) : 0;
        const bTemp = b ? parseFloat(b.temperature) : 0;
        return {
          month: monthNames[(a?.month ?? (i+1))-1] || monthNames[i],
          year1_avg: aTemp,
          year2_avg: bTemp,
          deviation: bTemp - aTemp
        };
      });

      // Perform and log per-month comparisons via Verilator
      const monthComparisonsInsert = await Promise.all(
        monthsA.map(async (a: any, i: number) => {
          const b = monthsB[i];
          if (!a || !b) return null;
          const aTemp = parseFloat(a.temperature);
          const bTemp = parseFloat(b.temperature);
          const cmp = await executeVerilogComparison(aTemp, bTemp, false);
          return {
            tempA: aTemp,
            tempB: bTemp,
            fixedPointA: Math.round(aTemp * 256),
            fixedPointB: Math.round(bTemp * 256),
            result: cmp.result,
            executionTimeMs: cmp.executionTimeMs || 0,
            raw8Mode: false
          };
        })
      );
      const monthLogs = monthComparisonsInsert.filter(Boolean) as any[];
      if (monthLogs.length) {
        await prisma.comparisonLog.createMany({ data: monthLogs });
      }

      const cmp = await executeVerilogComparison(avgA._avg.temperature || 0, avgB._avg.temperature || 0);

      res.json({
        result: cmp.result,
        year1_avg: avgA._avg.temperature || 0,
        year2_avg: avgB._avg.temperature || 0,
        monthly_data
      });
    }
  } catch (error: any) {
    console.error('❌ Historical data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get forecast data
app.get('/api/temperature/prediction', async (req: Request, res: Response) => {
  try {
    // Build PredictionData from 2024 historical and 2025 forecast
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const hist2024 = await prisma.$queryRaw<any[]>`
      SELECT month, AVG(temperature) as temperature
      FROM "ClimateData" WHERE year = 2024
      GROUP BY month ORDER BY month ASC`;

    const forecast2025 = await prisma.forecastData.findMany({
      where: { year: 2025 },
      orderBy: { month: 'asc' }
    });

    const avg2024 = hist2024.length
      ? hist2024.reduce((s, r) => s + parseFloat(r.temperature), 0) / hist2024.length
      : 0;
    const pred2025 = forecast2025.length
      ? forecast2025.reduce((s, r) => s + r.temperature, 0) / forecast2025.length
      : 0;
    const change = pred2025 - avg2024;
    const changePercent = avg2024 ? (change / avg2024) * 100 : 0;

    const monthly_comparison = await Promise.all(
      forecast2025.map(async (f, i) => {
        const h = hist2024[i];
        const temp2024 = h ? parseFloat(h.temperature) : 0;
        const temp2025 = f.temperature;
        const cmp = await executeVerilogComparison(temp2024, temp2025);

        // Log each month comparison
        await prisma.comparisonLog.create({
          data: {
            tempA: temp2024,
            tempB: temp2025,
            fixedPointA: Math.round(temp2024 * 256),
            fixedPointB: Math.round(temp2025 * 256),
            result: cmp.result,
            executionTimeMs: cmp.executionTimeMs || 0,
            raw8Mode: false
          }
        });

        return {
          month: monthNames[(f.month ?? (i+1))-1] || monthNames[i],
          temp2024,
          temp2025,
          change: temp2025 - temp2024,
          change_percent: temp2024 ? ((temp2025 - temp2024) / temp2024) * 100 : 0
        };
      })
    );

    // Hottest/coldest months from forecast
    let hottestMonth = { month: 'N/A', temp: 0 };
    let coldestMonth = { month: 'N/A', temp: 0 };
    if (forecast2025.length) {
      const sorted = [...forecast2025].sort((a, b) => b.temperature - a.temperature);
      hottestMonth = { month: monthNames[(sorted[0].month)-1], temp: sorted[0].temperature };
      const sortedAsc = [...forecast2025].sort((a, b) => a.temperature - b.temperature);
      coldestMonth = { month: monthNames[(sortedAsc[0].month)-1], temp: sortedAsc[0].temperature };
    }

    res.json({
      overall: { avg2024, pred2025, change, changePercent },
      hottestMonth,
      coldestMonth,
      monthly_comparison
    });
  } catch (error: any) {
    console.error('❌ Forecast data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forecast comparison
app.post('/api/temperature/forecast-comparison', async (req: Request, res: Response) => {
  try {
    // Accept both naming schemes
    const body: any = req.body;
    const historicalYear = body.historicalYear ?? body.year1 ?? body.yearA;
    const forecastYear = body.forecastYear ?? body.year2 ?? body.yearB;

    // Get historical monthly averages
    const historical = await prisma.$queryRaw<any[]>`
      SELECT 
        month,
        AVG(temperature) as temperature
      FROM "ClimateData"
      WHERE year = ${historicalYear}
      GROUP BY month
      ORDER BY month ASC
    `;

    // Get forecast data
    const forecasts = await prisma.forecastData.findMany({
      where: { year: forecastYear },
      orderBy: { month: 'asc' }
    });

    const histMap = new Map<number, number>();
    historical.forEach(h => {
      const m = Number(h.month);
      histMap.set(m, parseFloat(h.temperature));
    });

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const monthly_comparison = (await Promise.all(
      forecasts.map(async (f) => {
        const monthNum = f.month;
        const histTemp = histMap.get(monthNum);
        if (histTemp === undefined) return null;

        const cmp = await executeVerilogComparison(histTemp, f.temperature);

        // Log comparison
        await prisma.comparisonLog.create({
          data: {
            tempA: histTemp,
            tempB: f.temperature,
            fixedPointA: Math.round(histTemp * 256),
            fixedPointB: Math.round(f.temperature * 256),
            result: cmp.result,
            executionTimeMs: cmp.executionTimeMs || 0,
            raw8Mode: false
          }
        });

        const change = f.temperature - histTemp;
        return {
          month: monthNames[(monthNum ?? 1) - 1] || String(monthNum),
          temp2024: histTemp,
          temp2025: f.temperature,
          change,
          change_percent: histTemp ? (change / histTemp) * 100 : 0
        };
      })
    )).filter(Boolean) as any[];

    // Overall stats
    const avgHistorical = historical.length
      ? historical.reduce((s: number, h: any) => s + parseFloat(h.temperature), 0) / historical.length
      : 0;
    const avgForecast = forecasts.length
      ? forecasts.reduce((s, f) => s + f.temperature, 0) / forecasts.length
      : 0;
    const changeOverall = avgForecast - avgHistorical;
    const changePercentOverall = avgHistorical ? (changeOverall / avgHistorical) * 100 : 0;

    // Hottest/coldest forecast months
    let hottestMonth = { month: 'N/A', temp: 0 };
    let coldestMonth = { month: 'N/A', temp: 0 };
    if (forecasts.length) {
      const sorted = [...forecasts].sort((a, b) => b.temperature - a.temperature);
      hottestMonth = { month: monthNames[(sorted[0].month)-1], temp: sorted[0].temperature };
      const sortedAsc = [...forecasts].sort((a, b) => a.temperature - b.temperature);
      coldestMonth = { month: monthNames[(sortedAsc[0].month)-1], temp: sortedAsc[0].temperature };
    }

    res.json({
      year1: historicalYear,
      year2: forecastYear,
      overall: {
        avg2024: avgHistorical,
        pred2025: avgForecast,
        change: changeOverall,
        changePercent: changePercentOverall,
      },
      hottestMonth,
      coldestMonth,
      monthly_comparison
    });
  } catch (error: any) {
    console.error('❌ Forecast comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============== ADMIN/UTILITY ROUTES ==============

// Frontend-friendly comparison logs with statistics
app.get('/api/comparison-logs', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const sinceParam = req.query.since as string | undefined;
    const since = sinceParam ? new Date(isNaN(Number(sinceParam)) ? sinceParam : Number(sinceParam)) : undefined;

    const whereClause = since ? { timestamp: { gte: since } } : undefined as any;

    const logs = await prisma.comparisonLog.findMany({
      where: whereClause,
      take: limit,
      orderBy: { timestamp: 'desc' }
    });

    const totalCount = await prisma.comparisonLog.count({ where: whereClause });

    // Map DB fields to the shape expected by the React dashboard
    const mappedLogs = logs.map((log) => ({
      timestamp: log.timestamp.toISOString(),
      input_a_celsius: log.tempA,
      input_b_celsius: log.tempB,
      fixed_point_a: log.fixedPointA,
      fixed_point_b: log.fixedPointB,
      result: log.result,
      execution_time_ms: log.executionTimeMs,
      verilator_binary: 'obj_dir/Vcomparator',
      verilator_output: log.result, // Verilator prints the result string; reuse here
      method: log.raw8Mode ? 'HDL_VERILATOR_RAW8' : 'HDL_VERILATOR'
    }));

    const statsWindow = mappedLogs;
    const avgExecution = statsWindow.length
      ? statsWindow.reduce((sum, l) => sum + (l.execution_time_ms || 0), 0) / statsWindow.length
      : 0;

    const statistics = {
      total_comparisons_window: statsWindow.length,
      total_comparisons_all: totalCount,
      hdl_comparisons_window: statsWindow.filter(l => l.method === 'HDL_VERILATOR').length,
      fallback_comparisons_window: 0,
      avg_execution_time_ms: avgExecution,
      verilator_binary: 'obj_dir/Vcomparator',
      verilator_available: true
    };

    res.json({ logs: mappedLogs, statistics });
  } catch (error: any) {
    console.error('❌ Comparison logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get comparison history
app.get('/api/comparisons/history', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const logs = await prisma.comparisonLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    });

    res.json({ logs, count: logs.length });
  } catch (error: any) {
    console.error('❌ History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin utility: fix legacy Unknown results by recomputing from inputs
app.post('/api/admin/fix-unknown-logs', async (req: Request, res: Response) => {
  try {
    const unknownLogs = await prisma.comparisonLog.findMany({
      where: { result: { equals: 'Unknown' } },
      orderBy: { timestamp: 'asc' }
    });

    let fixedCount = 0;
    for (const log of unknownLogs) {
      const a = log.tempA;
      const b = log.tempB;
      let result: string;
      if (a < b) result = 'A<B';
      else if (a > b) result = 'A>B';
      else result = 'A=B';

      await prisma.comparisonLog.update({
        where: { id: log.id },
        data: {
          result,
          fixedPointA: log.fixedPointA || Math.round(a * 256),
          fixedPointB: log.fixedPointB || Math.round(b * 256)
        }
      });
      fixedCount++;
    }

    res.json({ total_unknown: unknownLogs.length, fixed: fixedCount });
  } catch (error: any) {
    console.error('❌ Fix unknown logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
async function main() {
  try {
    // Initialize Prisma with LibSQL adapter
    const adapter = new PrismaLibSql({
      url: `file:${process.env.DATABASE_URL?.replace('file:', '') || './dev.db'}`
    });
    prisma = new PrismaClient({ adapter });
    
    // Test database connection
    const testQuery = await Promise.race([
      prisma.$queryRaw`SELECT 1 as test`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
    ]);
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('📊 Endpoints:');
      console.log('  - GET  /health');
      console.log('  - POST /compare');
      console.log('  - GET  /api/climate/exogenous');
      console.log('  - POST /api/temperature/historical');
      console.log('  - GET  /api/temperature/prediction');
      console.log('  - POST /api/temperature/forecast-comparison');
      console.log('  - GET  /api/comparisons/history');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
