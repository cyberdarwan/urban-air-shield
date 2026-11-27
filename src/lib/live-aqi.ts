import { buildSevereSimulation, buildUrbanFallback } from '@/lib/aqi-fallback';
import { getRegionalAdvisories } from '@/lib/aqi-utils';
import { fetchFromCpcb } from '@/lib/cpcb-client';
import { fetchFromOpenAq } from '@/lib/openaq-client';
import type { AqiResponse } from '@/types/air-quality';

interface CachedAqiEntry {
  data: AqiResponse;
  expiresAt: number;
}

const AQI_CACHE_TTL_MS = 3 * 60 * 1000;
const AQI_CACHE_MAX_ENTRIES = 120;
const aqiCache = new Map<string, CachedAqiEntry>();

/**
 * Clears the 3-minute per-city server AQI cache (used by tests for deterministic runs).
 */
export function clearAqiCache(): void {
  aqiCache.clear();
}

function buildAqiCacheKey(
  city: string,
  town: string,
  state: string,
  stationId?: string
): string {
  return [
    city.trim().toLowerCase(),
    town.trim().toLowerCase(),
    state.trim().toLowerCase(),
    (stationId || '').trim().toLowerCase(),
  ].join('|');
}

function storeAqiCache(key: string, data: AqiResponse): void {
  if (aqiCache.size >= AQI_CACHE_MAX_ENTRIES) {
    const oldest = aqiCache.keys().next().value;
    if (oldest) aqiCache.delete(oldest);
  }
  aqiCache.set(key, {
    data,
    expiresAt: Date.now() + AQI_CACHE_TTL_MS,
  });
}

export interface FetchLiveCityAqiParams {
  city: string;
  town?: string;
  state?: string;
  stationId?: string;
  simulate?: string;
  bypassCache?: boolean;
}

/**
 * Orchestrates live AQI resolution (OpenAQ v3 -> CPCB -> Regional Baseline)
 * with a bounded 3-minute per-city cache that can be bypassed on manual refresh.
 */
export async function fetchLiveCityAqi({
  city,
  town = '',
  state = '',
  stationId,
  simulate = '',
  bypassCache = false,
}: FetchLiveCityAqiParams): Promise<AqiResponse> {
  if (simulate === 'severe') {
    return buildSevereSimulation(state, city, town);
  }

  const cacheKey = buildAqiCacheKey(city, town, state, stationId);
  if (!bypassCache) {
    const cached = aqiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (cached) aqiCache.delete(cacheKey);
  }

  const openAq = await fetchFromOpenAq(
    state,
    city,
    town,
    stationId || undefined
  );
  if (openAq.data) {
    const result: AqiResponse = {
      ...openAq.data,
      advisories: getRegionalAdvisories(openAq.data.aqi, city),
      simulated: false,
    };
    storeAqiCache(cacheKey, result);
    return result;
  }

  const cpcb = await fetchFromCpcb(state, city, town);
  if (cpcb) {
    const result: AqiResponse = {
      ...cpcb,
      advisories: getRegionalAdvisories(cpcb.aqi, city),
      simulated: false,
    };
    storeAqiCache(cacheKey, result);
    return result;
  }

  const fallback = buildUrbanFallback(
    state,
    city,
    town,
    openAq.upstreamStatus,
    openAq.failureReason || 'No live station data available'
  );
  const result: AqiResponse = {
    ...fallback,
    advisories: getRegionalAdvisories(fallback.aqi, city),
    simulated: false,
  };
  storeAqiCache(cacheKey, result);
  return result;
}
