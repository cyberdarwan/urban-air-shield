import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveCityAqi } from '@/lib/live-aqi';
import { sanitizeShortText } from '@/lib/security';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const simulate = sanitizeShortText(searchParams.get('simulate'), 20);
  const state = sanitizeShortText(searchParams.get('state'), 80);
  const city = sanitizeShortText(searchParams.get('city'), 80);
  const town = sanitizeShortText(searchParams.get('town'), 80);
  const stationId = sanitizeShortText(searchParams.get('stationId'), 20);

  const response = await fetchLiveCityAqi({
    city,
    town,
    state,
    stationId: stationId || undefined,
    simulate,
  });

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
