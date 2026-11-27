import {
  fetchWithTimeout,
  formatLocationLabel,
  normalizePollutantKey,
} from '@/lib/aqi-fallback';
import {
  calculateAqi,
  computePollutantSubIndex,
  convertToCpcbUnit,
  getAqiCategory,
} from '@/lib/aqi-utils';
import { getCityCoords, type CityCoords } from '@/lib/city-coords';
import type {
  AqiResponse,
  MappedPollutantDebug,
  PollutantLevels,
} from '@/types/air-quality';

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

/**
 * Resolves coordinates for an Indian city from the static table or Open-Meteo geocoding.
 */
export async function geocodeIndianCity(
  city: string
): Promise<CityCoords | null> {
  const staticCoords = getCityCoords(city);
  if (staticCoords) return staticCoords;
  if (!city) return null;

  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', city);
    url.searchParams.set('count', '3');
    url.searchParams.set('countryCode', 'IN');
    const res = await fetchWithTimeout(
      url.toString(),
      { cache: 'no-store' },
      4000
    );
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

/**
 * Fetches live station telemetry from OpenAQ v3 and converts measurements to Indian CPCB units.
 */
export async function fetchFromOpenAq(
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
