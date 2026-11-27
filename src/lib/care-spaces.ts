import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  CareSpaceProfile,
  CareSpacesStore,
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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

export {
  formatWhatsAppBrief,
  formatFamilyRollupWhatsAppBrief,
} from '@/lib/whatsapp-formatter';

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

interface CloudCareSpaceRow {
  id: string;
  user_id: string;
  label: string;
  city: string;
  safe_aqi_limit: number;
  profile: UserProfile;
  notify_enabled: boolean;
  last_alert_status: string | null;
  updated_at: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toValidUuid(id: string): string {
  return UUID_REGEX.test(id) ? id : createCareSpaceId();
}

function fromCloudRow(row: CloudCareSpaceRow): CareSpaceProfile {
  return {
    id: row.id,
    label: row.label,
    city: row.city,
    safeAqiLimit: row.safe_aqi_limit,
    profile: row.profile,
    notifyEnabled: row.notify_enabled,
    lastAlertStatus: row.last_alert_status,
    updatedAt: row.updated_at,
  };
}

function toCloudRow(userId: string, space: CareSpaceProfile): CloudCareSpaceRow {
  return {
    id: toValidUuid(space.id),
    user_id: userId,
    label: space.label,
    city: space.city,
    safe_aqi_limit: space.safeAqiLimit,
    profile: space.profile,
    notify_enabled: Boolean(space.notifyEnabled),
    last_alert_status: space.lastAlertStatus ?? null,
    updated_at: space.updatedAt || new Date().toISOString(),
  };
}

export async function upsertCareSpaceInCloud(
  userId: string,
  space: CareSpaceProfile
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  try {
    await supabase.from('care_spaces').upsert(toCloudRow(userId, space), {
      onConflict: 'id',
    });
  } catch (err) {
    console.warn('Cloud upsert failed:', err);
  }
}

export async function deleteCareSpaceInCloud(
  userId: string,
  spaceId: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase || !UUID_REGEX.test(spaceId)) return;
  try {
    await supabase
      .from('care_spaces')
      .delete()
      .eq('id', spaceId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('Cloud delete failed:', err);
  }
}

export async function syncCareSpacesOnSignIn(
  userId: string,
  localStore: CareSpacesStore | null
): Promise<CareSpacesStore | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return localStore;

  try {
    const { data, error } = await supabase
      .from('care_spaces')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true });

    if (error) {
      console.warn('Failed to fetch cloud care spaces:', error.message);
      return localStore;
    }

    const cloudRows = (data || []) as CloudCareSpaceRow[];
    const cloudSpaces = cloudRows.map(fromCloudRow);
    const localSpaces = localStore?.careSpaces || [];

    if (cloudSpaces.length === 0 && localSpaces.length > 0) {
      // First sign-in: migrate all guest local Care Spaces into Supabase
      const rowsToInsert = localSpaces.map((s) => toCloudRow(userId, s));
      await supabase
        .from('care_spaces')
        .upsert(rowsToInsert, { onConflict: 'id' });

      const migrated: CareSpacesStore = {
        careSpaces: rowsToInsert.map(fromCloudRow),
        activeCareSpaceId:
          rowsToInsert[0]?.id || localStore?.activeCareSpaceId || '',
      };
      saveCareSpaces(migrated);
      return migrated;
    }

    if (cloudSpaces.length > 0) {
      // Merge any non-duplicate local spaces into cloud
      const cloudKeySet = new Set(
        cloudSpaces.map(
          (s) => `${s.label.trim().toLowerCase()}|${s.city.trim().toLowerCase()}`
        )
      );
      const nonDuplicates = localSpaces.filter((s) => {
        const key = `${s.label.trim().toLowerCase()}|${s.city.trim().toLowerCase()}`;
        return !cloudKeySet.has(key);
      });

      if (nonDuplicates.length > 0) {
        const extraRows = nonDuplicates.map((s) => toCloudRow(userId, s));
        await supabase
          .from('care_spaces')
          .upsert(extraRows, { onConflict: 'id' });
        cloudSpaces.push(...extraRows.map(fromCloudRow));
      }

      const activeId =
        localStore?.activeCareSpaceId &&
        cloudSpaces.some((s) => s.id === localStore.activeCareSpaceId)
          ? localStore.activeCareSpaceId
          : cloudSpaces[0].id;

      const unified: CareSpacesStore = {
        careSpaces: cloudSpaces,
        activeCareSpaceId: activeId,
      };
      saveCareSpaces(unified);
      return unified;
    }

    return localStore;
  } catch (err) {
    console.warn('Cloud sync error:', err);
    return localStore;
  }
}

