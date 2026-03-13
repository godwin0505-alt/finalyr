import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { api, type ComparisonResult } from '@/services/api';
import { getHistoricalData as getHistoricalDataMock } from '@/services/mockData';
import { classifyTemperature, getStatusBadgeClasses } from '@/utils/temperatureClassification';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ViewMode = 'daily' | 'monthly' | 'yearly';

const months = [
  { value: 'all', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const years = Array.from({ length: 25 }, (_, i) => (2000 + i).toString());

const HistoricalAnalysis = () => {
  const [year1, setYear1] = useState('2020');
  const [year2, setYear2] = useState('2024');
  const [month, setMonth] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [data, setData] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const view = viewMode === 'daily' ? 'Day-to-Day' : viewMode === 'monthly' ? 'Month-to-Month' : 'Year-to-Year';
        const result = await api.getHistoricalData({
          year1,
          year2,
          month,
          viewMode: view
        });
        if (mounted) setData(result);
      } catch (err: any) {
        console.error('Falling back to mock historical data:', err);
        if (mounted) {
          setError(err?.message || 'Failed to load historical data');
          setData(getHistoricalDataMock(year1, year2, month, viewMode));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [year1, year2, month, viewMode]);

  // Daily View Chart Data
  const dailyChartData = useMemo(() => {
    if (!data?.daily_data) return null;
    
    return {
      labels: data.daily_data.map(d => d.date),
      datasets: [
        {
          label: `Year ${year1}`,
          data: data.daily_data.map(d => d.year1_temp),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: `Year ${year2}`,
          data: data.daily_data.map(d => d.year2_temp),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Deviation',
          data: data.daily_data.map(d => d.deviation),
          borderColor: 'rgba(20, 184, 166, 1)',
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderDash: [5, 5],
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  }, [data?.daily_data, year1, year2]);

  // Monthly View Chart Data (Diverging Bar)
  const monthlyChartData = useMemo(() => {
    if (!data?.monthly_data) return null;

    const sortedData = [...data.monthly_data];
    const maxAbsDev = Math.max(...sortedData.map(d => Math.abs(d.deviation)));

    const negativeDeviations = sortedData.map(d => d.deviation < 0 ? d.deviation : 0);
    const positiveDeviations = sortedData.map(d => d.deviation > 0 ? d.deviation : 0);

    // Color schemes: cooler (negative deviations) = blues, warmer (positive deviations) = reds
    const negColors = sortedData.map(d => {
      if (d.deviation >= 0) return 'transparent';
      const m = Math.abs(d.deviation) / maxAbsDev;
      // Blues intensify with magnitude
      return `rgba(${Math.floor(70 - 40 * m)}, ${Math.floor(160 + 30 * m)}, 255, 0.85)`;
    });

    const posColors = sortedData.map(d => {
      if (d.deviation <= 0) return 'transparent';
      const m = Math.abs(d.deviation) / maxAbsDev;
      // Reds intensify with magnitude
      return `rgba(255, ${Math.floor(140 - 60 * m)}, ${Math.floor(90 - 50 * m)}, 0.85)`;
    });

    return {
      labels: sortedData.map(d => d.month),
      datasets: [
        {
          label: 'Cooler vs Baseline',
          data: negativeDeviations,
          backgroundColor: negColors,
          borderColor: 'rgba(80, 160, 255, 0.95)',
          borderRadius: 4,
        },
        {
          label: 'Warmer vs Baseline',
          data: positiveDeviations,
          backgroundColor: posColors,
          borderColor: 'rgba(255, 80, 80, 0.95)',
          borderRadius: 4,
        },
      ],
    };
  }, [data?.monthly_data]);

  // Yearly View Chart Data
  const yearlyChartData = useMemo(() => {
    if (!data) return null;
    return {
      labels: [`Year ${year1}`, `Year ${year2}`],
      datasets: [
        {
          label: 'Average Temperature (°C)',
          data: [data.year1_avg, data.year2_avg],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderRadius: 8,
          barThickness: 60,
        },
      ],
    };
  }, [data, year1, year2]);

  if (loading || !data) {
    return (
      <div className="p-6 glass-card rounded-2xl text-center text-muted-foreground">
        {loading ? 'Loading historical data…' : 'Preparing data…'}
      </div>
    );
  }

  const impact1 = classifyTemperature(data.year1_avg ?? 0);
  const impact2 = classifyTemperature(data.year2_avg ?? 0);

  const dailyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'JetBrains Mono' } }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      x: { 
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono', size: 10 } }
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: { display: true, text: 'Temperature (°C)', color: 'rgba(255,255,255,0.7)' },
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono' } }
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        title: { display: true, text: 'Deviation (°C)', color: 'rgba(20, 184, 166, 0.7)' },
        grid: { drawOnChartArea: false },
        ticks: { color: 'rgba(20, 184, 166, 0.7)', font: { family: 'JetBrains Mono' } }
      },
    },
  };

  const monthlyChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          color: 'rgba(255,255,255,0.7)',
          font: { family: 'JetBrains Mono' },
          // Ensure legend swatches use category colors (blue=cooler, red=warmer)
          generateLabels: (chart: any) => {
            const labels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            return labels.map((l: any) => {
              if (l.text?.toLowerCase().includes('cooler')) {
                l.fillStyle = 'rgba(80, 160, 255, 0.95)';
                l.strokeStyle = 'rgba(80, 160, 255, 0.95)';
              } else if (l.text?.toLowerCase().includes('warmer')) {
                l.fillStyle = 'rgba(255, 80, 80, 0.95)';
                l.strokeStyle = 'rgba(255, 80, 80, 0.95)';
              }
              return l;
            });
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(2)}°C`
        }
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono' } }
      },
      y: {
        stacked: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono' } }
      },
    },
  };

  const yearlyChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        callbacks: {
          label: (context: any) => `${context.raw.toFixed(4)}°C`
        }
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono' } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono' } }
      },
    },
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          {error} — showing fallback data.
        </div>
      )}
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Year 1 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Year 1</label>
            <select 
              value={year1} 
              onChange={(e) => setYear1(e.target.value)}
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-foreground 
                       font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Year 2 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Year 2</label>
            <select 
              value={year2} 
              onChange={(e) => setYear2(e.target.value)}
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-foreground 
                       font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Month</label>
            <select 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-foreground 
                       text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {/* View Mode */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">View Mode</label>
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(['daily', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors
                    ${viewMode === mode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Comparison Result */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className={`stat-card border ${impact1.borderColor}`}>
          <p className="data-label mb-2">Year {year1} Average</p>
          <p className="text-3xl font-bold font-mono text-foreground">
            {data.year1_avg.toFixed(4)}°C
          </p>
          <span className={getStatusBadgeClasses(impact1.status)}>
            {impact1.statusEmoji} {impact1.statusLabel}
          </span>
        </div>

        <div className={`stat-card border ${impact2.borderColor}`}>
          <p className="data-label mb-2">Year {year2} Average</p>
          <p className="text-3xl font-bold font-mono text-foreground">
            {data.year2_avg.toFixed(4)}°C
          </p>
          <span className={getStatusBadgeClasses(impact2.status)}>
            {impact2.statusEmoji} {impact2.statusLabel}
          </span>
        </div>

        <div className="stat-card border border-primary/30 bg-primary/5">
          <p className="data-label mb-2">HDL Comparator Result</p>
          <p className="text-xl font-bold text-primary">{data.result}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Δ = {(data.year2_avg - data.year1_avg).toFixed(4)}°C
          </p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="chart-container"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          {viewMode === 'daily' && <><Calendar className="w-5 h-5 text-primary" /> Daily Temperature Comparison</>}
          {viewMode === 'monthly' && <><BarChart3 className="w-5 h-5 text-primary" /> Monthly Deviation Analysis</>}
          {viewMode === 'yearly' && <><TrendingUp className="w-5 h-5 text-primary" /> Yearly Average Comparison</>}
        </h3>

        <div className="h-[400px]">
          {viewMode === 'daily' && dailyChartData && (
            <Line data={dailyChartData} options={dailyChartOptions} />
          )}
          {viewMode === 'monthly' && monthlyChartData && (
            <Bar data={monthlyChartData} options={monthlyChartOptions} />
          )}
          {viewMode === 'yearly' && (
            <Bar data={yearlyChartData} options={yearlyChartOptions} />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default HistoricalAnalysis;
