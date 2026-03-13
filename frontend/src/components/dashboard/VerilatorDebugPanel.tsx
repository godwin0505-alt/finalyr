import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import ComparatorPlayground from './ComparatorPlayground';

interface ComparisonLog {
  timestamp: string;
  input_a_celsius: number;
  input_b_celsius: number;
  fixed_point_a: number;
  fixed_point_b: number;
  result: string;
  execution_time_ms: number;
  verilator_binary: string;
  verilator_output: string;
  method: string;
}

interface LogsResponse {
  logs: ComparisonLog[];
  statistics: {
    total_comparisons_window: number;
    total_comparisons_all?: number;
    hdl_comparisons_window: number;
    fallback_comparisons_window: number;
    avg_execution_time_ms: number;
    verilator_binary: string;
    verilator_available: boolean;
  };
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || `http://${window.location.hostname}:5000`;

// Full screen view component
export const VerilatorDebugView = () => {
  const [logs, setLogs] = useState<ComparisonLog[]>([]);
  const [stats, setStats] = useState<LogsResponse['statistics'] | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');
  const [windowStart] = useState<number>(() => {
    const stored = localStorage.getItem('verilator_window_start');
    if (stored) return parseInt(stored, 10);
    const now = Date.now();
    localStorage.setItem('verilator_window_start', now.toString());
    return now;
  });

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/comparison-logs?limit=1000&since=${windowStart}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: LogsResponse = await response.json();
      const logsArr = Array.isArray(data.logs) ? data.logs : [];
      if (!Array.isArray(data.logs)) {
        setFetchError('Malformed response: logs is not an array');
      }
      setLogs([...logsArr].reverse()); // Show most recent first without mutating source
      setStats(data.statistics);
      setLastUpdated(new Date().toLocaleTimeString());
      setFetchError('');
    } catch (error) {
      console.error('Failed to fetch comparison logs:', error);
      setFetchError('Could not load logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col gap-6 min-h-0"
    >
      {/* Header Card */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card rounded-2xl p-6 border border-purple-500/30"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">HDL Comparator Monitor</h2>
              <p className="text-sm text-muted-foreground">Real-time Verilator comparison tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                  : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
            <button
              onClick={() => {
                const now = Date.now();
                localStorage.setItem('verilator_window_start', now.toString());
                window.location.reload();
              }}
              className="px-4 py-2 rounded-lg bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-all text-sm font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={fetchLogs}
              className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all border border-primary/30"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="text-xs text-muted-foreground mb-1">Total (window)</div>
              <div className="text-3xl font-bold text-foreground">{logs.length}</div>
              {typeof stats.total_comparisons_all === 'number' && (
                <div className="text-[11px] text-muted-foreground">All-time: {stats.total_comparisons_all}</div>
              )}
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <div className="text-xs text-green-300 mb-1">HDL (window)</div>
              <div className="text-3xl font-bold text-green-400">{logs.filter(l => l.method === 'HDL_VERILATOR').length}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
              <div className="text-xs text-red-300 mb-1">Fallback (window)</div>
              <div className="text-3xl font-bold text-red-400">{stats.fallback_comparisons_window}</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
              <div className="text-xs text-blue-300 mb-1">Avg Execution</div>
              <div className="text-3xl font-bold text-blue-400">{stats.avg_execution_time_ms.toFixed(2)}ms</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10 flex flex-col justify-center items-center">
              <div className="text-xs text-muted-foreground mb-2">Verilator</div>
              {stats.verilator_available ? (
                <CheckCircle className="w-8 h-8 text-green-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>
        )}
      </motion.div>

      <ComparatorPlayground onRunComplete={fetchLogs} />

      {/* Logs Table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 border border-border/50 flex flex-col gap-2"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Comparison Logs</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 gap-3">
          <div className="flex items-center gap-2">
            <span>Most recent first</span>
            <span className="px-2 py-0.5 rounded bg-secondary text-foreground border border-border">{logs.length} logs</span>
            {fetchError && <span className="text-red-400">{fetchError}</span>}
          </div>
          <span>{lastUpdated ? `Updated ${lastUpdated}` : 'Updating...'}</span>
        </div>

        <div className="overflow-y-auto space-y-2 max-h-[70vh] min-h-[240px]">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Cpu className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comparisons yet. Make a comparison to see logs here.</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`p-4 rounded-lg border transition-all ${
                  log.method === 'HDL_VERILATOR'
                    ? 'bg-green-500/5 border-green-500/30 hover:bg-green-500/10'
                    : 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      log.method === 'HDL_VERILATOR' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">
                      {log.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{log.execution_time_ms.toFixed(2)}ms</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Input A (Float)</div>
                    <div className="font-mono text-blue-300 text-sm">{log.input_a_celsius.toFixed(4)}°C</div>
                    <div className="text-xs text-muted-foreground mt-1">Fixed-Point</div>
                    <div className="font-mono text-xs text-purple-300">{log.fixed_point_a}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Input B (Float)</div>
                    <div className="font-mono text-red-300 text-sm">{log.input_b_celsius.toFixed(4)}°C</div>
                    <div className="text-xs text-muted-foreground mt-1">Fixed-Point</div>
                    <div className="font-mono text-xs text-purple-300">{log.fixed_point_b}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Verilator Output</div>
                    <div className="font-mono text-sm text-yellow-300 bg-black/30 p-2 rounded">
                      {log.verilator_output}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-xs font-mono text-gray-400">
                    Binary: {log.verilator_binary}
                  </div>
                  <div className="text-xs font-semibold text-yellow-300">
                    Result: {log.result}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Floating button component (kept for backward compatibility, but not used in sidebar view)
export const VerilatorDebugPanel = () => {
  const [logs, setLogs] = useState<ComparisonLog[]>([]);
  const [stats, setStats] = useState<LogsResponse['statistics'] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/comparison-logs?limit=20`);
      const data: LogsResponse = await response.json();
      setLogs(data.logs.reverse());
      setStats(data.statistics);
    } catch (error) {
      console.error('Failed to fetch comparison logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Cpu className="w-5 h-5" />
        <span className="font-semibold">Verilator Debug</span>
        {stats && (
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
            {stats.total_comparisons} comparisons
          </span>
        )}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-[600px] max-h-[500px] bg-slate-900 text-white rounded-lg shadow-2xl border border-purple-500/30 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <h3 className="font-bold text-lg">HDL Comparator Monitor</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 rounded text-sm ${
                    autoRefresh ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  {autoRefresh ? 'Auto ✓' : 'Manual'}
                </button>
                <button
                  onClick={fetchLogs}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <div className="bg-white/10 rounded p-2">
                  <div className="text-gray-300">Total</div>
                  <div className="font-bold text-lg">{stats.total_comparisons}</div>
                </div>
                <div className="bg-white/10 rounded p-2">
                  <div className="text-gray-300">HDL</div>
                  <div className="font-bold text-lg text-green-400">{stats.hdl_comparisons}</div>
                </div>
                <div className="bg-white/10 rounded p-2">
                  <div className="text-gray-300">Avg Time</div>
                  <div className="font-bold text-lg">{stats.avg_execution_time_ms.toFixed(2)}ms</div>
                </div>
                <div className="bg-white/10 rounded p-2 flex items-center justify-center">
                  {stats.verilator_available ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="overflow-y-auto max-h-[350px] p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No comparisons yet. Make a comparison to see logs here.
              </div>
            ) : (
              logs.map((log, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 rounded border ${
                    log.method === 'HDL_VERILATOR'
                      ? 'bg-green-900/20 border-green-500/30'
                      : 'bg-red-900/20 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cpu className={`w-4 h-4 ${
                        log.method === 'HDL_VERILATOR' ? 'text-green-400' : 'text-red-400'
                      }`} />
                      <span className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{log.execution_time_ms.toFixed(2)}ms</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs">Input A (Float)</div>
                      <div className="font-mono text-blue-300">{log.input_a_celsius.toFixed(4)}°C</div>
                      <div className="text-gray-400 text-xs mt-1">Fixed-Point</div>
                      <div className="font-mono text-xs text-purple-300">{log.fixed_point_a}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Input B (Float)</div>
                      <div className="font-mono text-red-300">{log.input_b_celsius.toFixed(4)}°C</div>
                      <div className="text-gray-400 text-xs mt-1">Fixed-Point</div>
                      <div className="font-mono text-xs text-purple-300">{log.fixed_point_b}</div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400">Verilator Output:</div>
                    <div className="font-mono text-xs text-green-300 bg-black/30 p-2 rounded mt-1">
                      {log.verilator_output}
                    </div>
                    <div className="text-xs font-semibold mt-2 text-yellow-300">
                      Result: {log.result}
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-gray-500 font-mono">
                    Binary: {log.verilator_binary}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
