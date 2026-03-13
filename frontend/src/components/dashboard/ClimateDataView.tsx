import { useMemo, useState, useEffect } from 'react';
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
import { Thermometer, Droplets, Wind, CloudRain, Calendar, Filter } from 'lucide-react';
import { api } from '@/services/api';

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

type ViewMode = 'daily' | 'monthly';

interface ClimateDataPoint {
  date?: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  pressure?: number;
}

const ClimateDataView = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [data, setData] = useState<ClimateDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate year options (2000-2024)
  const yearOptions = Array.from({ length: 25 }, (_, i) => 2000 + i);
  
  // Month names for the selector
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getClimateData(viewMode, selectedYear, viewMode === 'daily' ? selectedMonth : undefined);
        if (mounted) {
          setData(result.data || []);
        }
      } catch (err: any) {
        console.error('Failed to load climate data:', err);
        if (mounted) {
          setError(err?.message || 'Failed to load climate data');
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [viewMode, selectedYear, selectedMonth]);

  // Generate chart labels based on view mode
  const chartLabels = useMemo(() => {
    if (viewMode === 'daily') {
      return data.map((d, i) => `Day ${i + 1}`);
    } else {
      return monthNames.slice(0, data.length);
    }
  }, [data, viewMode]);

  // 1. Temperature Chart
  const temperatureData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Temperature (°C)',
        data: data.map(d => d.temperature),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointRadius: viewMode === 'daily' ? 2 : 3,
        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
      },
    ],
  };

  // 2. Humidity Chart
  const humidityData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Humidity (%)',
        data: data.map(d => d.humidity),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointRadius: viewMode === 'daily' ? 2 : 3,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      },
    ],
  };

  // 3. Precipitation Chart (Bar)
  const precipitationData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Precipitation (mm)',
        data: data.map(d => d.precipitation),
        backgroundColor: (context: any) => {
          const value = context.raw;
          const max = Math.max(...data.map(d => d.precipitation));
          const min = Math.min(...data.map(d => d.precipitation));
          if (max === min) return 'rgba(34, 211, 238, 0.7)';
          const normalized = (value - min) / (max - min);
          return `rgba(34, 211, 238, ${0.3 + normalized * 0.5})`;
        },
        borderRadius: 4,
      },
    ],
  };

  // 4. Wind Speed Chart
  const windSpeedData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Wind Speed (m/s)',
        data: data.map(d => d.windSpeed),
        borderColor: 'rgba(20, 184, 166, 1)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(20, 184, 166, 0.4)');
          gradient.addColorStop(1, 'rgba(20, 184, 166, 0.0)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointRadius: viewMode === 'daily' ? 2 : 3,
        pointBackgroundColor: 'rgba(20, 184, 166, 1)',
      },
    ],
  };

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'JetBrains Mono', size: 11 } }
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
        ticks: { 
          color: 'rgba(255,255,255,0.5)', 
          font: { family: 'JetBrains Mono', size: 10 },
          maxRotation: viewMode === 'daily' ? 90 : 45,
          minRotation: viewMode === 'daily' ? 45 : 0,
        }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { family: 'JetBrains Mono', size: 10 } }
      },
    },
  };

  // Calculate stats from current data
  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        avgTemp: 0,
        avgHumidity: 0,
        totalPrecip: 0,
        avgWind: 0,
      };
    }
    
    return {
      avgTemp: (data.reduce((sum, d) => sum + d.temperature, 0) / data.length).toFixed(2),
      avgHumidity: (data.reduce((sum, d) => sum + d.humidity, 0) / data.length).toFixed(1),
      totalPrecip: data.reduce((sum, d) => sum + d.precipitation, 0).toFixed(0),
      avgWind: (data.reduce((sum, d) => sum + d.windSpeed, 0) / data.length).toFixed(2),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 border border-slate-800"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Filter Options</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* View Mode Selector */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">View Mode</label>
            <div className="flex gap-2">
              {(['daily', 'monthly'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector (only for daily view) */}
          {viewMode === 'daily' && (
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Filter Display */}
        <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="font-mono">
              Viewing <span className="text-primary font-semibold">{viewMode}</span> data
              {viewMode === 'daily' && ` for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
              {viewMode === 'monthly' && ` for ${selectedYear}`}
            </span>
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Loading climate data...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="w-10 h-10 rounded-lg bg-red-400/10 flex items-center justify-center mb-3">
            <Thermometer className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-xs text-muted-foreground">Avg Temperature</p>
          <p className="text-lg font-bold font-mono text-foreground">{stats.avgTemp}°C</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="stat-card"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center mb-3">
            <Droplets className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-muted-foreground">Avg Humidity</p>
          <p className="text-lg font-bold font-mono text-foreground">{stats.avgHumidity}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center mb-3">
            <CloudRain className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-xs text-muted-foreground">Total Precipitation</p>
          <p className="text-lg font-bold font-mono text-foreground">{stats.totalPrecip}mm</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="stat-card"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-400/10 flex items-center justify-center mb-3">
            <Wind className="w-5 h-5 text-teal-400" />
          </div>
          <p className="text-xs text-muted-foreground">Avg Wind Speed</p>
          <p className="text-lg font-bold font-mono text-foreground">{stats.avgWind}m/s</p>
        </motion.div>
      </div>

      {/* Charts Grid - 4 Separate Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Temperature Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="chart-container"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-red-400" />
            Temperature Trend
          </h3>
          <div className="h-[280px]">
            <Line data={temperatureData} options={baseChartOptions} />
          </div>
        </motion.div>

        {/* 2. Humidity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="chart-container"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            Humidity
          </h3>
          <div className="h-[280px]">
            <Line data={humidityData} options={baseChartOptions} />
          </div>
        </motion.div>

        {/* 3. Precipitation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="chart-container"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-cyan-400" />
            Precipitation
          </h3>
          <div className="h-[280px]">
            <Bar data={precipitationData} options={baseChartOptions} />
          </div>
        </motion.div>

        {/* 4. Wind Speed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="chart-container"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5 text-teal-400" />
            Wind Speed
          </h3>
          <div className="h-[280px]">
            <Line data={windSpeedData} options={baseChartOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClimateDataView;

