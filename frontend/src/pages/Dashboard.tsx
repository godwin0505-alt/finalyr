import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Cloud, 
  Activity,
  Cpu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import OverviewPanel from '@/components/dashboard/OverviewPanel';
import HistoricalAnalysis from '@/components/dashboard/HistoricalAnalysis';
import PredictionView from '@/components/dashboard/PredictionView';
import ClimateDataView from '@/components/dashboard/ClimateDataView';
import { VerilatorDebugView } from '@/components/dashboard/VerilatorDebugPanel';

export type ViewType = 'overview' | 'historical' | 'prediction' | 'climate' | 'verilator';

export interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: <Activity className="w-5 h-5" />,
    description: 'System status and quick stats'
  },
  { 
    id: 'historical', 
    label: 'Historical Analysis', 
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Compare temperature data across years'
  },
  { 
    id: 'prediction', 
    label: 'Forecast', 
    icon: <TrendingUp className="w-5 h-5" />,
    description: 'SARIMAX prediction models'
  },
  { 
    id: 'climate', 
    label: 'Climate Data', 
    icon: <Cloud className="w-5 h-5" />,
    description: 'Multi-variable analysis'
  },
  { 
    id: 'verilator', 
    label: 'Verilator Debug', 
    icon: <Cpu className="w-5 h-5" />,
    description: 'HDL comparator logs and monitoring'
  },
];

const Dashboard = () => {
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return <OverviewPanel onNavigate={setActiveView} />;
      case 'historical':
        return <HistoricalAnalysis />;
      case 'prediction':
        return <PredictionView />;
      case 'climate':
        return <ClimateDataView />;
      case 'verilator':
        return <VerilatorDebugView />;
      default:
        return <OverviewPanel onNavigate={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-background circuit-pattern">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-radial from-accent/5 to-transparent" />
      </div>

      <div className="relative flex h-screen overflow-hidden">
        <motion.aside
          initial={false}
          animate={{ width: sidebarCollapsed ? 80 : 280 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative flex-shrink-0 h-full bg-sidebar border-r border-sidebar-border"
        >
          <Sidebar 
            navItems={navItems}
            activeView={activeView}
            onViewChange={setActiveView}
            collapsed={sidebarCollapsed}
          />
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 
                       bg-secondary border border-border rounded-full 
                       flex items-center justify-center hover:bg-muted transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        </motion.aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader 
            currentView={activeView} 
            navItems={navItems}
          />
          
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
