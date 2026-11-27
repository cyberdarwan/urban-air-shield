import { describe, expect, it } from 'vitest';
import {
  formatFamilyRollupWhatsAppBrief,
  formatWhatsAppBrief,
} from '@/lib/whatsapp-formatter';
import type {
  AqiResponse,
  CareSpaceProfile,
  RecommendationPayload,
} from '@/types/air-quality';

const baseProfile: CareSpaceProfile = {
  id: 'space-1',
  label: 'My Home',
  city: 'Hyderabad',
  safeAqiLimit: 100,
  profile: {
    mode: 'personal',
    location: { city: 'Hyderabad', town: 'Jubilee Hills' },
    stepOutWindows: ['Early Morning (6–9 AM)'],
    travelModes: ['AC Car / Cab'],
    householdMembers: ['Kids Under 10'],
    healthSensitivities: ['None'],
    homeSurroundings: ['Quiet Residential / Gated'],
    existingProtection: ['Air Purifier'],
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const baseAqi: AqiResponse = {
  stationName: 'Zoo Park Station',
  locationLabel: 'Hyderabad',
  aqi: 74,
  category: 'Satisfactory',
  pollutants: { pm25: 38, pm10: 65, no2: 22, o3: 34 },
  source: 'OpenAQ Live',
  timestamp: '2026-01-01T08:00:00.000Z',
  advisories: [],
  simulated: false,
};

const sampleRecs: RecommendationPayload = {
  heroVerdict: 'Air is comfortable today.',
  officialWarnings: {
    isGrapRegion: false,
    advisoryTitle: 'CPCB Citizen Guidance',
    stageOrLevel: 'Satisfactory',
    headline: 'Comfortable Urban Air',
    bullets: ['Enjoy normal routines.'],
  },
  clockWindows: {
    bestWindowToStepOut: '1:00 PM – 4:00 PM',
    bestWindowReason: 'Afternoon sun disperses haze.',
    peakSmokeHours: '6:00 AM – 9:00 AM',
    peakSmokeReason: 'Morning traffic peak.',
  },
  todaysPracticalMoves: {
    onTheMove: 'Keep car AC on recirculate in traffic.',
    atHome: 'Open windows midday.',
    forYourHousehold: 'Good day for afternoon park play.',
    quickChecklist: [
      'Air out rooms around 1 PM',
      'Rinse face after evening ride',
      'Third item should not appear in top 2',
    ],
  },
  futureLifestyleUpgrades: {
    summary: 'Optional habits',
    upgrades: [],
  },
};

describe('whatsapp-formatter', () => {
  it('formats a Safe brief including locality, custom window, and top 2 checklist items', () => {
    const brief = formatWhatsAppBrief(baseProfile, baseAqi, sampleRecs);

    expect(brief).toContain('*SmogSense Air Brief — My Home*');
    expect(brief).toContain('City: Hyderabad (Jubilee Hills)');
    expect(brief).toContain('Live AQI: *74* (Satisfactory)');
    expect(brief).toContain('Okay to Move Out (74 <= 100 limit)');
    expect(brief).toContain('Best Outdoor Window: 1:00 PM – 4:00 PM');
    expect(brief).toContain('• Air out rooms around 1 PM');
    expect(brief).toContain('• Rinse face after evening ride');
    expect(brief).not.toContain('Third item should not appear');
  });

  it('formats a Caution brief when live AQI exceeds the Care Space limit', () => {
    const cautionAqi: AqiResponse = {
      ...baseAqi,
      aqi: 245,
      category: 'Poor',
    };
    const brief = formatWhatsAppBrief(baseProfile, cautionAqi);

    expect(brief).toContain('Live AQI: *245* (Poor)');
    expect(brief).toContain('Caution: Delay Outdoor Activity (245 > 100 limit)');
    expect(brief).toContain('Best Outdoor Window: 12:00 PM - 4:00 PM');
  });

  it('preserves special characters in labels and city names', () => {
    const specialSpace: CareSpaceProfile = {
      ...baseProfile,
      label: "Parents' Place — Block A/B",
      city: 'New Delhi / NCR',
      profile: {
        ...baseProfile.profile,
        location: { city: 'New Delhi / NCR', town: 'Hauz Khas & Green Park' },
      },
    };
    const brief = formatWhatsAppBrief(specialSpace, baseAqi);

    expect(brief).toContain("*SmogSense Air Brief — Parents' Place — Block A/B*");
    expect(brief).toContain('City: New Delhi / NCR (Hauz Khas & Green Park)');
  });

  it('fills in graceful defaults when optional fields are missing', () => {
    const minimalBrief = formatWhatsAppBrief({}, { aqi: 185 });

    expect(minimalBrief).toContain('*SmogSense Air Brief — My Care Space*');
    expect(minimalBrief).toContain('City: Unknown City');
    expect(minimalBrief).toContain('Live AQI: *185* (Moderate)');
    expect(minimalBrief).toContain('Caution: Delay Outdoor Activity (185 > 150 limit)');
    expect(minimalBrief).not.toContain('Today’s Top Moves:');
  });

  it('formats a multi-city family rollup brief with live and pending spaces', () => {
    const parentsSpace: CareSpaceProfile = {
      ...baseProfile,
      id: 'space-2',
      label: "Parents' Place",
      city: 'Lucknow',
      safeAqiLimit: 100,
    };
    const rollup = formatFamilyRollupWhatsAppBrief(
      [baseProfile, parentsSpace],
      { hyderabad: baseAqi }
    );

    expect(rollup).toContain('*SmogSense Family Air Check-In*');
    expect(rollup).toContain('• *My Home* (Hyderabad): 74 AQI (Satisfactory) — Okay to Move Out (<=100)');
    expect(rollup).toContain("• *Parents' Place* (Lucknow): Safe limit <= 100 AQI");
  });
});
