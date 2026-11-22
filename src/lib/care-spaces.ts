import type {
  AqiResponse,
  CareSpaceProfile,
  CareSpacesStore,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

export const CARE_SPACES_STORAGE_KEY = 'smogsense_care_spaces_v1';
export const LEGACY_PROFILE_STORAGE_KEY = 'smogsense_profile_v1';

export const SAFE_AQI_PRESETS = [
  { value: 50, label: '50 Strict' },
  { value: 100, label: '100 Sensitive' },
  { value: 150, label: '150 Moderate' },
  { value: 200, label: '200 Commuter' },
] as const;

export function createCareSpaceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getDefaultSafeAqiLimit(profile: UserProfile): number {
  const sensitiveMembers = (profile.householdMembers || []).some((m) =>
    ['Kids Under 10', 'Seniors (60+)', 'Pregnant Member'].includes(m)
  );
  const sensitiveHealth = (profile.healthSensitivities || []).some(
    (s) => s !== 'None'
  );
  return sensitiveMembers || sensitiveHealth ? 100 : 150;
}

export function isValidMultiSelectProfile(data: unknown): data is UserProfile {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<UserProfile>;
  return (
    Boolean(candidate.location?.city) &&
    Array.isArray(candidate.stepOutWindows) &&
    Array.isArray(candidate.travelModes) &&
    Array.isArray(candidate.householdMembers) &&
    Array.isArray(candidate.healthSensitivities) &&
    Array.isArray(candidate.homeSurroundings) &&
    Array.isArray(candidate.existingProtection)
  );
}

export function loadCareSpaces(): CareSpacesStore | null {
  try {
    const rawStore = localStorage.getItem(CARE_SPACES_STORAGE_KEY);
    if (rawStore) {
      const parsed = JSON.parse(rawStore) as Partial<CareSpacesStore>;
      if (
        Array.isArray(parsed.careSpaces) &&
        parsed.careSpaces.length > 0 &&
        parsed.careSpaces.every(
          (cs) => cs && cs.id && cs.city && isValidMultiSelectProfile(cs.profile)
        )
      ) {
        const activeId = parsed.careSpaces.some(
          (cs) => cs.id === parsed.activeCareSpaceId
        )
          ? (parsed.activeCareSpaceId as string)
          : parsed.careSpaces[0].id;
        return {
          careSpaces: parsed.careSpaces,
          activeCareSpaceId: activeId,
        };
      }
    }

    // Migrate legacy single-profile storage into an initial "My Home" Care Space
    const legacyRaw = localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (isValidMultiSelectProfile(legacy)) {
        const initialSpace: CareSpaceProfile = {
          id: createCareSpaceId(),
          label: 'My Home',
          city: legacy.location.city,
          safeAqiLimit: getDefaultSafeAqiLimit(legacy),
          profile: legacy,
          updatedAt: legacy.updatedAt || new Date().toISOString(),
        };
        const migrated: CareSpacesStore = {
          careSpaces: [initialSpace],
          activeCareSpaceId: initialSpace.id,
        };
        saveCareSpaces(migrated);
        return migrated;
      } else {
        localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveCareSpaces(store: CareSpacesStore): void {
  try {
    localStorage.setItem(CARE_SPACES_STORAGE_KEY, JSON.stringify(store));
    const active = store.careSpaces.find(
      (cs) => cs.id === store.activeCareSpaceId
    );
    if (active) {
      localStorage.setItem(
        LEGACY_PROFILE_STORAGE_KEY,
        JSON.stringify(active.profile)
      );
    }
  } catch {
    // ignore storage errors
  }
}

export function formatWhatsAppBrief(
  space: CareSpaceProfile,
  aqiData: AqiResponse,
  recommendations?: RecommendationPayload | null
): string {
  const isSafe = aqiData.aqi <= space.safeAqiLimit;
  const verdict = isSafe
    ? `Okay to Move Out (${aqiData.aqi} <= ${space.safeAqiLimit} limit)`
    : `Caution: Delay Outdoor Activity (${aqiData.aqi} > ${space.safeAqiLimit} limit)`;

  const bestWindow =
    recommendations?.clockWindows?.bestWindowToStepOut || '12:00 PM - 4:00 PM';
  const checklist =
    recommendations?.todaysPracticalMoves?.quickChecklist?.slice(0, 2) || [];

  const lines = [
    `*SmogSense Air Brief — ${space.label}*`,
    `City: ${space.city}${space.profile.location.town ? ` (${space.profile.location.town})` : ''}`,
    `Live AQI: *${aqiData.aqi}* (${aqiData.category})`,
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

export function formatFamilyRollupWhatsAppBrief(
  spaces: CareSpaceProfile[],
  cityAqiMap: Record<string, AqiResponse>
): string {
  const lines = ['*SmogSense Family Air Check-In*'];
  for (const space of spaces) {
    const data = cityAqiMap[space.city.toLowerCase()];
    if (data) {
      const ok = data.aqi <= space.safeAqiLimit;
      lines.push(
        `• *${space.label}* (${space.city}): ${data.aqi} AQI (${data.category}) — ${
          ok ? `Okay to Move Out (<=${space.safeAqiLimit})` : `Caution (>${space.safeAqiLimit})`
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

export async function shareViaWhatsApp(
  message: string
): Promise<'whatsapp' | 'copied'> {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (win) return 'whatsapp';
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    // ignore clipboard failures
  }
  return 'copied';
}
