import type { RegionalAdvisory } from '@/types/air-quality';

/**
 * Determines whether a city falls under the Delhi / NCR CAQM GRAP jurisdiction.
 */
export function isGrapCity(city?: string): boolean {
  const normalized = (city || '').trim().toLowerCase();
  return (
    normalized === 'new delhi' ||
    normalized === 'delhi' ||
    normalized.includes('ncr')
  );
}

/**
 * Returns region-accurate official advisories: CAQM GRAP protocols for New Delhi / NCR
 * and practical CPCB Citizen Guidance for all other Indian cities.
 */
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
