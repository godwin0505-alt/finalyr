// API service for Temperature Analysis (shared with HDL backend)
// Prefers VITE_API_BASE_URL, falls back to hostname:5000

// Prefer explicit env; fall back to local IPv4 to avoid hostname/IPv6 issues
const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_BASE_URL as string
) || 'http://127.0.0.1:5000';

export interface HistoricalDataRequest {
  year1: string;
  year2: string;
  month: string;
  viewMode: string;
}

export interface ComparisonResult {
  result: string;
  year1_avg?: number;
  year2_avg?: number;
  available_years?: number[];
  daily_data?: Array<{
    date: string;
    year1_temp: number;
    year2_temp: number;
    deviation: number;
    doy: number;
  }>;
  monthly_data?: Array<{
    month: string;
    year1_avg: number;
    year2_avg: number;
    deviation: number;
  }>;
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

export interface CompareResponse {
  result: string;
  method?: string;
  log?: {
    timestamp?: string;
    input_a_celsius?: number;
    input_b_celsius?: number;
    fixed_point_a?: number;
    fixed_point_b?: number;
    result?: string;
    execution_time_ms?: number;
    verilator_binary?: string;
    verilator_output?: string;
    method?: string;
  };
}

export const api = {
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error('Health check failed');
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },

  async compareTemperatures(a: number, b: number, raw8 = false): Promise<CompareResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a, b, raw8 })
      });
      if (!response.ok) throw new Error('Comparison failed');
      return await response.json();
    } catch (error) {
      console.error('Comparison error:', error);
      throw error;
    }
  },

  async getHistoricalData(params: HistoricalDataRequest): Promise<ComparisonResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/temperature/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Historical data fetch error:', error);
      throw error;
    }
  },

  async getPredictionData(): Promise<PredictionData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/temperature/prediction`);
      if (!response.ok) throw new Error('Prediction data fetch failed');
      return await response.json();
    } catch (error) {
      console.error('Prediction data error:', error);
      throw error;
    }
  },

  async generatePrediction() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/temperature/generate-prediction`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Prediction generation failed');
      return await response.json();
    } catch (error) {
      console.error('Prediction generation error:', error);
      throw error;
    }
  },

  async getForecastComparison(year1: number, year2: number): Promise<PredictionData & { year1: number; year2: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/temperature/forecast-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year1, year2 })
      });
      if (!response.ok) throw new Error('Forecast comparison failed');
      return await response.json();
    } catch (error) {
      console.error('Forecast comparison error:', error);
      throw error;
    }
  },

  async getExogenousData(): Promise<ExogenousData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/climate/exogenous`);
      if (!response.ok) throw new Error('Exogenous data fetch failed');
      return await response.json();
    } catch (error) {
      console.error('Exogenous data error:', error);
      throw error;
    }
  },

  async getClimateData(view: 'daily' | 'monthly' | 'yearly', year: number, month?: number): Promise<any> {
    try {
      const params = new URLSearchParams({ year: year.toString(), view });
      if (view === 'daily' && typeof month === 'number') {
        params.append('month', month.toString());
      }

      const response = await fetch(`${API_BASE_URL}/api/climate/exogenous?${params}`);
      if (!response.ok) throw new Error('Climate data fetch failed');
      const exo: ExogenousData & { dailyData?: any[] } = await response.json();

      if (view === 'daily') {
        const data = (exo.dailyData || []).map(d => ({
          date: d.date,
          temperature: d.temperature,
          humidity: d.humidity,
          precipitation: d.precipitation,
          windSpeed: d.windSpeed,
          pressure: d.pressure,
        }));
        return { data };
      }

      if (view === 'monthly') {
        const data = (exo.monthlyData || []).map(m => ({
          temperature: m.temperature,
          humidity: m.humidity,
          precipitation: m.precipitation,
          windSpeed: m.windSpeed,
          pressure: m.pressure,
        }));
        return { data };
      }

      const data = (exo.yearlyData || []).map(y => ({
        temperature: y.temperature,
        humidity: y.humidity,
        precipitation: y.precipitation,
        windSpeed: y.windSpeed,
        pressure: y.pressure,
      }));
      return { data };
    } catch (error) {
      console.error('Climate data error:', error);
      throw error;
    }
  }
};
