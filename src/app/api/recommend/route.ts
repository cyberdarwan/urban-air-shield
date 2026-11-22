import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { isGrapCity } from '@/lib/aqi-utils';
import {
  GEMINI_MODEL,
  getGeminiClient,
  withTimeout,
} from '@/lib/gemini';
import {
  checkRateLimit,
  safeJsonBody,
  sanitizeAqiData,
  sanitizeProfile,
} from '@/lib/security';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type AqiResponse,
  type RecommendationPayload,
  type UserProfile,
} from '@/types/air-quality';

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    heroVerdict: { type: Type.STRING },
    officialWarnings: {
      type: Type.OBJECT,
      properties: {
        isGrapRegion: { type: Type.BOOLEAN },
        advisoryTitle: { type: Type.STRING },
        stageOrLevel: { type: Type.STRING },
        headline: { type: Type.STRING },
        bullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'isGrapRegion',
        'advisoryTitle',
        'stageOrLevel',
        'headline',
        'bullets',
      ],
    },
    clockWindows: {
      type: Type.OBJECT,
      properties: {
        bestWindowToStepOut: { type: Type.STRING },
        bestWindowReason: { type: Type.STRING },
        peakSmokeHours: { type: Type.STRING },
        peakSmokeReason: { type: Type.STRING },
      },
      required: [
        'bestWindowToStepOut',
        'bestWindowReason',
        'peakSmokeHours',
        'peakSmokeReason',
      ],
    },
    todaysPracticalMoves: {
      type: Type.OBJECT,
      properties: {
        onTheMove: { type: Type.STRING },
        atHome: { type: Type.STRING },
        forYourHousehold: { type: Type.STRING },
        quickChecklist: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        'onTheMove',
        'atHome',
        'forYourHousehold',
        'quickChecklist',
      ],
    },
    futureLifestyleUpgrades: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        upgrades: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              whyItHelps: { type: Type.STRING },
            },
            required: ['title', 'description', 'whyItHelps'],
          },
        },
      },
      required: ['summary', 'upgrades'],
    },
  },
  required: [
    'heroVerdict',
    'officialWarnings',
    'clockWindows',
    'todaysPracticalMoves',
    'futureLifestyleUpgrades',
  ],
};

function findCustomEntries(values: string[], presets: readonly string[]): string[] {
  const presetSet = new Set(presets);
  return values.filter((v) => !presetSet.has(v));
}

function collectAllCustomEntries(profile: UserProfile): {
  stepOut: string[];
  travel: string[];
  household: string[];
  health: string[];
  surroundings: string[];
  protection: string[];
  all: string[];
} {
  const stepOut = findCustomEntries(profile.stepOutWindows || [], STEP_OUT_WINDOWS);
  const travel = findCustomEntries(profile.travelModes || [], TRAVEL_MODES);
  const household = findCustomEntries(profile.householdMembers || [], HOUSEHOLD_MEMBERS);
  const health = findCustomEntries(profile.healthSensitivities || [], HEALTH_SENSITIVITIES);
  const surroundings = findCustomEntries(profile.homeSurroundings || [], HOME_SURROUNDINGS);
  const protection = findCustomEntries(profile.existingProtection || [], EXISTING_PROTECTIONS);

  return {
    stepOut,
    travel,
    household,
    health,
    surroundings,
    protection,
    all: [...stepOut, ...travel, ...household, ...health, ...surroundings, ...protection],
  };
}

function buildFallbackRecommendations(
  profile: UserProfile,
  aqiData: AqiResponse
): RecommendationPayload {
  const city = profile.location?.city || 'your city';
  const loc = profile.location?.town ? `${profile.location.town}, ${city}` : city;
  const grapRegion = isGrapCity(city);
  const isEmergency = aqiData.aqi > 400;

  const travel = profile.travelModes || [];
  const windows = profile.stepOutWindows || [];
  const household = profile.householdMembers || [];
  const health = profile.healthSensitivities || [];
  const surroundings = profile.homeSurroundings || [];
  const gear = profile.existingProtection || [];
  const custom = collectAllCustomEntries(profile);

  const hasBikeOrAuto =
    travel.includes('Two-Wheeler / Bike') || travel.includes('Auto / Open Cab');
  const hasCar = travel.includes('AC Car / Cab');
  const hasN95 = gear.includes('N95 / KN95 Masks');
  const hasPurifier = gear.includes('Air Purifier');
  const hasChimney = gear.includes('Kitchen Chimney / Exhaust');
  const zeroCostOnly = gear.includes('None (Zero-Cost Tips Only)');
  const nearTrafficOrConstruction =
    surroundings.includes('Main Road / Heavy Traffic') ||
    surroundings.includes('Construction Nearby');

  const onTheMoveParts: string[] = [];
  if (hasBikeOrAuto) {
    onTheMoveParts.push(
      hasN95
        ? 'Put on your N95 mask snugly over the nose bridge before starting your two-wheeler or auto ride, and keep your helmet visor down to block road grit.'
        : 'Since you ride a two-wheeler or open auto without N95 masks on hand, tie a clean, double-layered cotton scarf or hanky tightly over your nose and mouth (dampen it slightly if smoke feels sharp), keep your visor down, and avoid idling right behind diesel buses or trucks.'
    );
  }
  if (hasCar) {
    onTheMoveParts.push(
      'In your car or cab, keep windows rolled up and switch the AC button to Recirculate so roadside exhaust does not get pulled into the cabin.'
    );
  }
  if (travel.includes('Metro / Local Train') || travel.includes('Bus / Walk')) {
    onTheMoveParts.push(
      'For metro, bus, or walking stretches, take shaded inner lanes instead of main-road footpaths, and rinse your nose and eyes with plain tap water once you arrive.'
    );
  }
  if (custom.travel.length > 0 || custom.stepOut.length > 0) {
    const noted = [...custom.stepOut, ...custom.travel].join(', ');
    onTheMoveParts.push(
      `For your specific schedule/travel (${noted}), keep a clean mask or double-layered cotton scarf ready for peak traffic stretches and wash your face right after arriving.`
    );
  }
  if (onTheMoveParts.length === 0) {
    onTheMoveParts.push(
      'When stepping out for errands, bunch them into one afternoon trip between 12:00 PM and 4:00 PM when sunlight helps clear ground-level smoke.'
    );
  }
  if (isEmergency) {
    onTheMoveParts.push(
      'Because AQI is above 400 today, skip non-essential evening travel; if you must commute, wear a tight-fitting N95 mask and keep the trip short.'
    );
  }

  const atHomeParts: string[] = [];
  if (nearTrafficOrConstruction || custom.surroundings.length > 0) {
    const extraSurroundings =
      custom.surroundings.length > 0
        ? ` (${custom.surroundings.join(', ')})`
        : '';
    atHomeParts.push(
      `With your surroundings${extraSurroundings}, keep street-facing windows shut during 6:00 AM – 9:30 AM and 7:00 PM – 11:00 PM; crack open only quieter back windows between 12:30 PM and 3:30 PM.`
    );
  } else {
    atHomeParts.push(
      'Keep windows closed during early morning (6:00 AM – 9:30 AM) and late evening (7:00 PM – 11:00 PM) when cool air traps smoke low, and open opposite windows for 30–45 minutes around 1:00 PM – 3:30 PM.'
    );
  }
  if (hasPurifier) {
    atHomeParts.push(
      'Run your air purifier in the room where your family spends the evening and sleeps, keeping that door closed.'
    );
  } else if (zeroCostOnly) {
    atHomeParts.push(
      'Skip dry broom sweeping today—use a damp mop so settled dust stays down, and place a rolled damp cloth along drafty door gaps.'
    );
  }
  if (custom.protection.length > 0) {
    atHomeParts.push(
      `Keep using your own setup (${custom.protection.join(', ')}) consistently during peak smoke hours.`
    );
  }
  if (hasChimney) {
    atHomeParts.push(
      'Switch on your kitchen chimney 5 minutes before tadka or frying and leave it on for 10 minutes after.'
    );
  } else {
    atHomeParts.push(
      'While cooking or frying, cover pans with lids, crack the kitchen window slightly, and avoid incense sticks or dhoop indoors today.'
    );
  }

  const householdParts: string[] = [];
  if (
    household.includes('Kids Under 10') ||
    household.includes('School / Teenagers')
  ) {
    householdParts.push(
      'Kids breathe faster than adults, so skip early-morning park runs before 9:30 AM and shift outdoor play to after school around 3:00 PM – 4:30 PM.'
    );
  }
  if (
    household.includes('Seniors (60+)') ||
    household.includes('Pregnant Member')
  ) {
    householdParts.push(
      'Keep seniors and pregnant family members away from kitchen smoke and morning balcony chill; warm water sips and gentle steam before bed ease throat dryness.'
    );
  }
  if (
    health.includes('Asthma / Wheezing') ||
    health.includes('Dust / Sinus Allergy') ||
    health.includes('Frequent Throat / Eye Irritation')
  ) {
    householdParts.push(
      'Carry your reliever inhaler or saline nasal spray before stepping out, and do a quick plain-water saline rinse of your nostrils and eyes after evening travel.'
    );
  }
  if (health.includes('Heart / BP Condition')) {
    householdParts.push(
      'Avoid brisk morning walks in cold smog—wait for midday sunshine or walk indoors, and stay hydrated.'
    );
  }
  if (custom.household.length > 0 || custom.health.length > 0) {
    const extraHealth = [...custom.household, ...custom.health].join(', ');
    householdParts.push(
      `Paying special attention to "${extraHealth}", keep prescribed remedies handy, avoid direct smoke exposure during peak hours, and rinse face/nose with clean water after stepping back indoors.`
    );
  }
  if (householdParts.length === 0) {
    householdParts.push(
      'Stay well-hydrated with warm water and do a quick face and nasal rinse after returning from evening traffic to clear trapped soot.'
    );
  }

  const checklist: string[] = [
    'Time errands between 12:00 PM – 4:00 PM whenever possible',
    hasBikeOrAuto
      ? 'Cover nose & mouth + keep helmet visor down on open-road rides'
      : 'Use AC Recirculate mode in cars/cabs during traffic jams',
    'Wet-mop floors instead of dry brooming; skip indoor agarbatti/candles today',
    'Wash face and rinse nose with clean water right after getting home',
  ];

  const primaryAdvisory = aqiData.advisories[0];
  const heroVerdict =
    aqiData.aqi <= 100
      ? `Air in ${loc} is comfortable today (${aqiData.aqi} AQI)—carry on normally and enjoy midday cross-ventilation.`
      : aqiData.aqi <= 200
        ? `Everyday haze in ${loc} (${aqiData.aqi} AQI)—step out as planned, just guard against direct traffic smoke and save errands for midday.`
        : aqiData.aqi <= 300
          ? `Smoke and dust are elevated in ${loc} (${aqiData.aqi} AQI)—keep your routine moving with snug nose/mouth cover and midday ventilation.`
          : `Heavy smog in ${loc} (${aqiData.aqi} AQI)—protect airways tightly on unavoidable commutes and keep windows shut outside 12:00 PM – 4:00 PM.`;

  return {
    heroVerdict,
    officialWarnings: {
      isGrapRegion: grapRegion,
      advisoryTitle: grapRegion ? 'CAQM GRAP Protocol' : 'CPCB Citizen Guidance',
      stageOrLevel:
        primaryAdvisory?.stage ||
        (grapRegion ? 'CAQM GRAP Advisory' : 'CPCB Citizen Guidance'),
      headline:
        primaryAdvisory?.title ||
        `${aqiData.category} Air (${aqiData.aqi} AQI) in ${loc}`,
      bullets: primaryAdvisory?.actions || [
        'Use afternoon hours for outdoor chores and wear a snug mask in heavy traffic.',
      ],
    },
    clockWindows: {
      bestWindowToStepOut: '12:00 PM – 4:00 PM',
      bestWindowReason:
        'Afternoon sunlight warms the ground and lifts trapped smoke higher up, making air noticeably lighter for errands and walks.',
      peakSmokeHours: '6:00 AM – 9:30 AM & 7:00 PM – 11:00 PM',
      peakSmokeReason:
        'Cool morning and evening air acts like a lid over the city, holding vehicle exhaust and road dust right at breathing height.',
    },
    todaysPracticalMoves: {
      onTheMove: onTheMoveParts.join(' '),
      atHome: atHomeParts.join(' '),
      forYourHousehold: householdParts.join(' '),
      quickChecklist: checklist,
    },
    futureLifestyleUpgrades: {
      summary: `Optional, low-pressure habits you can build over the next few weeks in ${city}—no need to buy everything today.`,
      upgrades: [
        {
          title: hasN95
            ? 'Keep a spare N95 in your daily bag & helmet box'
            : 'Pick up a 5-pack of reusable N95 / KN95 masks',
          description:
            'Having a mask tucked into your everyday bag or two-wheeler storage means you are never caught unprotected in a sudden traffic jam or dust cloud.',
          whyItHelps:
            'A snug N95 blocks 95% of fine smoke particles that cloth scarves let through.',
        },
        {
          title: 'Set up one "Clean Sleep Corner"',
          description: hasPurifier
            ? 'Place your purifier near the bed with heavy curtains or draft stoppers on the bedroom door.'
            : 'Use simple rubber or foam draft-sealing tape on your bedroom window frame so night-time traffic smoke stays outside.',
          whyItHelps:
            'Giving your lungs 7–8 hours of cleaner air overnight helps your airways recover from daytime traffic.',
        },
        {
          title: 'Shift outdoor workouts to midday or indoor slots',
          description: `Whenever ${windows.includes('Early Morning (6–9 AM)') ? 'your early morning schedule allows' : 'you plan exercise'}, swap 7 AM roadside jogs for a 1 PM brisk walk or indoor stretching.`,
          whyItHelps:
            'You breathe 3–4× deeper during exercise, so timing it when afternoon sun clears the air cuts smoke intake sharply.',
        },
      ],
    },
  };
}

export async function POST(request: NextRequest) {
  let profile: UserProfile | null = null;
  let aqiData: AqiResponse | null = null;
  try {
    const rate = checkRateLimit(request, 'recommend', 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    const bodyResult = await safeJsonBody<{
      profile?: unknown;
      aqiData?: unknown;
    }>(request, 64_000);

    if (!bodyResult.ok) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    profile = sanitizeProfile(bodyResult.data.profile);
    aqiData = sanitizeAqiData(bodyResult.data.aqiData);

    if (!profile || !aqiData) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({
        recommendations: buildFallbackRecommendations(profile, aqiData),
        generatedBy: 'fallback',
      });
    }

    const city = profile.location?.city || 'the city';
    const grapRegion = isGrapCity(city);
    const custom = collectAllCustomEntries(profile);

    const prompt = `You are a deeply knowledgeable, street-smart Indian environmental doctor talking warmly and clearly to a neighbor or family member.

CORE MENTAL MODEL — HARM REDUCTION, NOT AVOIDANCE:
- In Indian cities, 150–300 AQI is an everyday reality. People MUST still commute, go to work/college, drop kids at school, and run errands.
- NEVER give generic textbook advice like "stay indoors", "avoid stepping out", or "cancel outdoor plans" (unless AQI > 400 Severe emergency, and even then pair it with practical survival steps for unavoidable travel).
- Do all the atmospheric and medical reasoning internally (cold morning/evening air trapping smoke near the ground, traffic-corridor PM2.5 spikes, indoor cooking/brooming dust), and translate it into CLEAR, EVERYDAY HUMAN LANGUAGE with ZERO academic or medical jargon (never say "alveoli", "boundary-layer inversion", "particulate deposition", "cardiovascular morbidity", etc.).

CROSS-REFERENCE EVERY SELECTION IN THIS USER'S PROFILE:
- City: ${city} (Locality: ${profile.location?.town || 'Not specified'})
- Support Mode: ${profile.mode}
- When They Step Out: ${(profile.stepOutWindows || []).join(', ') || 'Not specified'}
- How They Travel: ${(profile.travelModes || []).join(', ') || 'Not specified'}
- Who Lives at Home: ${(profile.householdMembers || []).join(', ') || 'Just Me'}
- Health Sensitivities: ${(profile.healthSensitivities || []).join(', ') || 'None'}
- Home Surroundings: ${(profile.homeSurroundings || []).join(', ') || 'Not specified'}
- Protection Already Owned: ${(profile.existingProtection || []).join(', ') || 'None (Zero-Cost Tips Only)'}
${profile.school ? `- School Details: ${JSON.stringify(profile.school)}` : ''}
${profile.industry ? `- Workplace Details: ${JSON.stringify(profile.industry)}` : ''}

CUSTOM USER-TYPED ENTRIES (CRITICAL — MUST BE DIRECTLY ADDRESSED):
${custom.all.length > 0 ? `The user manually typed these specific realities: ${custom.all.map((c) => `"${c}"`).join(', ')}. You MUST explicitly address each one in plain, practical everyday terms inside TodaysPracticalMoves (and heroVerdict if relevant). Never ignore custom entries.` : 'None.'}

LIVE AIR QUALITY (${aqiData.stationName}):
- AQI: ${aqiData.aqi} (${aqiData.category})
- PM2.5: ${aqiData.pollutants.pm25} µg/m³, PM10: ${aqiData.pollutants.pm10} µg/m³, NO2: ${aqiData.pollutants.no2} µg/m³, O3: ${aqiData.pollutants.o3} µg/m³, CO: ${aqiData.pollutants.co ?? 1.1} mg/m³

REGIONAL ADVISORY RULE:
- isGrapRegion MUST be ${grapRegion ? 'true' : 'false'}.
- ${grapRegion ? 'Because the city is New Delhi / NCR, set advisoryTitle to "CAQM GRAP Protocol" and summarize the relevant GRAP stage and citizen actions.' : `Because the city is ${city} (not New Delhi/NCR), DO NOT mention GRAP or CAQM. Set advisoryTitle to "CPCB Citizen Guidance" and focus purely on practical personal precautions.`}
- STRICT RULE: Never mention or invent any Indian state names anywhere in your response.

OUTPUT STRUCTURE:
1. heroVerdict: One crisp, reassuring, plain-English sentence summarizing what today's air means for THIS user's specific routine.
2. officialWarnings: Regional advisory (${grapRegion ? 'CAQM GRAP Protocol' : 'CPCB Citizen Guidance'}) tailored to AQI ${aqiData.aqi}.
3. clockWindows: Plain-English clock windows ("bestWindowToStepOut" like "12:00 PM – 4:00 PM" and "peakSmokeHours" like "6:00 AM – 9:30 AM & 7:00 PM – 11:00 PM") with simple, neighborly reasons.
4. todaysPracticalMoves: Immediate, realistic actions for TODAY's routine:
   - onTheMove: Exactly how to handle their selected travel modes, step-out times, and any custom schedule/commute entries.
   - atHome: Exact clock windows to open vs. close windows based on their home surroundings, gear, and any custom home entries.
   - forYourHousehold: Warm, specific care for their exact household members, health sensitivities, and any custom health/family entries.
   - quickChecklist: 4 short, punchy action items for today.
5. futureLifestyleUpgrades: A separate, low-pressure section for gradual, optional longer-term habits (3 upgrades) clearly framed as future-achievable rather than today's demands.`;

    const noStoreHeaders = { 'Cache-Control': 'no-store' };
    let text: string | undefined;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: recommendationSchema,
              temperature: 0.35,
            },
          }),
          8000,
          'Gemini recommendations'
        );
        text = response.text;
        if (text) break;
      } catch (attemptErr) {
        if (attempt === 2) throw attemptErr;
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text) as RecommendationPayload;
    return NextResponse.json(
      {
        recommendations: parsed,
        generatedBy: GEMINI_MODEL,
        debug: {
          generatedBy: GEMINI_MODEL,
          fallbackReason: null,
        },
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown Gemini failure';
    console.error('Recommendation error:', reason);
    if (profile && aqiData) {
      return NextResponse.json(
        {
          recommendations: buildFallbackRecommendations(profile, aqiData),
          generatedBy: 'fallback',
          debug: {
            generatedBy: 'fallback',
            fallbackReason: reason,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      { error: 'Unable to process request' },
      { status: 500 }
    );
  }
}
