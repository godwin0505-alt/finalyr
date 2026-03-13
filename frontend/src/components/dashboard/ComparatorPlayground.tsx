import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Binary, CircuitBoard, Clock, Play, RefreshCw, Zap } from 'lucide-react';
import { api, type CompareResponse } from '@/services/api';

interface ComparatorPlaygroundProps {
  onRunComplete?: () => void;
}

interface Stage {
  id: string;
  title: string;
  detail: string;
}

const stages: Stage[] = [
  { id: 'capture', title: 'Latch inputs', detail: 'Sample A and B on the 8-bit bus' },
  { id: 'encode', title: 'Fixed-point encode', detail: 'Shift left by 8 fractional bits (Q8.8)' },
  { id: 'simulate', title: 'Verilator run', detail: 'Execute obj_dir/Vcomparator with inputs' },
  { id: 'decode', title: 'Decision', detail: 'Decode comparator flags into the result' },
];

const clampToByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const wrapBits = (value: number, bits: number) => {
  const modulo = 1 << bits;
  const wrapped = ((value % modulo) + modulo) % modulo;
  return wrapped;
};
const toBinaryString = (value: number, bits: number) => wrapBits(value, bits).toString(2).padStart(bits, '0');
const findDecisionBit = (aBits: string, bBits: string) => {
  for (let i = 0; i < aBits.length; i += 1) {
    if (aBits[i] !== bBits[i]) return i;
  }
  return -1;
};

const ComparatorPlayground = ({ onRunComplete }: ComparatorPlaygroundProps) => {
  const [inputA, setInputA] = useState(42);
  const [inputB, setInputB] = useState(27);
  const [activeStage, setActiveStage] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const stageTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => {
    return () => {
      stageTimers.current.forEach(clearTimeout);
    };
  }, []);

  const binaryA = useMemo(() => toBinaryString(clampToByte(inputA), 8), [inputA]);
  const binaryB = useMemo(() => toBinaryString(clampToByte(inputB), 8), [inputB]);
  const fixedA = useMemo(() => Math.round(inputA * 256), [inputA]);
  const fixedB = useMemo(() => Math.round(inputB * 256), [inputB]);
  const fixedABin = useMemo(() => toBinaryString(fixedA, 16), [fixedA]);
  const fixedBBin = useMemo(() => toBinaryString(fixedB, 16), [fixedB]);
  const decisionBit = useMemo(() => findDecisionBit(binaryA, binaryB), [binaryA, binaryB]);

  const scheduleStages = () => {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
    stageTimers.current.push(setTimeout(() => setActiveStage(1), 200));
    stageTimers.current.push(setTimeout(() => setActiveStage(2), 650));
  };

  const runComparison = async () => {
    setError(null);
    setResult(null);
    setActiveStage(0);
    setIsRunning(true);
    scheduleStages();

    try {
      // Use fixed-point path (raw8=false) so fractional inputs like 24.5 are honored
      const response = await api.compareTemperatures(inputA, inputB, false);
      setResult(response);
      setActiveStage(stages.length - 1);
      setLastRunAt(new Date().toLocaleTimeString());
      onRunComplete?.();
    } catch (err) {
      console.error('Comparator run failed:', err);
      setError('Unable to reach Verilator service. Is flask_service.py running?');
      setActiveStage(0);
    } finally {
      stageTimers.current.forEach(clearTimeout);
      stageTimers.current = [];
      setIsRunning(false);
    }
  };

  const randomizeInputs = () => {
    // Allow fractional samples to exercise Q8.8 path
    const rand = () => Math.round(Math.random() * 2550) / 10;
    setInputA(rand());
    setInputB(rand());
  };

  const humanResult = result?.result || 'Awaiting run';
  const elapsed = result?.log?.execution_time_ms;
  const verilatorOutput = result?.log?.verilator_output;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-6 border border-border/50 flex flex-col gap-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <CircuitBoard className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Manual Verilator drive</p>
            <h3 className="text-xl font-semibold text-foreground">8-bit Comparator Playground</h3>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={randomizeInputs}
            className="px-4 py-2 rounded-lg border border-border bg-secondary text-sm flex items-center gap-2 hover:border-primary/40"
            disabled={isRunning}
          >
            <RefreshCw className="w-4 h-4" />
            Random inputs
          </button>
          <button
            onClick={runComparison}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 shadow hover:shadow-lg transition"
            disabled={isRunning}
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run with Verilator'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[{ label: 'Input A', value: inputA, onChange: setInputA }, { label: 'Input B', value: inputB, onChange: setInputB }].map((field) => (
          <div key={field.label} className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{field.label}</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={255}
                step={0.1}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <input
                type="number"
                min={0}
                max={255}
                step={0.1}
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded border border-border bg-background text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground">8-bit unsigned value (0-255)</div>
          </div>
        ))}

        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last run</span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-mono text-foreground">{lastRunAt || '--:--:--'}</div>
          <div className="text-sm text-muted-foreground">
            {elapsed ? `Execution: ${elapsed.toFixed(3)} ms` : 'Execution time pending'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Signal lanes</span>
            <Binary className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {[{ label: 'A bus', bits: binaryA, color: 'bg-blue-500/20 text-blue-200' }, { label: 'B bus', bits: binaryB, color: 'bg-amber-500/20 text-amber-200' }].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-12 font-semibold text-foreground">{row.label}</span>
                  <span>MSB</span>
                  <div className="flex-1 h-px bg-border" />
                  <span>LSB</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {row.bits.split('').map((bit, idx) => {
                    const highlight = idx === decisionBit;
                    return (
                      <motion.span
                        key={`${row.label}-${idx}`}
                        initial={{ y: 4, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center font-mono text-sm ${row.color} ${highlight ? 'ring-2 ring-primary/60' : ''}`}
                      >
                        {bit}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[{ label: 'A fixed (Q8.8)', value: fixedA, bits: fixedABin }, { label: 'B fixed (Q8.8)', value: fixedB, bits: fixedBBin }].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-secondary border border-border">
                <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
                <div className="font-mono text-foreground text-sm">{item.value}</div>
                <div className="text-[11px] text-muted-foreground break-all mt-1">{item.bits}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">HDL pipeline</span>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const status = idx < activeStage ? 'done' : idx === activeStage ? 'active' : 'pending';
              return (
                <div key={stage.id} className={`p-3 rounded-lg border flex items-center gap-3 ${status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5' : status === 'active' ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'done' ? 'bg-emerald-500/20 text-emerald-400' : status === 'active' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <AnimatePresence>
                      <motion.div
                        key={status}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Activity className="w-4 h-4" />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{stage.title}</div>
                    <div className="text-xs text-muted-foreground">{stage.detail}</div>
                  </div>
                  {status === 'done' && <span className="text-xs text-emerald-400">OK</span>}
                  {status === 'active' && <span className="text-xs text-primary">...</span>}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-secondary border border-border space-y-2">
            <div className="flex items-center justify-between text-sm text-foreground">
              <span>Comparator decision</span>
              <CircuitBoard className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold text-primary">
              {humanResult}
            </div>
            <div className="text-xs text-muted-foreground">
              {result?.method ? `Method: ${result.method}` : 'Waiting for Verilator response'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Verilator output stream
          </div>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
        <pre className="min-h-[72px] text-sm font-mono bg-secondary rounded-lg p-3 overflow-x-auto border border-border">{verilatorOutput ?? 'Trigger a run to see obj_dir/Vcomparator output and decoded flags here.'}</pre>
      </div>
    </motion.div>
  );
};

export default ComparatorPlayground;
