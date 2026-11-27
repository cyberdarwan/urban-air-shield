import {
  calculateAqi,
  computePollutantSubIndex,
  getAqiCategory,
  getRegionalAdvisories,
} from '@/lib/aqi-utils';
import type {
  AqiDebugInfo,
  AqiResponse,
  MappedPollutantDebug,
  PollutantLevels,
} from '@/types/air-quality';

export function formatLocationLabel(
  state: string,
  city: string,
  town: string
): string {
  const parts = [town, city, state].map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Central Urban Sector';
}

export function normalizePollutantKey(
  id?: string
): keyof PollutantLevels | null {
  if (!id) return null;
  const upper = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper === 'PM25' || upper === 'PM2.5') return 'pm25';
  if (upper === 'PM10') return 'pm10';
  if (upper === 'NO2') return 'no2';
  if (upper === 'O3' || upper === 'OZONE') return 'o3';
  if (upper === 'CO') return 'co';
  if (upper === 'SO2') return 'so2';
  return null;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function buildSevereSimulation(
  state: string,
  city: string,
  town: string
): AqiResponse {
  const aqi = 432;
  const primaryLocality = town || city || 'Central Urban';
  const stationName = `${primaryLocality} Monitoring Station`;

  return {
    stationName,
    locationLabel: formatLocationLabel(state, city, town),
    aqi,
    category: getAqiCategory(aqi),
    pollutants: {
      pm25: 285,
      pm10: 418,
      no2: 94,
      o3: 58,
      co: 2.6,
      so2: 42,
    },
    source: 'Severe Smog Simulator',
    timestamp: new Date().toISOString(),
    advisories: getRegionalAdvisories(aqi, city),
    simulated: true,
    debug: {
      source: 'Fallback',
      upstreamStatus: null,
      stationId: null,
      stationName,
      mappedPollutants: {},
      fallbackReason: 'Severe Smog Simulator mode enabled by user',
    },
  };
}

export function buildUrbanFallback(
  state: string,
  city: string,
  town: string,
  upstreamStatus: number | null,
  fallbackReason: string
): Omit<AqiResponse, 'advisories' | 'simulated'> {
  const seedText = `${state}-${city}-${town}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 1000;
  }

  const pm25 = 88 + (hash % 45);
  const pm10 = 162 + (hash % 70);
  const no2 = 44 + (hash % 24);
  const o3 = 34 + (hash % 18);
  const co = Math.round((0.9 + (hash % 9) * 0.1) * 10) / 10;
  const so2 = 12 + (hash % 14);

  const pollutants: PollutantLevels = { pm25, pm10, no2, o3, co, so2 };
  const aqi = calculateAqi(pollutants);
  const primaryLocality = town || city || 'Central Urban';
  const stationName = `${primaryLocality} Baseline Station`;

  const mappedPollutants: Record<string, MappedPollutantDebug> = {
    pm25: {
      rawValue: pm25,
      rawUnit: 'µg/m³',
      convertedValue: pm25,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('pm25', pm25),
    },
    pm10: {
      rawValue: pm10,
      rawUnit: 'µg/m³',
      convertedValue: pm10,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('pm10', pm10),
    },
    no2: {
      rawValue: no2,
      rawUnit: 'µg/m³',
      convertedValue: no2,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('no2', no2),
    },
    o3: {
      rawValue: o3,
      rawUnit: 'µg/m³',
      convertedValue: o3,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('o3', o3),
    },
    co: {
      rawValue: co,
      rawUnit: 'mg/m³',
      convertedValue: co,
      cpcbUnit: 'mg/m³',
      subIndex: computePollutantSubIndex('co', co),
    },
    so2: {
      rawValue: so2,
      rawUnit: 'µg/m³',
      convertedValue: so2,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('so2', so2),
    },
  };

  const debug: AqiDebugInfo = {
    source: 'Fallback',
    upstreamStatus,
    stationId: null,
    stationName,
    mappedPollutants,
    fallbackReason,
  };

  return {
    stationName,
    locationLabel: formatLocationLabel(state, city, town),
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    source: 'Regional Baseline Estimate',
    timestamp: new Date().toISOString(),
    debug,
  };
}
