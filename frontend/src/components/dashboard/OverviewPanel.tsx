import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { 
  Thermometer, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Cpu, 
  Database,
  BarChart3,
  Cloud,
  ArrowRight,
  WifiOff
} from 'lucide-react';
import { api, type ComparisonResult, type PredictionData } from '@/services/api';
import { getHistoricalData as getHistoricalDataMock, getPredictionData as getPredictionDataMock } from '@/services/mockData';
import { classifyTemperature } from '@/utils/temperatureClassification';
import type { ViewType } from '@/pages/Dashboard';

interface OverviewPanelProps {
  onNavigate: (view: ViewType) => void;
}

const OverviewPanel = ({ onNavigate }: OverviewPanelProps) => {
  const [historicalData, setHistoricalData] = useState<ComparisonResult>(() =>
    getHistoricalDataMock('2020', '2024', 'all', 'yearly')
  );
  const [predictionData, setPredictionData] = useState<PredictionData>(() => getPredictionDataMock());
  const [verilogConnected, setVerilogConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [hist, pred] = await Promise.all([
          api.getHistoricalData({ year1: '2020', year2: '2024', month: 'all', viewMode: 'Year-to-Year' }),
          api.getPredictionData()
        ]);
        if (mounted) {
          setHistoricalData(hist);
          setPredictionData(pred);
        }
      } catch (err) {
        console.error('OverviewPanel using mock data due to error:', err);
        if (mounted) {
          setHistoricalData(getHistoricalDataMock('2020', '2024', 'all', 'yearly'));
          setPredictionData(getPredictionDataMock());
        }
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  // Health check for Verilog backend connection
  useEffect(() => {
    let mounted = true;
    
    const checkConnection = async () => {
      try {
        await api.checkHealth();
        if (mounted) setVerilogConnected(true);
      } catch (err) {
        if (mounted) setVerilogConnected(false);
      }
    };

    // Check immediately
    checkConnection();
    
    // Poll every 3 seconds
    const interval = setInterval(checkConnection, 3000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  const year1Impact = classifyTemperature(historicalData.year1_avg);
  const year2Impact = classifyTemperature(historicalData.year2_avg);
  const predImpact = classifyTemperature(predictionData.overall.pred2025);

  const stats = [
    {
      label: '2024 Average',
      value: `${predictionData.overall.avg2024.toFixed(2)}°C`,
      icon: <Thermometer className="w-5 h-5" />,
      trend: year2Impact.status,
      trendLabel: year2Impact.statusLabel
    },
    {
      label: '2025 Forecast',
      value: `${predictionData.overall.pred2025.toFixed(2)}°C`,
      icon: <TrendingUp className="w-5 h-5" />,
      trend: predImpact.status,
      trendLabel: `+${predictionData.overall.changePercent.toFixed(2)}%`
    },
    {
      label: 'Hottest Month',
      value: predictionData.hottestMonth.month,
      icon: <Activity className="w-5 h-5" />,
      subValue: `${predictionData.hottestMonth.temp.toFixed(2)}°C`,
      trend: 'harmful' as const
    },
    {
      label: 'Coldest Month',
      value: predictionData.coldestMonth.month,
      icon: <TrendingDown className="w-5 h-5" />,
      subValue: `${predictionData.coldestMonth.temp.toFixed(2)}°C`,
      trend: 'safe' as const
    }
  ];

  const quickActions: Array<{ id: ViewType; label: string; icon: React.ReactNode; color: string }> = [
    { id: 'historical', label: 'Historical Analysis', icon: <BarChart3 className="w-5 h-5" />, color: 'from-blue-500 to-cyan-500' },
    { id: 'prediction', label: 'View Forecast', icon: <TrendingUp className="w-5 h-5" />, color: 'from-amber-500 to-orange-500' },
    { id: 'climate', label: 'Climate Data', icon: <Cloud className="w-5 h-5" />, color: 'from-emerald-500 to-teal-500' }
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <Cpu className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">VLSI Temperature Analysis System</h2>
              <p className="text-muted-foreground">HDL-Based Temperature Comparator | ECE Final Year Project</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              verilogConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                verilogConnected 
                  ? 'bg-emerald-500 animate-pulse' 
                  : 'bg-red-500'
              }`} />
              <span className={`font-medium text-sm ${
                verilogConnected 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {verilogConnected ? 'Verilog Connected' : 'Verilog Disconnected'}
              </span>
              {!verilogConnected && <WifiOff className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary border border-border">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-mono text-sm">2000-2024</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="stat-card"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${stat.trend === 'safe' ? 'bg-emerald-500/20 text-emerald-400' : 
                  stat.trend === 'warning' ? 'bg-amber-500/20 text-amber-400' : 
                  'bg-red-500/20 text-red-400'}`}>
                {stat.icon}
              </div>
              {stat.trendLabel && (
                <span className={`text-xs font-medium px-2 py-1 rounded-full
                  ${stat.trend === 'safe' ? 'bg-emerald-500/10 text-emerald-400' : 
                    stat.trend === 'warning' ? 'bg-amber-500/10 text-amber-400' : 
                    'bg-red-500/10 text-red-400'}`}>
                  {stat.trendLabel}
                </span>
              )}
            </div>
            
            <p className="data-label mb-1">{stat.label}</p>
            <p className="data-value">{stat.value}</p>
            {stat.subValue && (
              <p className="text-sm text-muted-foreground mt-1 font-mono">{stat.subValue}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            onClick={() => onNavigate(action.id)}
            className="glass-card rounded-xl p-6 text-left group hover:border-primary/50 transition-all duration-300"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} 
                          flex items-center justify-center mb-4 
                          group-hover:scale-110 transition-transform duration-300`}>
              {action.icon}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">{action.label}</span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary 
                                   group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Climate Impact Assessment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '2020 Baseline', impact: year1Impact, temp: historicalData.year1_avg },
            { label: '2024 Current', impact: year2Impact, temp: historicalData.year2_avg },
            { label: '2025 Forecast', impact: predImpact, temp: predictionData.overall.pred2025 }
          ].map((item) => (
            <div 
              key={item.label}
              className={`p-4 rounded-xl border ${item.impact.borderColor} ${item.impact.backgroundColor}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-lg">{item.impact.statusEmoji}</span>
              </div>
              <p className="text-2xl font-bold font-mono text-foreground mb-1">
                {item.temp.toFixed(2)}°C
              </p>
              <p className={`text-sm font-medium ${item.impact.color}`}>
                {item.impact.statusLabel}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OverviewPanel;
