import type {
  AqiCategory,
  PollutantLevels,
  RegionalAdvisory,
} from '@/types/air-quality';

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

export function getAqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function isGrapCity(city?: string): boolean {
  const normalized = (city || '').trim().toLowerCase();
  return (
    normalized === 'new delhi' ||
    normalized === 'delhi' ||
    normalized.includes('ncr')
  );
}

export function getRegionalAdvisories(
  aqi: number,
  city?: string
): RegionalAdvisory[] {
  const grapRegion = isGrapCity(city);

  if (grapRegion) {
    if (aqi <= 200) {
      return [
        {
          isGrapRegion: true,
          stage: 'CAQM Baseline',
          title: 'Standard NCR Air Quality Watch',
          summary:
            'Air is in the moderate range. Keep regular commute precautions handy during morning and evening traffic.',
          actions: [
            'Use public transit or carpool during rush hours where possible.',
            'Air out rooms briefly in the afternoon (12:00 PM – 4:00 PM).',
            'Report or avoid open waste burning in your neighborhood.',
          ],
        },
      ];
    }

    if (aqi <= 300) {
      return [
        {
          isGrapRegion: true,
          stage: 'CAQM GRAP Stage I',
          title: 'Poor Air Quality — Dust & Anti-Idling Curbs',
          summary:
            'GRAP Stage I dust control and anti-idling rules are active in New Delhi / NCR.',
          actions: [
            'Switch off vehicle engines at red lights and traffic bottlenecks.',
            'Wear a snug mask on two-wheelers or open autos during rush hour.',
            'Use damp mopping instead of dry sweeping at home.',
          ],
        },
      ];
    }

    if (aqi <= 400) {
      return [
        {
          isGrapRegion: true,
          stage: 'CAQM GRAP Stage II',
          title: 'Very Poor Air Quality — Inversion & DG Curbs',
          summary:
            'Cold air is trapping smoke close to the ground; GRAP Stage II restrictions on diesel generators and coal/firewood are active.',
          actions: [
            'Wear a fitted N95 / KN95 mask for all road commutes.',
            'Keep windows shut during 6:00 AM – 9:30 AM and after 7:00 PM.',
            'Shift morning walks or school assemblies to midday or indoors.',
          ],
        },
      ];
    }

    return [
      {
        isGrapRegion: true,
        stage: 'CAQM GRAP Stage IV',
        title: 'Severe+ Emergency Protocol Active',
        summary:
          'Emergency winter smog in New Delhi / NCR with GRAP Stage IV curbs on heavy diesel trucks, construction, and physical school classes.',
        actions: [
          'If you must step out, wear a properly sealed N95/N99 mask and wraparound glasses.',
          'Use metro or enclosed AC transport with recirculation on rather than two-wheelers.',
          'Run air purifiers or keep a single sealed clean-air room for kids and seniors.',
          'Check for official school/office hybrid work notices.',
        ],
      },
    ];
  }

  // Non-NCR cities: CPCB Citizen Guidance focused on practical personal precautions
  if (aqi <= 100) {
    return [
      {
        isGrapRegion: false,
        stage: 'CPCB Citizen Guidance · Satisfactory',
        title: 'Comfortable Urban Air',
        summary:
          'Air quality is generally comfortable for daily routines; sensitive folks should still watch heavy traffic junctions.',
        actions: [
          'Great day for normal outdoor errands and cross-ventilation.',
          'Keep AC on fresh-air or open windows in quiet residential pockets.',
        ],
      },
    ];
  }

  if (aqi <= 200) {
    return [
      {
        isGrapRegion: false,
        stage: 'CPCB Citizen Guidance · Moderate',
        title: 'Everyday Traffic & Dust Precautions',
        summary:
          'Typical urban haze. You can go about your routine—just cut down direct exhaust inhalation on busy roads.',
        actions: [
          'Keep car/cab windows up with AC on recirculation in bumper-to-bumper traffic.',
          'Rinse your nose/face with plain water after two-wheeler or auto rides.',
          'Open home windows during the sunny afternoon window (12:00 PM – 4:00 PM).',
        ],
      },
    ];
  }

  if (aqi <= 300) {
    return [
      {
        isGrapRegion: false,
        stage: 'CPCB Citizen Guidance · Poor',
        title: 'Elevated Smoke & Dust — Practical Harm Reduction',
        summary:
          'Fine smoke and road dust are elevated. Keep your commute and errands going with smart timing and simple barrier habits.',
        actions: [
          'Carry an N95 mask or snug multi-layer cloth/mask for open-road travel.',
          'Avoid morning jogging next to main roads; shift brisk walks to afternoon or indoors.',
          'Run kitchen exhaust while cooking and damp-mop floors instead of dry brooming.',
        ],
      },
    ];
  }

  return [
    {
      isGrapRegion: false,
      stage: 'CPCB Citizen Guidance · High Alert',
      title: 'Heavy Particulate Spike — Protect Airways',
      summary:
        'Air pollution is unusually heavy today. Pair unavoidable travel with strong personal protection and clean indoor air habits.',
      actions: [
        'Use a well-fitted N95/KN95 mask whenever stepping out, especially on bikes or autos.',
        'Keep windows closed during early morning and late evening haze; ventilate briefly midday.',
        'Monitor seniors, kids, and anyone with asthma/sinus issues for throat or chest tightness.',
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
