import type { AqiCategory, GrapAdvisory, PollutantLevels } from '@/types/air-quality';

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

export function calculateAqi(pollutants: PollutantLevels): number {
  const subIndices = [
    computeSubIndex(pollutants.pm25, PM25_BREAKPOINTS),
    computeSubIndex(pollutants.pm10, PM10_BREAKPOINTS),
    computeSubIndex(pollutants.no2, NO2_BREAKPOINTS),
    computeSubIndex(pollutants.o3, O3_BREAKPOINTS),
  ];
  return Math.max(...subIndices);
}

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getGrapAdvisories(aqi: number): GrapAdvisory[] {
  if (aqi <= 200) {
    return [
      {
        stage: 'Baseline Advisory',
        title: 'Standard Urban Air Quality Monitoring',
        summary:
          'Air quality is within baseline to moderate limits. Sensitive individuals should monitor symptoms during peak traffic hours.',
        actions: [
          'Prefer public transit or carpooling during rush hours.',
          'Keep indoor spaces cross-ventilated during midday.',
          'Avoid open waste or biomass burning.',
        ],
      },
    ];
  }

  if (aqi <= 300) {
    return [
      {
        stage: 'GRAP Stage I',
        title: 'Poor Air Quality Alert',
        summary:
          'PM2.5 and PM10 levels are elevated. Dust control and anti-idling measures are active.',
        actions: [
          'Enforce strict dust suppression and water sprinkling on unpaved roads.',
          'Avoid prolonged outdoor exertion during early morning and late evening.',
          'Switch off vehicle engines at traffic signals.',
        ],
      },
    ];
  }

  if (aqi <= 400) {
    return [
      {
        stage: 'GRAP Stage II',
        title: 'Very Poor Air Quality & Inversion Alert',
        summary:
          'Shallow winter boundary layer is trapping fine particulates. Minimize diesel generator use and outdoor exposure.',
        actions: [
          'Restrict non-essential diesel generator operation; prioritize grid/clean backup.',
          'Use N95/FFP2 masks for all outdoor commutes.',
          'Shift school outdoor assemblies and sports to indoor halls.',
        ],
      },
    ];
  }

  return [
    {
      stage: 'GRAP Stage IV',
      title: 'Severe+ Emergency Smog Protocol',
      summary:
        'Hazardous winter smog episode with high PM2.5 concentration. Emergency public health and emission curbs are in effect.',
      actions: [
        'Suspend all non-essential outdoor physical activities and open-air school events.',
        'Transition offices and institutions to hybrid/work-from-home where feasible.',
        'Halt non-essential construction, demolition, and heavy diesel freight entry.',
        'Wear properly fitted N95/N99 respirators outdoors and run indoor HEPA filtration.',
      ],
    },
  ];
}

export interface HourlyWindow {
  hourLabel: string;
  estimatedAqi: number;
  status: 'Safe Window' | 'Moderate' | 'Peak Smog';
}

export function buildHourlyTimeline(currentAqi: number): HourlyWindow[] {
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
    const estimatedAqi = Math.min(500, Math.max(20, Math.round(currentAqi * factor)));
    let status: HourlyWindow['status'] = 'Moderate';
    if (estimatedAqi <= currentAqi * 0.82 && estimatedAqi < 300) {
      status = 'Safe Window';
    } else if (estimatedAqi >= currentAqi * 1.12 || estimatedAqi >= 300) {
      status = 'Peak Smog';
    }
    return { hourLabel, estimatedAqi, status };
  });
}
