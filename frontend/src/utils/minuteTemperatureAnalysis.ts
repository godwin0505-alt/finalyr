export interface MinuteTemperatureChange {
  year1: number;
  year2: number;
  absoluteChange: number;
  percentageChange: number;
  isMinute: boolean;
  significanceLevel: 'negligible' | 'minute' | 'small' | 'moderate' | 'large';
  description: string;
  fullPrecisionFormatted: {
    year1Temp: string;
    year2Temp: string;
    absoluteChange: string;
    percentageChange: string;
  };
}

export const formatNumberPrecise = (value: number, decimals: number = 12): string => {
  return value.toFixed(decimals);
};

export const analyzeMinuteTemperatureChange = (
  temp1: number,
  temp2: number,
  year1Label: string,
  year2Label: string
): MinuteTemperatureChange => {
  const absoluteChange = Math.abs(temp2 - temp1);
  const percentageChange = (absoluteChange / temp1) * 100;
  
  let significanceLevel: MinuteTemperatureChange['significanceLevel'];
  let description: string;
  
  if (absoluteChange < 0.001) {
    significanceLevel = 'negligible';
    description = `Temperature change between ${year1Label} and ${year2Label} is negligible (< 0.001°C)`;
  } else if (absoluteChange < 0.1) {
    significanceLevel = 'minute';
    description = `Minute temperature change detected: ${formatNumberPrecise(absoluteChange, 6)}°C`;
  } else if (absoluteChange < 0.5) {
    significanceLevel = 'small';
    description = `Small temperature change: ${absoluteChange.toFixed(3)}°C`;
  } else if (absoluteChange < 1.0) {
    significanceLevel = 'moderate';
    description = `Moderate temperature change: ${absoluteChange.toFixed(2)}°C`;
  } else {
    significanceLevel = 'large';
    description = `Large temperature change: ${absoluteChange.toFixed(2)}°C`;
  }
  
  return {
    year1: temp1,
    year2: temp2,
    absoluteChange,
    percentageChange,
    isMinute: absoluteChange < 0.1,
    significanceLevel,
    description,
    fullPrecisionFormatted: {
      year1Temp: formatNumberPrecise(temp1),
      year2Temp: formatNumberPrecise(temp2),
      absoluteChange: formatNumberPrecise(absoluteChange),
      percentageChange: formatNumberPrecise(percentageChange)
    }
  };
};

export const compareMultipleYears = (
  temperatures: Array<{ year: number; temp: number }>
): MinuteTemperatureChange[] => {
  const changes: MinuteTemperatureChange[] = [];
  
  for (let i = 0; i < temperatures.length - 1; i++) {
    const current = temperatures[i];
    const next = temperatures[i + 1];
    changes.push(
      analyzeMinuteTemperatureChange(
        current.temp,
        next.temp,
        current.year.toString(),
        next.year.toString()
      )
    );
  }
  
  return changes;
};

export const detectSignificantMinuteChanges = (
  temperatures: Array<{ year: number; temp: number }>
): MinuteTemperatureChange[] => {
  return compareMultipleYears(temperatures)
    .filter(change => change.significanceLevel !== 'negligible');
};

export interface ThresholdCrossing {
  temp1: number;
  temp2: number;
  crossedThresholds: Array<{ threshold: number; direction: 'up' | 'down' }>;
  hasCrossing: boolean;
}

export const detectThresholdCrossings = (
  temp1: number,
  temp2: number,
  thresholds: number[]
): ThresholdCrossing => {
  const crossedThresholds: Array<{ threshold: number; direction: 'up' | 'down' }> = [];
  
  for (const threshold of thresholds) {
    if (temp1 < threshold && temp2 >= threshold) {
      crossedThresholds.push({ threshold, direction: 'up' });
    } else if (temp1 >= threshold && temp2 < threshold) {
      crossedThresholds.push({ threshold, direction: 'down' });
    }
  }
  
  return {
    temp1,
    temp2,
    crossedThresholds,
    hasCrossing: crossedThresholds.length > 0
  };
};
