import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TrendingUp, Thermometer, Snowflake, Flame, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { getPredictionData as getPredictionDataMock, getForecastComparison as getForecastComparisonMock } from '@/services/mockData';
import { classifyTemperature, getStatusBadgeClasses } from '@/utils/temperatureClassification';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
ChartJS.defaults.color = '#ffffff';
ChartJS.defaults.plugins.legend.labels.color = '#ffffff';

const historicalYears = Array.from({ length: 25 }, (_, i) => (2000 + i).toString());
const forecastYears = Array.from({ length: 11 }, (_, i) => (2025 + i).toString());

const PredictionView = () => {
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState('2024');
  const [selectedForecastYear, setSelectedForecastYear] = useState('2025');
  const [isGenerating, setIsGenerating] = useState(false);

  const [predictionData, setPredictionData] = useState(getPredictionDataMock());
  const [forecastComparison, setForecastComparison] = useState(
    getForecastComparisonMock(parseInt(selectedHistoricalYear), parseInt(selectedForecastYear)) as any
  );
  const [loading, setLoading] = useState(false);

  const loadPredictionData = async () => {
    try {
      setLoading(true);
      const data = await api.getPredictionData();
      setPredictionData(data);
    } catch (err) {
      console.error('Falling back to mock prediction data:', err);
      setPredictionData(getPredictionDataMock());
    } finally {
      setLoading(false);
    }
  };

  const loadForecastComparison = async (histYear: string, forecastYear: string) => {
    try {
      setLoading(true);
      const data = await api.getForecastComparison(parseInt(histYear), parseInt(forecastYear));
      setForecastComparison(data as any);
    } catch (err) {
      console.error('Falling back to mock forecast comparison:', err);
      setForecastComparison(getForecastComparisonMock(parseInt(histYear), parseInt(forecastYear)) as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictionData();
  }, []);

  useEffect(() => {
    loadForecastComparison(selectedHistoricalYear, selectedForecastYear);
  }, [selectedHistoricalYear, selectedForecastYear]);

  const overallImpact = classifyTemperature(predictionData?.overall?.pred2025 ?? 0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await api.generatePrediction();
      await loadPredictionData();
      await loadForecastComparison(selectedHistoricalYear, selectedForecastYear);
    } catch (err) {
      console.error('Generate prediction failed, keeping current data:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Forecast Deviation Chart Data
  const deviationChartData = useMemo(() => {
    const monthlyData = forecastComparison?.monthly_comparison || [];
    if (!monthlyData.length) {
      return { labels: [], datasets: [] };
    }
    const maxAbsDev = Math.max(...monthlyData.map((d: any) => Math.abs(d.change)));

    const negativeDeviations = monthlyData.map((d: any) => d.change < 0 ? d.change : 0);
    const positiveDeviations = monthlyData.map((d: any) => d.change > 0 ? d.change : 0);

    const negColors = monthlyData.map((d: any) => {
      if (d.change >= 0) return 'transparent';
      const m = Math.abs(d.change) / maxAbsDev;
      return `rgba(${Math.floor(70 + 30 * m)}, ${Math.floor(170 + 50 * m)}, 255, 0.85)`; // cooler = blues
    });

    const posColors = monthlyData.map((d: any) => {
      if (d.change <= 0) return 'transparent';
      const m = Math.abs(d.change) / maxAbsDev;
      return `rgba(255, ${Math.floor(140 - 60 * m)}, ${Math.floor(90 - 50 * m)}, 0.85)`; // warmer = reds
    });

    return {
      labels: monthlyData.map((d: any) => d.month),
      datasets: [
        {
          label: 'Cooler than Historical',
          data: negativeDeviations,
          backgroundColor: negColors,
          borderColor: 'rgba(90, 180, 255, 0.9)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Warmer than Historical',
          data: positiveDeviations,
          backgroundColor: posColors,
          borderColor: 'rgba(255, 120, 90, 0.9)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [forecastComparison]);

  const chartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: { 
          color: '#ffffff',
          font: { family: 'JetBrains Mono', size: 12 },
          usePointStyle: false,
          generateLabels: (chart: any) => [
            {
              text: 'Cooler than Historical',
              fillStyle: 'rgba(90, 180, 255, 0.9)',
              strokeStyle: 'rgba(90, 180, 255, 0.9)',
              lineWidth: 1,
              hidden: !chart.isDatasetVisible(0),
              datasetIndex: 0,
              fontColor: 'rgba(90, 180, 255, 1)',
            },
            {
              text: 'Warmer than Historical',
              fillStyle: 'rgba(255, 120, 90, 0.9)',
              strokeStyle: 'rgba(255, 120, 90, 0.9)',
              lineWidth: 1,
              hidden: !chart.isDatasetVisible(1),
              datasetIndex: 1,
              fontColor: 'rgba(255, 120, 90, 1)',
            }
          ],
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { family: 'JetBrains Mono' },
        bodyFont: { family: 'JetBrains Mono' },
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(6)}°C`
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

  return (
    <div className="space-y-6">
      {/* Global Temperature Impact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center
              ${overallImpact.status === 'safe' ? 'bg-emerald-500/20' : 
                overallImpact.status === 'warning' ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
              <Thermometer className={`w-10 h-10 ${overallImpact.color}`} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">2025 Climate Forecast</h2>
              <p className="text-muted-foreground">SARIMAX Prediction Model</p>
              <span className={getStatusBadgeClasses(overallImpact.status) + ' mt-2 inline-block'}>
                {overallImpact.statusEmoji} {overallImpact.statusLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">2024 Avg</p>
              <p className="text-xl font-bold font-mono text-foreground">
                {predictionData?.overall ? predictionData.overall.avg2024.toFixed(2) : '--'}°C
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">2025 Pred</p>
              <p className="text-xl font-bold font-mono text-primary">
                {predictionData?.overall ? predictionData.overall.pred2025.toFixed(2) : '--'}°C
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Change</p>
              <p className={`text-xl font-bold font-mono ${
                (predictionData?.overall?.change ?? 0) > 0 ? 'text-red-400' : 'text-cyan-400'
              }`}>
                {predictionData?.overall?.change > 0 ? '+' : ''}{predictionData?.overall ? predictionData.overall.changePercent.toFixed(2) : '--'}%
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground
                     font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      </motion.div>

      {/* Extremes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card border border-red-500/30 bg-red-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Flame className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="data-label">Hottest Month (2025)</p>
              <p className="text-2xl font-bold text-foreground">{predictionData?.hottestMonth?.month ?? '--'}</p>
              <p className="font-mono text-red-400">{predictionData?.hottestMonth ? predictionData.hottestMonth.temp.toFixed(4) : '--'}°C</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="stat-card border border-cyan-500/30 bg-cyan-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Snowflake className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="data-label">Coldest Month (2025)</p>
              <p className="text-2xl font-bold text-foreground">{predictionData?.coldestMonth?.month ?? '--'}</p>
              <p className="font-mono text-cyan-400">{predictionData?.coldestMonth ? predictionData.coldestMonth.temp.toFixed(4) : '--'}°C</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Forecast Comparison Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Historical Year</label>
            <select 
              value={selectedHistoricalYear} 
              onChange={(e) => setSelectedHistoricalYear(e.target.value)}
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-foreground 
                       font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {historicalYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center text-muted-foreground">
            <TrendingUp className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Forecast Year</label>
            <select 
              value={selectedForecastYear} 
              onChange={(e) => setSelectedForecastYear(e.target.value)}
              className="h-10 px-3 rounded-lg bg-secondary border border-border text-foreground 
                       font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {forecastYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Deviation Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="chart-container"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Forecast Deviation: {selectedHistoricalYear} vs {selectedForecastYear}
        </h3>

        <div className="h-[450px]">
          <Bar data={deviationChartData} options={chartOptions} />
        </div>
      </motion.div>
    </div>
  );
};

export default PredictionView;
