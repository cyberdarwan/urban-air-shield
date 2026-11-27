import { clampAqi, getAqiCategory, isAirSafe } from '@/lib/aqi-utils';
import type {
  AqiResponse,
  CareSpaceProfile,
  RecommendationPayload,
} from '@/types/air-quality';

/**
 * Formats a concise, plain-English WhatsApp Morning Brief for a single Care Space.
 * Gracefully fills in defaults when optional locality, category, or recommendations are absent.
 */
export function formatWhatsAppBrief(
  space: Partial<CareSpaceProfile>,
  liveData: Partial<AqiResponse> & { aqi: number },
  recommendations?: RecommendationPayload | null
): string {
  const label = space.label?.trim() || 'My Care Space';
  const city = space.city?.trim() || space.profile?.location?.city?.trim() || 'Unknown City';
  const town = space.profile?.location?.town?.trim();
  const safeLimit =
    typeof space.safeAqiLimit === 'number' && Number.isFinite(space.safeAqiLimit)
      ? Math.max(0, Math.round(space.safeAqiLimit))
      : 150;

  const aqi = clampAqi(liveData.aqi);
  const category = liveData.category || getAqiCategory(aqi);
  const isSafe = isAirSafe(aqi, safeLimit);

  const verdict = isSafe
    ? `Okay to Move Out (${aqi} <= ${safeLimit} limit)`
    : `Caution: Delay Outdoor Activity (${aqi} > ${safeLimit} limit)`;

  const bestWindow =
    recommendations?.clockWindows?.bestWindowToStepOut?.trim() ||
    '12:00 PM - 4:00 PM';
  const checklist =
    recommendations?.todaysPracticalMoves?.quickChecklist
      ?.filter((item) => Boolean(item && item.trim()))
      .slice(0, 2) || [];

  const lines = [
    `*SmogSense Air Brief — ${label}*`,
    `City: ${city}${town ? ` (${town})` : ''}`,
    `Live AQI: *${aqi}* (${category})`,
    `Movement Verdict: *${verdict}*`,
    `Best Outdoor Window: ${bestWindow}`,
  ];

  if (checklist.length > 0) {
    lines.push('', 'Today’s Top Moves:');
    for (const item of checklist) {
      lines.push(`• ${item}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats a multi-city family rollup message comparing live AQI against each Care Space limit.
 */
export function formatFamilyRollupWhatsAppBrief(
  spaces: ReadonlyArray<CareSpaceProfile>,
  cityAqiMap: Record<string, AqiResponse>
): string {
  const lines = ['*SmogSense Family Air Check-In*'];
  for (const space of spaces) {
    const cityKey = space.city.trim().toLowerCase();
    const data = cityAqiMap[cityKey];
    if (data) {
      const aqi = clampAqi(data.aqi);
      const ok = isAirSafe(aqi, space.safeAqiLimit);
      lines.push(
        `• *${space.label}* (${space.city}): ${aqi} AQI (${data.category}) — ${
          ok
            ? `Okay to Move Out (<=${space.safeAqiLimit})`
            : `Caution (>${space.safeAqiLimit})`
        }`
      );
    } else {
      lines.push(
        `• *${space.label}* (${space.city}): Safe limit <= ${space.safeAqiLimit} AQI`
      );
    }
  }
  return lines.join('\n');
}
