import { NextRequest, NextResponse } from 'next/server';
import { isGrapCity } from '@/lib/aqi-utils';
import { GEMINI_MODEL, getGeminiClient, withTimeout } from '@/lib/gemini';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type AqiResponse,
  type ChatMessage,
  type UserProfile,
} from '@/types/air-quality';

function collectCustomEntries(profile: UserProfile): string[] {
  const check = (vals: string[] | undefined, presets: readonly string[]) => {
    const set = new Set(presets);
    return (vals || []).filter((v) => !set.has(v));
  };
  return [
    ...check(profile.stepOutWindows, STEP_OUT_WINDOWS),
    ...check(profile.travelModes, TRAVEL_MODES),
    ...check(profile.householdMembers, HOUSEHOLD_MEMBERS),
    ...check(profile.healthSensitivities, HEALTH_SENSITIVITIES),
    ...check(profile.homeSurroundings, HOME_SURROUNDINGS),
    ...check(profile.existingProtection, EXISTING_PROTECTIONS),
  ];
}

function buildChatFallback(profile: UserProfile, aqiData: AqiResponse): string {
  const city = profile.location?.city || 'your city';
  const loc = profile.location?.town ? `${profile.location.town}, ${city}` : city;
  const travel = (profile.travelModes || []).join(', ') || 'daily commute';
  const gear = (profile.existingProtection || []).join(', ') || 'everyday zero-cost habits';
  const custom = collectCustomEntries(profile);
  const customNote =
    custom.length > 0
      ? ` Keeping your specific situation (${custom.join(', ')}) in mind, keep a clean mask or double-layered cotton scarf handy during peak hours.`
      : '';

  return `Right now in ${loc}, AQI is ${aqiData.aqi} (${aqiData.category}) with PM2.5 at ${aqiData.pollutants.pm25} µg/m³. Since morning (6:00 AM – 9:30 AM) and evening (7:00 PM – 11:00 PM) cool air traps smoke close to the road, try to bunch errands between 12:00 PM – 4:00 PM when the sun clears the air. For your ${travel} routine using ${gear}, protect your nose and mouth in heavy traffic, keep car/cab AC on recirculation, and rinse your face and nose with plain water as soon as you get indoors.${customNote}`;
}

export async function POST(request: NextRequest) {
  let profile: UserProfile | undefined;
  let aqiData: AqiResponse | undefined;
  try {
    const body = await request.json();
    const messages = (body.messages || []) as ChatMessage[];
    profile = body.profile as UserProfile;
    aqiData = body.aqiData as AqiResponse;

    if (!messages.length || !profile || !aqiData) {
      return NextResponse.json(
        { error: 'Missing messages, profile, or aqiData' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();
    const latestUserMessage = messages[messages.length - 1]?.content || '';

    if (!ai) {
      return NextResponse.json({
        reply: buildChatFallback(profile, aqiData),
        generatedBy: 'fallback',
      });
    }

    const city = profile.location?.city || 'the city';
    const grapRegion = isGrapCity(city);
    const customEntries = collectCustomEntries(profile);

    const systemInstruction = `You are a deeply knowledgeable, street-smart Indian environmental doctor talking warmly and clearly to a neighbor or family member.

CORE MENTAL MODEL — HARM REDUCTION, NOT AVOIDANCE:
- In Indian cities, 150–300 AQI is everyday reality. Users MUST still commute, work, drop kids at school, and run errands.
- NEVER give generic textbook advice like "stay indoors" or "cancel outdoor plans" (unless AQI > 400 Severe emergency, and even then give practical survival steps for unavoidable travel).
- Do the scientific reasoning internally (cold morning/evening air trapping smoke, traffic exhaust corridors, indoor cooking/dust) and speak in clear, warm, everyday human language with ZERO academic or medical jargon.
- Separate immediate practical moves for today from optional longer-term habits.
- Give plain-English clock windows (e.g., 12:00 PM – 4:00 PM best window; 6:00 AM – 9:30 AM & 7:00 PM – 11:00 PM peak smoke hours).
- ${grapRegion ? 'For New Delhi / NCR, you may reference CAQM GRAP rules where helpful.' : `For ${city}, do NOT mention GRAP or CAQM—focus on CPCB citizen guidance and practical personal precautions.`}
- STRICT RULE: Never mention or invent any Indian state names. Never ask the user to repeat their city, travel mode, household, or AQI—you already have them.

USER PROFILE:
- Mode: ${profile.mode}
- City / Locality: ${city}${profile.location?.town ? ` (${profile.location.town})` : ''}
- When They Step Out: ${(profile.stepOutWindows || []).join(', ') || 'Not specified'}
- How They Travel: ${(profile.travelModes || []).join(', ') || 'Not specified'}
- Household Members: ${(profile.householdMembers || []).join(', ') || 'Just Me'}
- Health Sensitivities: ${(profile.healthSensitivities || []).join(', ') || 'None'}
- Home Surroundings: ${(profile.homeSurroundings || []).join(', ') || 'Not specified'}
- Protection Already Owned: ${(profile.existingProtection || []).join(', ') || 'None (Zero-Cost Tips Only)'}
${customEntries.length > 0 ? `- CUSTOM USER-TYPED REALITIES (address these directly when relevant): ${customEntries.map((c) => `"${c}"`).join(', ')}` : ''}
${profile.school ? `- School Details: ${JSON.stringify(profile.school)}` : ''}
${profile.industry ? `- Workplace Details: ${JSON.stringify(profile.industry)}` : ''}

LIVE TELEMETRY (${aqiData.stationName} · ${aqiData.source}):
- AQI: ${aqiData.aqi} (${aqiData.category})
- PM2.5: ${aqiData.pollutants.pm25} µg/m³, PM10: ${aqiData.pollutants.pm10} µg/m³, NO2: ${aqiData.pollutants.no2} µg/m³, O3: ${aqiData.pollutants.o3} µg/m³, CO: ${aqiData.pollutants.co ?? 1.1} mg/m³`;

    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Doctor'}: ${m.content}`)
      .join('\n\n');

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${conversationHistory}\n\nRespond warmly, concisely, and practically to: "${latestUserMessage}"`,
        config: {
          systemInstruction,
          temperature: 0.4,
        },
      }),
      8000,
      'Gemini chat'
    );

    const reply =
      response.text ||
      'I could not pull up a response right now—please try asking again in a moment.';

    return NextResponse.json({
      reply,
      generatedBy: GEMINI_MODEL,
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (profile && aqiData) {
      return NextResponse.json({
        reply: buildChatFallback(profile, aqiData),
        generatedBy: 'fallback',
      });
    }
    return NextResponse.json(
      { error: 'Failed to process specialist chat request' },
      { status: 500 }
    );
  }
}
