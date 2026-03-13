// Mock data service for the VLSI Temperature Analysis Dashboard
// This simulates the backend API responses described in the specification

export interface DailyDataPoint {
  date: string;
  year1_temp: number;
  year2_temp: number;
  deviation: number;
  doy: number;
}

export interface MonthlyDataPoint {
  month: string;
  year1_avg: number;
  year2_avg: number;
  deviation: number;
}

export interface ComparisonResult {
  result: string;
  year1_avg: number;
  year2_avg: number;
  available_years: number[];
  daily_data?: DailyDataPoint[];
  monthly_data?: MonthlyDataPoint[];
}

export interface PredictionData {
  overall: {
    avg2024: number;
    pred2025: number;
    change: number;
    changePercent: number;
  };
  hottestMonth: { month: string; temp: number };
  coldestMonth: { month: string; temp: number };
  monthly_comparison: Array<{
    month: string;
    temp2024: number;
    temp2025: number;
    change: number;
    change_percent: number;
  }>;
}

export interface ExogenousData {
  yearlyData: Array<{
    year: number;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    pressure: number;
  }>;
  monthlyData: Array<{
    month: string;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    pressure: number;
  }>;
  overallStats: {
    temperature: { mean: number; min: number; max: number; std: number };
    humidity: { mean: number; min: number; max: number };
    precipitation: { totalYearly: number; mean: number; max: number };
    windSpeed: { mean: number; max: number };
    pressure: { mean: number; min: number; max: number };
  };
  correlations: {
    temperature_humidity: number;
    temperature_precipitation: number;
    temperature_windSpeed: number;
    temperature_pressure: number;
  };
  dataRange: {
    startYear: number;
    endYear: number;
    totalRecords: number;
  };
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate realistic temperature data with seasonal variation
const generateDailyData = (year1: number, year2: number, month?: number): DailyDataPoint[] => {
  const data: DailyDataPoint[] = [];
  const daysInMonth = month ? new Date(year1, month, 0).getDate() : 365;
  const startDay = month ? new Date(year1, month - 1, 1).getTime() : new Date(year1, 0, 1).getTime();
  
  for (let i = 0; i < (month ? daysInMonth : 30); i++) {
    const date = new Date(startDay + i * 24 * 60 * 60 * 1000);
    const doy = Math.floor((date.getTime() - new Date(year1, 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    
    // Sinusoidal temperature with some randomness
    const baseTemp = 20 + 10 * Math.sin((doy / 365) * 2 * Math.PI - Math.PI / 2);
    const year1_temp = baseTemp + (Math.random() - 0.5) * 4;
    const year2_temp = year1_temp + 0.5 + (Math.random() - 0.5) * 2; // Slightly warmer trend
    
    data.push({
      date: date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      year1_temp: Number(year1_temp.toFixed(2)),
      year2_temp: Number(year2_temp.toFixed(2)),
      deviation: Number((year2_temp - year1_temp).toFixed(2)),
      doy
    });
  }
  
  return data;
};

const generateMonthlyData = (year1: number, year2: number): MonthlyDataPoint[] => {
  return months.map((month, index) => {
    const baseTemp = 20 + 10 * Math.sin((index / 12) * 2 * Math.PI - Math.PI / 2);
    const year1_avg = baseTemp + (Math.random() - 0.5) * 2;
    const year2_avg = year1_avg + (Math.random() - 0.3) * 1.5;
    
    return {
      month,
      year1_avg: Number(year1_avg.toFixed(2)),
      year2_avg: Number(year2_avg.toFixed(2)),
      deviation: Number((year2_avg - year1_avg).toFixed(2))
    };
  });
};

export const getHistoricalData = (
  year1: string,
  year2: string,
  month: string,
  viewMode: 'daily' | 'monthly' | 'yearly'
): ComparisonResult => {
  const y1 = parseInt(year1);
  const y2 = parseInt(year2);
  const m = month !== 'all' ? parseInt(month) : undefined;
  
  const daily_data = generateDailyData(y1, y2, m);
  const monthly_data = generateMonthlyData(y1, y2);
  
  const year1_avg = daily_data.reduce((sum, d) => sum + d.year1_temp, 0) / daily_data.length;
  const year2_avg = daily_data.reduce((sum, d) => sum + d.year2_temp, 0) / daily_data.length;
  
  const result = year2_avg > year1_avg 
    ? 'Year 2 hotter' 
    : year2_avg < year1_avg 
      ? 'Year 1 hotter' 
      : 'Equal temperature';
  
  return {
    result,
    year1_avg: Number(year1_avg.toFixed(4)),
    year2_avg: Number(year2_avg.toFixed(4)),
    available_years: Array.from({ length: 25 }, (_, i) => 2000 + i),
    daily_data: viewMode === 'daily' ? daily_data : undefined,
    monthly_data: viewMode === 'monthly' ? monthly_data : undefined
  };
};

export const getPredictionData = (): PredictionData => {
  const monthly_comparison = months.map((month, index) => {
    const baseTemp = 20 + 10 * Math.sin((index / 12) * 2 * Math.PI - Math.PI / 2);
    const temp2024 = baseTemp + (Math.random() - 0.5) * 2;
    const temp2025 = temp2024 + (Math.random() - 0.3) * 1.2;
    
    return {
      month,
      temp2024: Number(temp2024.toFixed(6)),
      temp2025: Number(temp2025.toFixed(6)),
      change: Number((temp2025 - temp2024).toFixed(6)),
      change_percent: Number(((temp2025 - temp2024) / temp2024 * 100).toFixed(4))
    };
  });
  
  const avg2024 = monthly_comparison.reduce((sum, m) => sum + m.temp2024, 0) / 12;
  const pred2025 = monthly_comparison.reduce((sum, m) => sum + m.temp2025, 0) / 12;
  
  const hottestMonth = monthly_comparison.reduce((max, m) => 
    m.temp2025 > max.temp ? { month: m.month, temp: m.temp2025 } : max, 
    { month: '', temp: -Infinity }
  );
  
  const coldestMonth = monthly_comparison.reduce((min, m) => 
    m.temp2025 < min.temp ? { month: m.month, temp: m.temp2025 } : min, 
    { month: '', temp: Infinity }
  );
  
  return {
    overall: {
      avg2024: Number(avg2024.toFixed(6)),
      pred2025: Number(pred2025.toFixed(6)),
      change: Number((pred2025 - avg2024).toFixed(6)),
      changePercent: Number(((pred2025 - avg2024) / avg2024 * 100).toFixed(4))
    },
    hottestMonth,
    coldestMonth,
    monthly_comparison
  };
};

export const getExogenousData = (): ExogenousData => {
  const yearlyData = Array.from({ length: 25 }, (_, i) => {
    const year = 2000 + i;
    const trendFactor = i * 0.08; // Warming trend
    
    return {
      year,
      temperature: Number((20 + trendFactor + (Math.random() - 0.5) * 1.5).toFixed(2)),
      humidity: Number((65 + (Math.random() - 0.5) * 10).toFixed(2)),
      precipitation: Number((800 + (Math.random() - 0.5) * 200).toFixed(2)),
      windSpeed: Number((3.5 + (Math.random() - 0.5) * 1.5).toFixed(2)),
      pressure: Number((101.3 + (Math.random() - 0.5) * 1).toFixed(2))
    };
  });
  
  const monthlyData = months.map((month, index) => {
    const seasonFactor = Math.sin((index / 12) * 2 * Math.PI - Math.PI / 2);
    
    return {
      month,
      temperature: Number((20 + 8 * seasonFactor).toFixed(2)),
      humidity: Number((65 - 10 * seasonFactor).toFixed(2)),
      precipitation: Number((60 + 40 * Math.cos((index / 12) * 2 * Math.PI)).toFixed(2)),
      windSpeed: Number((3.5 + 1.5 * Math.abs(seasonFactor)).toFixed(2)),
      pressure: Number((101.3 + 0.5 * seasonFactor).toFixed(2))
    };
  });
  
  return {
    yearlyData,
    monthlyData,
    overallStats: {
      temperature: { mean: 21.2, min: 12.1, max: 28.9, std: 4.2 },
      humidity: { mean: 65.3, min: 45.2, max: 82.7 },
      precipitation: { totalYearly: 820, mean: 68.3, max: 142.3 },
      windSpeed: { mean: 3.5, max: 8.2 },
      pressure: { mean: 101.2, min: 99.8, max: 102.5 }
    },
    correlations: {
      temperature_humidity: -0.42,
      temperature_precipitation: -0.23,
      temperature_windSpeed: 0.12,
      temperature_pressure: 0.18
    },
    dataRange: {
      startYear: 2000,
      endYear: 2024,
      totalRecords: 9132
    }
  };
};

export const getForecastComparison = (year1: number, year2: number) => {
  const monthly_comparison = months.map((month, index) => {
    const baseTemp = 20 + 10 * Math.sin((index / 12) * 2 * Math.PI - Math.PI / 2);
    const yearDiff = year2 - year1;
    const temp1 = baseTemp + ((year1 - 2000) * 0.05) + (Math.random() - 0.5) * 2;
    const temp2 = temp1 + (yearDiff * 0.15) + (Math.random() - 0.3) * 1.5;
    
    return {
      month,
      [`temp${year1}`]: Number(temp1.toFixed(6)),
      [`temp${year2}`]: Number(temp2.toFixed(6)),
      change: Number((temp2 - temp1).toFixed(6)),
      change_percent: Number(((temp2 - temp1) / temp1 * 100).toFixed(4))
    };
  });
  
  return { monthly_comparison, year1, year2 };
};

export const checkHealth = (): { status: string; verilog: string } => {
  return { 
    status: 'healthy', 
    verilog: 'connected'
  };
};
