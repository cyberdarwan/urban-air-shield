import type { AqiCategory, PollutantLevels } from '@/types/air-quality';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
];

const NO2_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
];

const O3_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
];

const SO2_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1601, cHigh: 3000, iLow: 401, iHigh: 500 },
];

const CO_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
  { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
  { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
  { cLow: 34.1, cHigh: 100.0, iLow: 401, iHigh: 500 },
];

function computeSubIndex(value: number, breakpoints: Breakpoint[]): number {
  const clamped = Math.max(0, value);
  for (const bp of breakpoints) {
    if (clamped <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (clamped - bp.cLow) + bp.iLow
      );
    }
  }
  return 500;
}

export function convertToCpcbUnit(
  param: keyof PollutantLevels,
  rawValue: number,
  rawUnit?: string
): { value: number; cpcbUnit: string } {
  const unit = (rawUnit || '').toLowerCase().trim();

  if (param === 'co') {
    let mg = rawValue;
    if (unit === 'µg/m³' || unit === 'ug/m3' || unit === 'µg/m3') {
      mg = rawValue / 1000;
    } else if (unit === 'ppb') {
      mg = (rawValue * 1.145) / 1000;
    } else if (unit === 'ppm') {
      mg = rawValue * 1.145;
    }
    return { value: Math.round(mg * 100) / 100, cpcbUnit: 'mg/m³' };
  }

  let ugm3 = rawValue;
  if (param === 'no2') {
    if (unit === 'ppb') ugm3 = rawValue * 1.88;
    else if (unit === 'ppm') ugm3 = rawValue * 1880;
    else if (unit === 'mg/m³' || unit === 'mg/m3') ugm3 = rawValue * 1000;
  } else if (param === 'so2') {
    if (unit === 'ppb') ugm3 = rawValue * 2.62;
    else if (unit === 'ppm') ugm3 = rawValue * 2620;
    else if (unit === 'mg/m³' || unit === 'mg/m3') ugm3 = rawValue * 1000;
  } else if (param === 'o3') {
    if (unit === 'ppb') ugm3 = rawValue * 1.96;
    else if (unit === 'ppm') ugm3 = rawValue * 1960;
    else if (unit === 'mg/m³' || unit === 'mg/m3') ugm3 = rawValue * 1000;
  } else if (param === 'pm25' || param === 'pm10') {
    if (unit === 'mg/m³' || unit === 'mg/m3') ugm3 = rawValue * 1000;
  }

  return { value: Math.round(ugm3), cpcbUnit: 'µg/m³' };
}

export function computePollutantSubIndex(
  param: keyof PollutantLevels,
  value: number
): number {
  switch (param) {
    case 'pm25':
      return computeSubIndex(value, PM25_BREAKPOINTS);
    case 'pm10':
      return computeSubIndex(value, PM10_BREAKPOINTS);
    case 'no2':
      return computeSubIndex(value, NO2_BREAKPOINTS);
    case 'o3':
      return computeSubIndex(value, O3_BREAKPOINTS);
    case 'so2':
      return computeSubIndex(value, SO2_BREAKPOINTS);
    case 'co':
      return computeSubIndex(value, CO_BREAKPOINTS);
  }
}

export function calculateAqi(pollutants: PollutantLevels): number {
  const subIndices = [
    computeSubIndex(pollutants.pm25, PM25_BREAKPOINTS),
    computeSubIndex(pollutants.pm10, PM10_BREAKPOINTS),
    computeSubIndex(pollutants.no2, NO2_BREAKPOINTS),
    computeSubIndex(pollutants.o3, O3_BREAKPOINTS),
  ];
  if (pollutants.so2 !== undefined) {
    subIndices.push(computeSubIndex(pollutants.so2, SO2_BREAKPOINTS));
  }
  if (pollutants.co !== undefined) {
    subIndices.push(computeSubIndex(pollutants.co, CO_BREAKPOINTS));
  }
  return Math.max(...subIndices);
}

export type AqiSeverity = 'safe' | 'moderate' | 'caution' | 'severe';

/**
 * Safely sanitizes and clamps a raw numeric AQI value into the Indian CPCB 0–500 range.
 * Non-finite, `NaN`, and negative values are safely clamped to `0`.
 */
export function clampAqi(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.min(500, Math.max(0, Math.round(value)));
}

/**
 * Classifies a numeric AQI value into four user-facing severity tiers.
 */
export function classifyAqiSeverity(aqi: number): AqiSeverity {
  const safeAqi = clampAqi(aqi);
  if (safeAqi <= 100) return 'safe';
  if (safeAqi <= 200) return 'moderate';
  if (safeAqi <= 300) return 'caution';
  return 'severe';
}

/**
 * Evaluates whether a live AQI reading is within a Care Space's personalized safe ceiling.
 * Returns `false` for non-finite inputs to fail safely.
 */
export function isAirSafe(aqi: number, safeLimit: number): boolean {
  if (
    typeof aqi !== 'number' ||
    !Number.isFinite(aqi) ||
    typeof safeLimit !== 'number' ||
    !Number.isFinite(safeLimit)
  ) {
    return false;
  }
  const normalizedAqi = clampAqi(aqi);
  const normalizedLimit = Math.max(0, Math.round(safeLimit));
  return normalizedAqi <= normalizedLimit;
}

export function getAqiCategory(aqi: number): AqiCategory {
  const safeAqi = clampAqi(aqi);
  if (safeAqi <= 50) return 'Good';
  if (safeAqi <= 100) return 'Satisfactory';
  if (safeAqi <= 200) return 'Moderate';
  if (safeAqi <= 300) return 'Poor';
  if (safeAqi <= 400) return 'Very Poor';
  return 'Severe';
}

export { getRegionalAdvisories, isGrapCity } from '@/lib/regional-advisories';

export interface HourlyWindow {
  hourLabel: string;
  estimatedAqi: number;
  status: 'Safe Window' | 'Moderate' | 'Peak Smog';
}

/**
 * Generates the 06:00–22:00 diurnal hourly air quality estimate curve from a baseline AQI.
 */
export function buildHourlyTimeline(currentAqi: number): HourlyWindow[] {
  const baselineAqi = clampAqi(currentAqi);
  // Diurnal winter smog curve: early morning & late evening thermal inversion peaks, midday mixing dip
  const factors = [
    { hourLabel: '06:00', factor: 1.18 },
    { hourLabel: '08:00', factor: 1.24 },
    { hourLabel: '10:00', factor: 1.05 },
    { hourLabel: '12:00', factor: 0.78 },
    { hourLabel: '14:00', factor: 0.70 },
    { hourLabel: '16:00', factor: 0.76 },
    { hourLabel: '18:00', factor: 1.08 },
    { hourLabel: '20:00', factor: 1.22 },
    { hourLabel: '22:00', factor: 1.28 },
  ];

  return factors.map(({ hourLabel, factor }) => {
    const estimatedAqi = Math.min(
      500,
      Math.max(20, Math.round(baselineAqi * factor))
    );
    let status: HourlyWindow['status'] = 'Moderate';
    if (estimatedAqi <= baselineAqi * 0.82 && estimatedAqi < 300) {
      status = 'Safe Window';
    } else if (estimatedAqi >= baselineAqi * 1.12 || estimatedAqi >= 300) {
      status = 'Peak Smog';
    }
    return { hourLabel, estimatedAqi, status };
  });
}

/**
 * Finds the safest (lowest estimated AQI) time slot along an hourly timeline.
 */
export function findSafestHourlyWindow(timeline: HourlyWindow[]): {
  index: number;
  window: HourlyWindow | null;
} {
  if (timeline.length === 0) {
    return { index: -1, window: null };
  }
  let minIdx = 0;
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].estimatedAqi < timeline[minIdx].estimatedAqi) {
      minIdx = i;
    }
  }
  return { index: minIdx, window: timeline[minIdx] };
}
