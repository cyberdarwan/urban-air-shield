import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveCityAqi } from '@/lib/live-aqi';
import { checkRateLimit, sanitizeShortText } from '@/lib/security';

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(request, 'aqi', 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSec) },
      }
    );
  }

  const { searchParams } = request.nextUrl;
  const simulate = sanitizeShortText(searchParams.get('simulate'), 20);
  const state = sanitizeShortText(searchParams.get('state'), 80);
  const city = sanitizeShortText(searchParams.get('city'), 80);
  const town = sanitizeShortText(searchParams.get('town'), 80);
  const stationId = sanitizeShortText(searchParams.get('stationId'), 20);
  const refresh = sanitizeShortText(searchParams.get('refresh'), 10);

  const response = await fetchLiveCityAqi({
    city,
    town,
    state,
    stationId: stationId || undefined,
    simulate,
    bypassCache: refresh === '1' || refresh.toLowerCase() === 'true',
  });

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
