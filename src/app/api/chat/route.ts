import { NextRequest, NextResponse } from 'next/server';
import { GEMINI_MODEL, getGeminiClient, withTimeout } from '@/lib/gemini';
import type { AqiResponse, ChatMessage, UserProfile } from '@/types/air-quality';

function buildChatFallback(profile: UserProfile, aqiData: AqiResponse): string {
  const loc = aqiData.locationLabel || 'your area';
  return `Based on live readings at ${aqiData.stationName} (${loc}), AQI is currently ${aqiData.aqi} (${aqiData.category}) with PM2.5 at ${aqiData.pollutants.pm25} µg/m³. During winter thermal inversions, cold air traps fine particulates near ground level between 06:00-10:00 and after 18:30. Given your "${profile.mode}" profile and "${profile.budget}" setup, prioritize indoor air sealing during peak hours, schedule essential outdoor movement between 12:00-16:00, and wear a fitted N95 mask outdoors.`;
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

    const systemInstruction = `You are an expert Urban Meteorologist & Environmental Health Specialist with deep expertise in winter thermal inversions, boundary-layer atmospheric dispersion, PM2.5/PM10 respiratory & cardiovascular physiology, N95/HEPA filtration physics, and official CPCB GRAP air quality protocols.

You must give hyper-personalized, scientifically grounded, concise, and practical answers using the user's exact profile and live telemetry injected below. Never ask the user to repeat their location, household size, sensitivities, commute, or current AQI—you already have them. Never mention or invent unrelated Indian state names.

INJECTED USER PROFILE:
- Mode: ${profile.mode}
- Location: ${profile.location?.town || ''}, ${profile.location?.city || ''}, ${profile.location?.state || ''}
- Budget Tier: ${profile.budget}
- Details: ${JSON.stringify(profile.personal || profile.school || profile.industry)}

INJECTED LIVE TELEMETRY:
- Station: ${aqiData.stationName} (${aqiData.source})
- Timestamp: ${aqiData.timestamp}
- AQI: ${aqiData.aqi} (${aqiData.category})
- PM2.5: ${aqiData.pollutants.pm25} µg/m³, PM10: ${aqiData.pollutants.pm10} µg/m³, NO2: ${aqiData.pollutants.no2} µg/m³, O3: ${aqiData.pollutants.o3} µg/m³
- Active GRAP Advisories: ${aqiData.advisories.map((a) => `${a.stage}: ${a.title}`).join('; ')}`;

    const conversationHistory = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Specialist'}: ${m.content}`)
      .join('\n\n');

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `${conversationHistory}\n\nRespond clearly to the latest user message: "${latestUserMessage}"`,
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
      'I could not generate a meteorological response right now. Please try again.';

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
      { error: 'Failed to process expert chat request' },
      { status: 500 }
    );
  }
}
