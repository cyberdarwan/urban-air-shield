import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { GEMINI_MODEL, getGeminiClient, withTimeout } from '@/lib/gemini';
import type {
  AqiResponse,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    officialWarnings: {
      type: Type.OBJECT,
      properties: {
        grapStage: { type: Type.STRING },
        headline: { type: Type.STRING },
        restrictions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['grapStage', 'headline', 'restrictions'],
    },
    healthHazardImpact: {
      type: Type.OBJECT,
      properties: {
        riskLevel: { type: Type.STRING },
        summary: { type: Type.STRING },
        groupImpacts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              group: { type: Type.STRING },
              risk: { type: Type.STRING },
              guidance: { type: Type.STRING },
            },
            required: ['group', 'risk', 'guidance'],
          },
        },
      },
      required: ['riskLevel', 'summary', 'groupImpacts'],
    },
    commuteAndTransportPlan: {
      type: Type.OBJECT,
      properties: {
        dayPlan: { type: Type.STRING },
        weekPlan: { type: Type.STRING },
        safeTimeWindows: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        maskGuidance: { type: Type.STRING },
        emissionSavings: { type: Type.STRING },
      },
      required: [
        'dayPlan',
        'weekPlan',
        'safeTimeWindows',
        'maskGuidance',
        'emissionSavings',
      ],
    },
    subtleHouseholdChanges: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING },
        adjustments: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              exposureDropPercent: { type: Type.NUMBER },
              co2SavedKgPerWeek: { type: Type.NUMBER },
            },
            required: [
              'title',
              'description',
              'exposureDropPercent',
              'co2SavedKgPerWeek',
            ],
          },
        },
      },
      required: ['summary', 'adjustments'],
    },
  },
  required: [
    'officialWarnings',
    'healthHazardImpact',
    'commuteAndTransportPlan',
    'subtleHouseholdChanges',
  ],
};

function buildFallbackRecommendations(
  profile: UserProfile,
  aqiData: AqiResponse
): RecommendationPayload {
  const isSevere = aqiData.aqi > 300;
  const stage = aqiData.advisories[0]?.stage || 'GRAP Advisory';
  const loc = aqiData.locationLabel || 'your urban area';

  const groupImpacts =
    profile.mode === 'personal'
      ? [
          {
            group: `Adults (${profile.personal?.adults ?? 1})`,
            risk: isSevere ? 'High' : 'Moderate',
            guidance: isSevere
              ? 'Avoid outdoor cardio; use fitted N95 masks for any essential transit.'
              : 'Shift outdoor errands to the 12:00-16:00 mixing window.',
          },
          ...(profile.personal && profile.personal.children > 0
            ? [
                {
                  group: `Children (${profile.personal.children})`,
                  risk: isSevere ? 'Very High' : 'Elevated',
                  guidance:
                    'Keep play indoors; smaller airways absorb higher PM2.5 per kg body weight.',
                },
              ]
            : []),
          ...(profile.personal && profile.personal.seniors > 0
            ? [
                {
                  group: `Seniors (${profile.personal.seniors})`,
                  risk: isSevere ? 'Critical' : 'Elevated',
                  guidance:
                    'Monitor resting breathlessness and keep prescribed inhalers or cardiac meds accessible.',
                },
              ]
            : []),
        ]
      : profile.mode === 'school'
        ? [
            {
              group: profile.school?.studentGroup || 'Students',
              risk: isSevere ? 'Very High' : 'Elevated',
              guidance:
                profile.school?.indoorSportsHall === 'Yes'
                  ? 'Relocate all morning PT and assemblies to the indoor sports hall.'
                  : 'Replace outdoor sports with low-exertion classroom activities.',
            },
          ]
        : [
            {
              group: profile.industry?.facilityType || 'Workforce',
              risk: isSevere ? 'High' : 'Moderate',
              guidance:
                'Rotate outdoor loading/site staff every 45 minutes with N95 PPE and indoor break zones.',
            },
          ];

  const adjustments =
    profile.budget === 'HEPA Purifiers'
      ? [
          {
            title: 'Run True HEPA H13 Air Purifiers in Primary Rooms',
            description: `Keep doors sealed during morning and night inversion peaks in ${loc} and run HEPA units on medium-high.`,
            exposureDropPercent: 68,
            co2SavedKgPerWeek: 2.1,
          },
          {
            title: 'Wet-Mop Floors & Seal Window Gaps',
            description:
              'Replace dry sweeping with damp microfiber mopping and draft-seal window frames to stop PM2.5 infiltration.',
            exposureDropPercent: 22,
            co2SavedKgPerWeek: 1.4,
          },
        ]
      : profile.budget === 'Mid-Range'
        ? [
            {
              title: 'DIY Corsi-Rosenthal MERV-13 Box Fan Filter',
              description:
                'Assemble a high-flow MERV-13 box fan scrubber for bedrooms to capture fine PM2.5 at a fraction of commercial cost.',
              exposureDropPercent: 52,
              co2SavedKgPerWeek: 3.2,
            },
            {
              title: 'Exhaust Hood + Damp-Cloth Dusting Protocol',
              description:
                'Always run kitchen exhaust during cooking and wet-wipe surfaces twice daily.',
              exposureDropPercent: 24,
              co2SavedKgPerWeek: 1.8,
            },
          ]
        : [
            {
              title: 'Timed Midday Cross-Ventilation (12:30 - 15:30)',
              description:
                'Keep windows tightly shut during 06:00-10:00 and 18:00-23:00 inversion peaks; ventilate briefly during midday dispersion.',
              exposureDropPercent: 34,
              co2SavedKgPerWeek: 2.8,
            },
            {
              title: 'Zero-Smoke Cooking & Wet Sweeping',
              description:
                'Avoid incense, candles, and dry brooming; use lids on pans and damp mops to prevent indoor particulate spikes.',
              exposureDropPercent: 26,
              co2SavedKgPerWeek: 2.4,
            },
          ];

  return {
    officialWarnings: {
      grapStage: stage,
      headline: `${aqiData.category} Air Quality (${aqiData.aqi} AQI) active in ${loc}`,
      restrictions: aqiData.advisories[0]?.actions || [
        'Minimize outdoor exertion during morning and evening inversion hours.',
      ],
    },
    healthHazardImpact: {
      riskLevel: isSevere ? 'Severe Respiratory & Cardiovascular Risk' : 'Elevated Exposure Risk',
      summary: `PM2.5 at ${aqiData.pollutants.pm25} µg/m³ in ${loc} penetrates deep into alveoli and bloodstream, requiring targeted protection for your profile.`,
      groupImpacts,
    },
    commuteAndTransportPlan: {
      dayPlan: isSevere
        ? 'Avoid two-wheeler or open walking commutes today; use enclosed metro/bus or shift to remote work.'
        : 'Consolidate errands into a single midday trip and keep vehicle AC on recirculation mode.',
      weekPlan:
        'Plan outdoor tasks between 12:00 and 16:00 when solar heating lifts the thermal inversion layer; bundle carpools 3x/week.',
      safeTimeWindows: ['12:00 PM - 4:00 PM (Peak Mixing)', 'Avoid 6:00 AM - 9:30 AM & 7:00 PM - 11:00 PM'],
      maskGuidance: isSevere
        ? 'Mandatory N95 / FFP2 respirator with snug nose-bridge seal outdoors.'
        : 'N95 mask recommended for roadside commutes and sensitive individuals.',
      emissionSavings: 'Shifting 2 solo trips/week to metro or carpool cuts ~6.4 kg CO₂ and reduces local NO2.',
    },
    subtleHouseholdChanges: {
      summary: `Tailored for your "${profile.budget}" setup in ${loc}.`,
      adjustments,
    },
  };
}

export async function POST(request: NextRequest) {
  let profile: UserProfile | undefined;
  let aqiData: AqiResponse | undefined;
  try {
    const body = await request.json();
    profile = body.profile as UserProfile;
    aqiData = body.aqiData as AqiResponse;

    if (!profile || !aqiData) {
      return NextResponse.json(
        { error: 'Missing profile or aqiData' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json({
        recommendations: buildFallbackRecommendations(profile, aqiData),
        generatedBy: 'fallback',
      });
    }

    const prompt = `You are an Urban Air Quality & Environmental Health Engine.
Analyze the user's exact location, profile, and live telemetry to produce actionable, quantified winter smog guidance.
STRICT RULE: Never mention any Indian state names unless repeating the user's own input verbatim, and never invent unrelated region names.

USER LOCATION:
- State/Region: ${profile.location?.state || 'Not specified'}
- City: ${profile.location?.city || 'Not specified'}
- Town/Locality: ${profile.location?.town || 'Not specified'}

USER PROFILE:
${JSON.stringify(profile, null, 2)}

LIVE TELEMETRY (${aqiData.stationName}):
- AQI: ${aqiData.aqi} (${aqiData.category})
- PM2.5: ${aqiData.pollutants.pm25} µg/m³
- PM10: ${aqiData.pollutants.pm10} µg/m³
- NO2: ${aqiData.pollutants.no2} µg/m³
- O3: ${aqiData.pollutants.o3} µg/m³
- Active Advisories: ${JSON.stringify(aqiData.advisories)}

Generate structured JSON matching the schema:
1. officialWarnings: Active CPCB/health body warnings & GRAP restrictions relevant to their mode (${profile.mode}) and AQI (${aqiData.aqi}).
2. healthHazardImpact: Personalized risk breakdown for their exact household/student/worker mix and sensitivities.
3. commuteAndTransportPlan: Day & week transport recommendations, safe travel time windows (accounting for winter thermal inversions), mask guidance, and quantified emission savings.
4. subtleHouseholdChanges: Practical indoor adjustments strictly tailored to their budget tier ("${profile.budget}"), with realistic quantified exposureDropPercent (number) and co2SavedKgPerWeek (number).`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: recommendationSchema,
          temperature: 0.3,
        },
      }),
      8000,
      'Gemini recommendations'
    );

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(text) as RecommendationPayload;
    return NextResponse.json({
      recommendations: parsed,
      generatedBy: GEMINI_MODEL,
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    if (profile && aqiData) {
      return NextResponse.json({
        recommendations: buildFallbackRecommendations(profile, aqiData),
        generatedBy: 'fallback',
      });
    }
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
