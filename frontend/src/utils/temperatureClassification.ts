export interface TemperatureImpact {
  status: 'safe' | 'warning' | 'harmful';
  statusLabel: string;
  statusEmoji: string;
  color: string;
  borderColor: string;
  backgroundColor: string;
  temperature: number;
  safeThreshold: number;
  warningThreshold: number;
  deviation: number;
  deviationDescription: string;
  impactDescription: string;
}

const SAFE_THRESHOLD = 24;
const WARNING_THRESHOLD = 26;

export const classifyTemperature = (temperature: number): TemperatureImpact => {
  const deviation = temperature - SAFE_THRESHOLD;
  
  if (temperature <= SAFE_THRESHOLD) {
    return {
      status: 'safe',
      statusLabel: 'Normal Climate',
      statusEmoji: '✅',
      color: 'text-emerald-400',
      borderColor: 'border-emerald-400/30',
      backgroundColor: 'bg-emerald-400/10',
      temperature,
      safeThreshold: SAFE_THRESHOLD,
      warningThreshold: WARNING_THRESHOLD,
      deviation,
      deviationDescription: deviation < 0 
        ? `${Math.abs(deviation).toFixed(2)}°C below safe threshold`
        : 'At safe threshold',
      impactDescription: 'Temperature is within the safe range. No significant climate stress detected.'
    };
  }
  
  if (temperature <= WARNING_THRESHOLD) {
    return {
      status: 'warning',
      statusLabel: 'Elevated Warming',
      statusEmoji: '⚠️',
      color: 'text-amber-400',
      borderColor: 'border-amber-400/30',
      backgroundColor: 'bg-amber-400/10',
      temperature,
      safeThreshold: SAFE_THRESHOLD,
      warningThreshold: WARNING_THRESHOLD,
      deviation,
      deviationDescription: `${deviation.toFixed(2)}°C above safe threshold`,
      impactDescription: 'Temperature is elevated. Monitor for potential heat stress impacts.'
    };
  }
  
  return {
    status: 'harmful',
    statusLabel: 'Severe Climate Stress',
    statusEmoji: '🔴',
    color: 'text-red-400',
    borderColor: 'border-red-400/30',
    backgroundColor: 'bg-red-400/10',
    temperature,
    safeThreshold: SAFE_THRESHOLD,
    warningThreshold: WARNING_THRESHOLD,
    deviation,
    deviationDescription: `${deviation.toFixed(2)}°C above safe threshold`,
    impactDescription: 'Temperature exceeds critical threshold. Significant climate stress present.'
  };
};

export const calculateDeviationPercentage = (temperature: number): number => {
  return ((temperature - SAFE_THRESHOLD) / SAFE_THRESHOLD) * 100;
};

export const getStatusBadgeClasses = (status: 'safe' | 'warning' | 'harmful'): string => {
  const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border';
  
  switch (status) {
    case 'safe':
      return `${baseClasses} status-safe`;
    case 'warning':
      return `${baseClasses} status-warning`;
    case 'harmful':
      return `${baseClasses} status-harmful`;
    default:
      return baseClasses;
  }
};
