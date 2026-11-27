import { NextRequest, NextResponse } from 'next/server';
import { isGrapCity } from '@/lib/aqi-utils';
import {
  generateWithGeminiWaterfall,
  getGeminiClient,
} from '@/lib/gemini';
import {
  buildFallbackRecommendations,
  collectAllCustomEntries,
  recommendationSchema,
} from '@/lib/recommendation-fallback';
import { checkRateLimit, safeJsonBody } from '@/lib/security';
import { validateGuidancePayload } from '@/lib/validators';
import type {
  AqiResponse,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

interface CachedRecommendation {
  recommendations: RecommendationPayload;
  generatedBy: string;
  attemptedModels: string[];
  fallbackReason: string | null;
  expiresAt: number;
}

const REC_CACHE_TTL_MS = 10 * 60 * 1000;
const REC_CACHE_MAX_ENTRIES = 100;
const recCache = new Map<string, CachedRecommendation>();
const inFlightRecs = new Map<string, Promise<CachedRecommendation>>();

function buildCacheKey(profile: UserProfile, aqiData: AqiResponse): string {
  const city = (profile.location?.city || '').trim().toLowerCase();
  const normalizedProfile = { ...profile, updatedAt: undefined };
  return `${city}|${aqiData.category}|${JSON.stringify(normalizedProfile)}`;
}

export async function POST(request: NextRequest) {
  let profile: UserProfile | null = null;
  let aqiData: AqiResponse | null = null;
  const noStoreHeaders = { 'Cache-Control': 'no-store' };

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

    const bodyResult = await safeJsonBody<unknown>(request, 64_000);
    if (!bodyResult.ok) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const validated = validateGuidancePayload(bodyResult.data);
    if (!validated.valid) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    profile = validated.data.profile;
    aqiData = validated.data.aqiData;

    const cacheKey = buildCacheKey(profile, aqiData);
    const now = Date.now();
    const cached = recCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(
        {
          recommendations: cached.recommendations,
          generatedBy: cached.generatedBy,
          debug: {
            generatedBy: cached.generatedBy,
            attemptedModels: cached.attemptedModels,
            fallbackReason: cached.fallbackReason,
            cached: true,
          },
        },
        { headers: noStoreHeaders }
      );
    }
    if (cached) {
      recCache.delete(cacheKey);
    }

    const ai = getGeminiClient();
    if (!ai) {
      return NextResponse.json(
        {
          recommendations: buildFallbackRecommendations(profile, aqiData),
          generatedBy: 'fallback',
          debug: {
            generatedBy: 'fallback',
            attemptedModels: [],
            fallbackReason: 'GEMINI_API_KEY missing on server',
            cached: false,
          },
        },
        { headers: noStoreHeaders }
      );
    }

    let pending = inFlightRecs.get(cacheKey);
    if (!pending) {
      const activeProfile = profile;
      const activeAqi = aqiData;
      const city = activeProfile.location?.city || 'the city';
      const grapRegion = isGrapCity(city);
      const custom = collectAllCustomEntries(activeProfile);

      const prompt = `You are a deeply knowledgeable, street-smart Indian environmental doctor talking warmly and clearly to a neighbor or family member.

CORE MENTAL MODEL — HARM REDUCTION, NOT AVOIDANCE:
- In Indian cities, 150–300 AQI is an everyday reality. People MUST still commute, go to work/college, drop kids at school, and run errands.
- NEVER give generic textbook advice like "stay indoors", "avoid stepping out", or "cancel outdoor plans" (unless AQI > 400 Severe emergency, and even then pair it with practical survival steps for unavoidable travel).
- Do all the atmospheric and medical reasoning internally (cold morning/evening air trapping smoke near the ground, traffic-corridor PM2.5 spikes, indoor cooking/brooming dust), and translate it into CLEAR, EVERYDAY HUMAN LANGUAGE with ZERO academic or medical jargon (never say "alveoli", "boundary-layer inversion", "particulate deposition", "cardiovascular morbidity", etc.).

CROSS-REFERENCE EVERY SELECTION IN THIS USER'S PROFILE:
- City: ${city} (Locality: ${activeProfile.location?.town || 'Not specified'})
- Support Mode: ${activeProfile.mode}
- When They Step Out: ${(activeProfile.stepOutWindows || []).join(', ') || 'Not specified'}
- How They Travel: ${(activeProfile.travelModes || []).join(', ') || 'Not specified'}
- Who Lives at Home: ${(activeProfile.householdMembers || []).join(', ') || 'Just Me'}
- Health Sensitivities: ${(activeProfile.healthSensitivities || []).join(', ') || 'None'}
- Home Surroundings: ${(activeProfile.homeSurroundings || []).join(', ') || 'Not specified'}
- Protection Already Owned: ${(activeProfile.existingProtection || []).join(', ') || 'None (Zero-Cost Tips Only)'}
${activeProfile.school ? `- School Details: ${JSON.stringify(activeProfile.school)}` : ''}
${activeProfile.industry ? `- Workplace Details: ${JSON.stringify(activeProfile.industry)}` : ''}

CUSTOM USER-TYPED ENTRIES (CRITICAL — MUST BE DIRECTLY ADDRESSED):
${custom.all.length > 0 ? `The user manually typed these specific realities: ${custom.all.map((c) => `"${c}"`).join(', ')}. You MUST explicitly address each one in plain, practical everyday terms inside TodaysPracticalMoves (and heroVerdict if relevant). Never ignore custom entries.` : 'None.'}

LIVE AIR QUALITY (${activeAqi.stationName}):
- AQI: ${activeAqi.aqi} (${activeAqi.category})
- PM2.5: ${activeAqi.pollutants.pm25} µg/m³, PM10: ${activeAqi.pollutants.pm10} µg/m³, NO2: ${activeAqi.pollutants.no2} µg/m³, O3: ${activeAqi.pollutants.o3} µg/m³, CO: ${activeAqi.pollutants.co ?? 1.1} mg/m³

REGIONAL ADVISORY RULE:
- isGrapRegion MUST be ${grapRegion ? 'true' : 'false'}.
- ${grapRegion ? 'Because the city is New Delhi / NCR, set advisoryTitle to "CAQM GRAP Protocol" and summarize the relevant GRAP stage and citizen actions.' : `Because the city is ${city} (not New Delhi/NCR), DO NOT mention GRAP or CAQM. Set advisoryTitle to "CPCB Citizen Guidance" and focus purely on practical personal precautions.`}
- STRICT RULE: Never mention or invent any Indian state names anywhere in your response.

OUTPUT STRUCTURE:
1. heroVerdict: One crisp, reassuring, plain-English sentence summarizing what today's air means for THIS user's specific routine.
2. officialWarnings: Regional advisory (${grapRegion ? 'CAQM GRAP Protocol' : 'CPCB Citizen Guidance'}) tailored to AQI ${activeAqi.aqi}.
3. clockWindows: Plain-English clock windows ("bestWindowToStepOut" like "12:00 PM – 4:00 PM" and "peakSmokeHours" like "6:00 AM – 9:30 AM & 7:00 PM – 11:00 PM") with simple, neighborly reasons.
4. todaysPracticalMoves: Immediate, realistic actions for TODAY's routine:
   - onTheMove: Exactly how to handle their selected travel modes, step-out times, and any custom schedule/commute entries.
   - atHome: Exact clock windows to open vs. close windows based on their home surroundings, gear, and any custom home entries.
   - forYourHousehold: Warm, specific care for their exact household members, health sensitivities, and any custom health/family entries.
   - quickChecklist: 4 short, punchy action items for today.
5. futureLifestyleUpgrades: A separate, low-pressure section for gradual, optional longer-term habits (3 upgrades) clearly framed as future-achievable rather than today's demands.`;

      pending = (async () => {
        const result = await generateWithGeminiWaterfall(
          ai,
          {
            contents: prompt,
            responseMimeType: 'application/json',
            responseSchema: recommendationSchema,
            temperature: 0.35,
          },
          8000
        );

        if (result.text) {
          try {
            const parsed = JSON.parse(result.text) as RecommendationPayload;
            const entry: CachedRecommendation = {
              recommendations: parsed,
              generatedBy: result.generatedBy,
              attemptedModels: result.attemptedModels,
              fallbackReason: result.fallbackReason,
              expiresAt: Date.now() + REC_CACHE_TTL_MS,
            };
            if (recCache.size >= REC_CACHE_MAX_ENTRIES) {
              const oldestKey = recCache.keys().next().value;
              if (oldestKey) recCache.delete(oldestKey);
            }
            recCache.set(cacheKey, entry);
            return entry;
          } catch (parseErr) {
            const parseMsg =
              parseErr instanceof Error ? parseErr.message : 'JSON parse error';
            return {
              recommendations: buildFallbackRecommendations(
                activeProfile,
                activeAqi
              ),
              generatedBy: 'fallback',
              attemptedModels: result.attemptedModels,
              fallbackReason: `${result.generatedBy} JSON parse failed: ${parseMsg}`,
              expiresAt: Date.now() + 60_000,
            };
          }
        }

        return {
          recommendations: buildFallbackRecommendations(
            activeProfile,
            activeAqi
          ),
          generatedBy: 'fallback',
          attemptedModels: result.attemptedModels,
          fallbackReason: result.fallbackReason || 'All Gemini models failed',
          expiresAt: Date.now() + 60_000,
        };
      })().finally(() => {
        inFlightRecs.delete(cacheKey);
      });

      inFlightRecs.set(cacheKey, pending);
    }

    const resolved = await pending;
    return NextResponse.json(
      {
        recommendations: resolved.recommendations,
        generatedBy: resolved.generatedBy,
        debug: {
          generatedBy: resolved.generatedBy,
          attemptedModels: resolved.attemptedModels,
          fallbackReason: resolved.fallbackReason,
          cached: false,
        },
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : 'Unknown recommendation error';
    console.error('Recommendation error:', reason);
    if (profile && aqiData) {
      return NextResponse.json(
        {
          recommendations: buildFallbackRecommendations(profile, aqiData),
          generatedBy: 'fallback',
          debug: {
            generatedBy: 'fallback',
            attemptedModels: [],
            fallbackReason: reason,
            cached: false,
          },
        },
        { headers: noStoreHeaders }
      );
    }
    return NextResponse.json(
      { error: 'Unable to process request' },
      { status: 500 }
    );
  }
}
