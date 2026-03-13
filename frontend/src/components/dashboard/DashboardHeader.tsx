import { motion } from 'framer-motion';
import { Bell, Search, Settings } from 'lucide-react';
import type { NavItem, ViewType } from '@/pages/Dashboard';

interface DashboardHeaderProps {
  currentView: ViewType;
  navItems: NavItem[];
}

const DashboardHeader = ({ currentView, navItems }: DashboardHeaderProps) => {
  const currentItem = navItems.find(item => item.id === currentView);

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between">
      <div>
        <motion.h1 
          key={currentView}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold text-foreground"
        >
          {currentItem?.label}
        </motion.h1>
        <motion.p 
          key={`${currentView}-desc`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          {currentItem?.description}
        </motion.p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 h-9 pl-10 pr-4 rounded-lg bg-secondary border border-border 
                     text-sm text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                     transition-all"
          />
        </div>

        <button className="relative w-9 h-9 rounded-lg bg-secondary border border-border 
                         flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary 
                         text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            3
          </span>
        </button>

        <button className="w-9 h-9 rounded-lg bg-secondary border border-border 
                         flex items-center justify-center hover:bg-muted transition-colors">
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent 
                      flex items-center justify-center text-sm font-bold text-primary-foreground">
          EC
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
