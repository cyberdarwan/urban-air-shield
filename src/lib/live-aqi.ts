import {
  calculateAqi,
  computePollutantSubIndex,
  convertToCpcbUnit,
  getAqiCategory,
  getRegionalAdvisories,
} from '@/lib/aqi-utils';
import { getCityCoords, type CityCoords } from '@/lib/city-coords';
import type {
  AqiDebugInfo,
  AqiResponse,
  MappedPollutantDebug,
  PollutantLevels,
} from '@/types/air-quality';

const CPCB_RESOURCE_URL =
  'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69';

interface CpcbRecord {
  station?: string;
  city?: string;
  state?: string;
  pollutant_id?: string;
  pollutant_avg?: string | number;
  avg_value?: string | number;
  last_update?: string;
}

interface OpenAqSensor {
  id: number;
  name?: string;
  parameter?: {
    id?: number;
    name?: string;
    units?: string;
  };
}

interface OpenAqLocation {
  id: number;
  name?: string;
  locality?: string | null;
  isMonitor?: boolean | null;
  sensors?: OpenAqSensor[];
}

interface OpenAqLatestMeasurement {
  sensorsId: number;
  value: number;
  parameter?: string;
  datetime?: {
    utc?: string;
    local?: string;
  };
}

function formatLocationLabel(state: string, city: string, town: string): string {
  const parts = [town, city, state].map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Central Urban Sector';
}

function normalizePollutantKey(id?: string): keyof PollutantLevels | null {
  if (!id) return null;
  const upper = id.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (upper === 'PM25' || upper === 'PM2.5') return 'pm25';
  if (upper === 'PM10') return 'pm10';
  if (upper === 'NO2') return 'no2';
  if (upper === 'O3' || upper === 'OZONE') return 'o3';
  if (upper === 'CO') return 'co';
  if (upper === 'SO2') return 'so2';
  return null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geocodeIndianCity(city: string): Promise<CityCoords | null> {
  const staticCoords = getCityCoords(city);
  if (staticCoords) return staticCoords;
  if (!city) return null;

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', city);
    url.searchParams.set('count', '3');
    url.searchParams.set('countryCode', 'IN');
    const res = await fetchWithTimeout(url.toString(), { cache: 'no-store' }, 4000);
    if (!res.ok) return null;
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    if (
      first &&
      typeof first.latitude === 'number' &&
      typeof first.longitude === 'number'
    ) {
      return { lat: first.latitude, lng: first.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchFromCpcb(
  state: string,
  city: string,
  town: string
): Promise<Omit<AqiResponse, 'advisories' | 'simulated'> | null> {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) return null;

  try {
    const tryFetch = async (useStateFilter: boolean, useCityFilter: boolean) => {
      const params = new URLSearchParams({
        'api-key': apiKey,
        format: 'json',
        limit: '100',
      });
      if (useStateFilter && state) params.set('filters[state]', state);
      if (useCityFilter && city) params.set('filters[city]', city);

      const res = await fetchWithTimeout(
        `${CPCB_RESOURCE_URL}?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.records) ? (data.records as CpcbRecord[]) : [];
    };

    let records = await tryFetch(Boolean(state), Boolean(city));
    if (records.length === 0 && city) {
      records = await tryFetch(false, true);
    }
    if (records.length === 0) return null;

    const townLower = town.toLowerCase();
    const cityLower = city.toLowerCase();

    let matchedRecords = townLower
      ? records.filter(
          (r) =>
            r.station?.toLowerCase().includes(townLower) ||
            r.city?.toLowerCase().includes(townLower)
        )
      : [];

    if (matchedRecords.length === 0 && cityLower) {
      matchedRecords = records.filter(
        (r) =>
          r.city?.toLowerCase().includes(cityLower) ||
          r.station?.toLowerCase().includes(cityLower)
      );
    }

    if (matchedRecords.length === 0) return null;

    const targetStation = matchedRecords[0]?.station || '';
    const stationRecords = targetStation
      ? matchedRecords.filter((r) => r.station === targetStation)
      : matchedRecords;

    const pollutants: Partial<PollutantLevels> = {};
    const mappedPollutants: Record<string, MappedPollutantDebug> = {};
    let latestTimestamp = '';

    for (const rec of stationRecords) {
      const key = normalizePollutantKey(rec.pollutant_id);
      const rawVal = Number(rec.pollutant_avg ?? rec.avg_value);
      if (key && Number.isFinite(rawVal) && rawVal > 0) {
        const converted = convertToCpcbUnit(
          key,
          rawVal,
          key === 'co' ? 'mg/m³' : 'µg/m³'
        );
        pollutants[key] = converted.value;
        mappedPollutants[key] = {
          rawValue: rawVal,
          rawUnit: converted.cpcbUnit,
          convertedValue: converted.value,
          cpcbUnit: converted.cpcbUnit,
          subIndex: computePollutantSubIndex(key, converted.value),
        };
      }
      if (rec.last_update && !latestTimestamp) {
        latestTimestamp = rec.last_update;
      }
    }

    if (
      pollutants.pm25 === undefined &&
      pollutants.pm10 === undefined &&
      pollutants.no2 === undefined
    ) {
      return null;
    }

    const finalPollutants: PollutantLevels = {
      pm25: pollutants.pm25 ?? 78,
      pm10: pollutants.pm10 ?? 142,
      no2: pollutants.no2 ?? 46,
      o3: pollutants.o3 ?? 38,
      co: pollutants.co ?? 1.1,
      so2: pollutants.so2 ?? 14,
    };

    const aqi = calculateAqi(finalPollutants);
    const stationName =
      targetStation ||
      `${town || city || 'Central Urban'} CPCB Monitoring Station`;

    return {
      stationName,
      locationLabel: formatLocationLabel(state, city, town),
      aqi,
      category: getAqiCategory(aqi),
      pollutants: finalPollutants,
      source: 'CPCB (data.gov.in)',
      timestamp: latestTimestamp || new Date().toISOString(),
      debug: {
        source: 'CPCB Live',
        upstreamStatus: 200,
        stationId: targetStation || null,
        stationName,
        mappedPollutants,
        fallbackReason: null,
      },
    };
  } catch {
    return null;
  }
}

async function fetchFromOpenAq(
  state: string,
  city: string,
  town: string,
  stationIdParam?: string
): Promise<{
  data: Omit<AqiResponse, 'advisories' | 'simulated'> | null;
  upstreamStatus: number | null;
  failureReason: string | null;
}> {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      upstreamStatus: null,
      failureReason: 'OPENAQ_API_KEY missing on server',
    };
  }

  let upstreamStatus: number | null = null;

  try {
    let locations: OpenAqLocation[] = [];

    if (stationIdParam) {
      const directUrl = `https://api.openaq.org/v3/locations/${encodeURIComponent(stationIdParam)}`;
      const res = await fetchWithTimeout(directUrl, {
        headers: { 'X-API-Key': apiKey },
        cache: 'no-store',
      });
      upstreamStatus = res.status;
      if (!res.ok) {
        return {
          data: null,
          upstreamStatus,
          failureReason: `OpenAQ /v3/locations/${stationIdParam} returned HTTP ${res.status}`,
        };
      }
      const json = await res.json();
      locations = Array.isArray(json?.results) ? json.results : [];
    } else {
      const coords = await geocodeIndianCity(town || city || state);
      const locUrl = new URL('https://api.openaq.org/v3/locations');
      locUrl.searchParams.set('limit', '10');
      locUrl.searchParams.set('iso', 'IN');
      if (coords) {
        locUrl.searchParams.set('coordinates', `${coords.lat},${coords.lng}`);
        locUrl.searchParams.set('radius', '25000');
      }

      const locRes = await fetchWithTimeout(locUrl.toString(), {
        headers: { 'X-API-Key': apiKey },
        cache: 'no-store',
      });
      upstreamStatus = locRes.status;
      if (!locRes.ok) {
        return {
          data: null,
          upstreamStatus,
          failureReason: `OpenAQ /v3/locations returned HTTP ${locRes.status}`,
        };
      }
      const locJson = await locRes.json();
      locations = Array.isArray(locJson?.results) ? locJson.results : [];

      if (locations.length === 0) {
        return {
          data: null,
          upstreamStatus,
          failureReason: `No OpenAQ stations found within 25 km of "${city || town}"`,
        };
      }
    }

    let lastLatestStatus: number | null = upstreamStatus;
    for (const candidate of locations.slice(0, 6)) {
      const latestRes = await fetchWithTimeout(
        `https://api.openaq.org/v3/locations/${candidate.id}/latest`,
        {
          headers: { 'X-API-Key': apiKey },
          cache: 'no-store',
        }
      );
      lastLatestStatus = latestRes.status;
      if (!latestRes.ok) continue;

      const latestJson = await latestRes.json();
      const measurements: OpenAqLatestMeasurement[] = Array.isArray(
        latestJson?.results
      )
        ? latestJson.results
        : [];

      if (measurements.length === 0) continue;

      const sensorMap = new Map<number, { name: string; units: string }>();
      if (Array.isArray(candidate.sensors)) {
        for (const s of candidate.sensors) {
          if (s?.id && s?.parameter?.name) {
            sensorMap.set(s.id, {
              name: s.parameter.name,
              units: s.parameter.units || '',
            });
          }
        }
      }

      const pollutants: Partial<PollutantLevels> = {};
      const mappedPollutants: Record<string, MappedPollutantDebug> = {};
      let timestamp = '';

      for (const m of measurements) {
        const sensorInfo = sensorMap.get(m.sensorsId);
        const paramName = sensorInfo?.name || m.parameter;
        const rawUnit = sensorInfo?.units || '';
        const key = normalizePollutantKey(paramName);

        if (
          key &&
          typeof m.value === 'number' &&
          Number.isFinite(m.value) &&
          m.value >= 0
        ) {
          const alreadyHasPreferredUnit =
            mappedPollutants[key] &&
            (mappedPollutants[key].rawUnit === 'µg/m³' ||
              mappedPollutants[key].rawUnit === 'mg/m³');
          if (alreadyHasPreferredUnit && rawUnit === 'ppb') {
            continue;
          }

          const converted = convertToCpcbUnit(key, m.value, rawUnit);
          pollutants[key] = converted.value;
          mappedPollutants[key] = {
            rawValue: m.value,
            rawUnit: rawUnit || converted.cpcbUnit,
            convertedValue: converted.value,
            cpcbUnit: converted.cpcbUnit,
            subIndex: computePollutantSubIndex(key, converted.value),
          };
        }

        if (m.datetime?.utc && (!timestamp || m.datetime.utc > timestamp)) {
          timestamp = m.datetime.utc;
        }
      }

      if (
        pollutants.pm25 === undefined &&
        pollutants.pm10 === undefined &&
        pollutants.no2 === undefined
      ) {
        continue;
      }

      const finalPollutants: PollutantLevels = {
        pm25: pollutants.pm25 ?? 62,
        pm10: pollutants.pm10 ?? 118,
        no2: pollutants.no2 ?? 34,
        o3: pollutants.o3 ?? 32,
        co: pollutants.co ?? 1.0,
        so2: pollutants.so2 ?? 12,
      };

      const aqi = calculateAqi(finalPollutants);
      const stationName =
        candidate.name || `${town || city || 'Urban'} OpenAQ Station`;

      return {
        data: {
          stationName,
          locationLabel: formatLocationLabel(state, city, town),
          aqi,
          category: getAqiCategory(aqi),
          pollutants: finalPollutants,
          source: 'OpenAQ Live',
          timestamp: timestamp || new Date().toISOString(),
          debug: {
            source: 'OpenAQ Live',
            upstreamStatus: lastLatestStatus,
            stationId: candidate.id,
            stationName,
            mappedPollutants,
            fallbackReason: null,
          },
        },
        upstreamStatus: lastLatestStatus,
        failureReason: null,
      };
    }

    return {
      data: null,
      upstreamStatus: lastLatestStatus,
      failureReason: `Checked ${Math.min(locations.length, 6)} OpenAQ station(s) near "${city || town}" but none had valid PM2.5/PM10/NO2 measurements`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown OpenAQ error';
    return {
      data: null,
      upstreamStatus,
      failureReason: `OpenAQ request failed: ${message}`,
    };
  }
}

function buildUrbanFallback(
  state: string,
  city: string,
  town: string,
  upstreamStatus: number | null,
  fallbackReason: string
): Omit<AqiResponse, 'advisories' | 'simulated'> {
  const seedText = `${state}-${city}-${town}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) % 1000;
  }

  const pm25 = 88 + (hash % 45);
  const pm10 = 162 + (hash % 70);
  const no2 = 44 + (hash % 24);
  const o3 = 34 + (hash % 18);
  const co = Math.round((0.9 + (hash % 9) * 0.1) * 10) / 10;
  const so2 = 12 + (hash % 14);

  const pollutants: PollutantLevels = { pm25, pm10, no2, o3, co, so2 };
  const aqi = calculateAqi(pollutants);
  const primaryLocality = town || city || 'Central Urban';
  const stationName = `${primaryLocality} Baseline Station`;

  const mappedPollutants: Record<string, MappedPollutantDebug> = {
    pm25: {
      rawValue: pm25,
      rawUnit: 'µg/m³',
      convertedValue: pm25,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('pm25', pm25),
    },
    pm10: {
      rawValue: pm10,
      rawUnit: 'µg/m³',
      convertedValue: pm10,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('pm10', pm10),
    },
    no2: {
      rawValue: no2,
      rawUnit: 'µg/m³',
      convertedValue: no2,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('no2', no2),
    },
    o3: {
      rawValue: o3,
      rawUnit: 'µg/m³',
      convertedValue: o3,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('o3', o3),
    },
    co: {
      rawValue: co,
      rawUnit: 'mg/m³',
      convertedValue: co,
      cpcbUnit: 'mg/m³',
      subIndex: computePollutantSubIndex('co', co),
    },
    so2: {
      rawValue: so2,
      rawUnit: 'µg/m³',
      convertedValue: so2,
      cpcbUnit: 'µg/m³',
      subIndex: computePollutantSubIndex('so2', so2),
    },
  };

  const debug: AqiDebugInfo = {
    source: 'Fallback',
    upstreamStatus,
    stationId: null,
    stationName,
    mappedPollutants,
    fallbackReason,
  };

  return {
    stationName,
    locationLabel: formatLocationLabel(state, city, town),
    aqi,
    category: getAqiCategory(aqi),
    pollutants,
    source: 'Regional Baseline Estimate',
    timestamp: new Date().toISOString(),
    debug,
  };
}

export async function fetchLiveCityAqi({
  city,
  town = '',
  state = '',
  stationId,
  simulate = '',
}: {
  city: string;
  town?: string;
  state?: string;
  stationId?: string;
  simulate?: string;
}): Promise<AqiResponse> {
  if (simulate === 'severe') {
    const aqi = 432;
    const primaryLocality = town || city || 'Central Urban';
    const stationName = `${primaryLocality} Monitoring Station`;
    return {
      stationName,
      locationLabel: formatLocationLabel(state, city, town),
      aqi,
      category: getAqiCategory(aqi),
      pollutants: {
        pm25: 285,
        pm10: 418,
        no2: 94,
        o3: 58,
        co: 2.6,
        so2: 42,
      },
      source: 'Severe Smog Simulator',
      timestamp: new Date().toISOString(),
      advisories: getRegionalAdvisories(aqi, city),
      simulated: true,
      debug: {
        source: 'Fallback',
        upstreamStatus: null,
        stationId: null,
        stationName,
        mappedPollutants: {},
        fallbackReason: 'Severe Smog Simulator mode enabled by user',
      },
    };
  }

  const openAq = await fetchFromOpenAq(state, city, town, stationId || undefined);
  if (openAq.data) {
    return {
      ...openAq.data,
      advisories: getRegionalAdvisories(openAq.data.aqi, city),
      simulated: false,
    };
  }

  const cpcb = await fetchFromCpcb(state, city, town);
  if (cpcb) {
    return {
      ...cpcb,
      advisories: getRegionalAdvisories(cpcb.aqi, city),
      simulated: false,
    };
  }

  const fallback = buildUrbanFallback(
    state,
    city,
    town,
    openAq.upstreamStatus,
    openAq.failureReason || 'No live station data available'
  );
  return {
    ...fallback,
    advisories: getRegionalAdvisories(fallback.aqi, city),
    simulated: false,
  };
}
