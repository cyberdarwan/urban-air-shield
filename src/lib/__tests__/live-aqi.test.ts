import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildUrbanFallback,
  formatLocationLabel,
  normalizePollutantKey,
} from '@/lib/aqi-fallback';
import { getCityCoords } from '@/lib/city-coords';
import { clearAqiCache, fetchLiveCityAqi } from '@/lib/live-aqi';
import { geocodeIndianCity } from '@/lib/openaq-client';

describe('live-aqi pipeline (OpenAQ -> CPCB -> Regional Baseline + 3-min cache)', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAqiCache();
    process.env.OPENAQ_API_KEY = 'test-openaq-key';
    delete process.env.DATA_GOV_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    clearAqiCache();
  });

  it('normalizes pollutant keys, location labels, and static city coordinates', () => {
    expect(normalizePollutantKey('PM2.5')).toBe('pm25');
    expect(normalizePollutantKey('ozone')).toBe('o3');
    expect(normalizePollutantKey('CO')).toBe('co');
    expect(normalizePollutantKey('SO2')).toBe('so2');
    expect(normalizePollutantKey('unknown')).toBeNull();
    expect(formatLocationLabel('', 'Pune', 'Kothrud')).toBe('Kothrud, Pune');
    expect(formatLocationLabel('', '', '')).toBe('Central Urban Sector');
    expect(getCityCoords('Hyderabad')).not.toBeNull();
    expect(getCityCoords('')).toBeNull();
  });

  it('serves live OpenAQ measurements, caches per city for 3 minutes, and bypasses cache on manual refresh', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/v3/locations?')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 901,
                name: 'Bengaluru BTM Monitor',
                sensors: [
                  { id: 1, parameter: { name: 'pm25', units: 'µg/m³' } },
                  { id: 2, parameter: { name: 'co', units: 'ppb' } },
                  { id: 3, parameter: { name: 'no2', units: 'ppb' } },
                  { id: 4, parameter: { name: 'pm10', units: 'µg/m³' } },
                ],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            { sensorsId: 1, value: 60, datetime: { utc: '2026-01-01T09:00:00Z' } },
            { sensorsId: 2, value: 900, datetime: { utc: '2026-01-01T09:00:00Z' } },
            { sensorsId: 3, value: 25, datetime: { utc: '2026-01-01T09:00:00Z' } },
            { sensorsId: 4, value: 80, datetime: { utc: '2026-01-01T09:00:00Z' } },
          ],
        }),
        { status: 200 }
      );
    });
    global.fetch = fetchMock as typeof fetch;

    const first = await fetchLiveCityAqi({ city: 'Bengaluru' });
    expect(first.source).toBe('OpenAQ Live');
    expect(first.aqi).toBe(100);
    expect(first.pollutants.pm25).toBe(60);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Second call hits 3-minute per-city cache (zero additional fetch calls)
    const second = await fetchLiveCityAqi({ city: 'bengaluru' });
    expect(second.aqi).toBe(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Manual refresh bypasses cache and re-fetches upstream
    const refreshed = await fetchLiveCityAqi({
      city: 'Bengaluru',
      bypassCache: true,
    });
    expect(refreshed.source).toBe('OpenAQ Live');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('uses Open-Meteo geocoding for unmapped Indian cities', async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          results: [{ latitude: 17.6868, longitude: 83.2185 }],
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const coords = await geocodeIndianCity('Anakapalle');
    expect(coords).toEqual({ lat: 17.6868, lng: 83.2185 });
  });

  it('falls back to CPCB data.gov.in when OpenAQ returns no stations', async () => {
    process.env.DATA_GOV_API_KEY = 'test-cpcb-key';

    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.openaq.org')) {
        return new Response(JSON.stringify({ results: [] }), { status: 200 });
      }
      if (url.includes('api.data.gov.in')) {
        return new Response(
          JSON.stringify({
            records: [
              {
                station: 'Civil Lines, Jaipur - RSPCB',
                city: 'Jaipur',
                pollutant_id: 'PM2.5',
                pollutant_avg: '90',
                last_update: '2026-01-01T10:00:00Z',
              },
              {
                station: 'Civil Lines, Jaipur - RSPCB',
                city: 'Jaipur',
                pollutant_id: 'PM10',
                pollutant_avg: '150',
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as typeof fetch;

    const res = await fetchLiveCityAqi({ city: 'Jaipur' });
    expect(res.source).toBe('CPCB (data.gov.in)');
    expect(res.stationName).toBe('Civil Lines, Jaipur - RSPCB');
    expect(res.aqi).toBe(200);
  });

  it('falls back deterministically to Regional Baseline Estimate when upstream keys are absent or fail', async () => {
    delete process.env.OPENAQ_API_KEY;
    delete process.env.DATA_GOV_API_KEY;

    const res = await fetchLiveCityAqi({ city: 'Kochi', town: 'Ernakulam' });
    expect(res.source).toBe('Regional Baseline Estimate');
    expect(res.debug?.source).toBe('Fallback');
    expect(res.advisories[0].isGrapRegion).toBe(false);

    const directFallback = buildUrbanFallback(
      '',
      'New Delhi',
      'Rohini',
      503,
      'Upstream timeout'
    );
    expect(directFallback.stationName).toBe('Rohini Baseline Station');
    expect(directFallback.debug?.upstreamStatus).toBe(503);
  });

  it('supports stationId lookup and severe simulation bypass', async () => {
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/v3/locations/42/latest')) {
        return new Response(
          JSON.stringify({
            results: [{ sensorsId: 7, value: 120, datetime: { utc: '2026-01-01T11:00:00Z' } }],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              id: 42,
              name: 'Direct Station 42',
              sensors: [{ id: 7, parameter: { name: 'pm25', units: 'µg/m³' } }],
            },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const direct = await fetchLiveCityAqi({ city: 'Mumbai', stationId: '42' });
    expect(direct.stationName).toBe('Direct Station 42');
    expect(direct.aqi).toBe(300);

    const severe = await fetchLiveCityAqi({
      city: 'New Delhi',
      simulate: 'severe',
    });
    expect(severe.aqi).toBe(432);
    expect(severe.simulated).toBe(true);
  });
});
