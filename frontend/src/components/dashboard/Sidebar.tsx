import { motion } from 'framer-motion';
import { Cpu, Thermometer, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import type { NavItem, ViewType } from '@/pages/Dashboard';

interface SidebarProps {
  navItems: NavItem[];
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  collapsed: boolean;
}

const Sidebar = ({ navItems, activeView, onViewChange, collapsed }: SidebarProps) => {
  const [verilogConnected, setVerilogConnected] = useState(false);

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
  return (
    <div className="h-full flex flex-col py-6">
      <div className="px-6 mb-8">
        <motion.div 
          className="flex items-center gap-3"
          animate={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-primary">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-sidebar animate-pulse-glow" />
          </div>
          
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col"
            >
              <span className="font-bold text-foreground text-lg leading-tight">VLSI Temp</span>
              <span className="text-xs text-muted-foreground">Analysis System</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item, index) => (
          <motion.button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full nav-item ${activeView === item.id ? 'active' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className={activeView === item.id ? 'text-primary' : ''}>
              {item.icon}
            </span>
            
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </motion.button>
        ))}
      </nav>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`px-4 py-4 mx-3 rounded-xl border ${
            verilogConnected 
              ? 'bg-secondary/50 border-border/50' 
              : 'bg-red-500/5 border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              verilogConnected 
                ? 'bg-primary/20' 
                : 'bg-red-500/20'
            }`}>
              {verilogConnected ? (
                <Thermometer className="w-4 h-4 text-primary" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">HDL Comparator</p>
              <p className={`text-sm font-medium ${
                verilogConnected 
                  ? 'text-emerald-400' 
                  : 'text-red-400'
              }`}>
                {verilogConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${
              verilogConnected 
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-red-500'
            }`} />
            <span className={verilogConnected ? '' : 'text-red-400'}>
              {verilogConnected ? 'Verilog service active' : 'Verilog service offline'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Sidebar;
