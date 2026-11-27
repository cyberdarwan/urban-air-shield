import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateBrowserClient: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: mockCreateBrowserClient,
}));

import {
  CARE_SPACES_STORAGE_KEY,
  LEGACY_PROFILE_STORAGE_KEY,
  createCareSpaceId,
  deleteCareSpaceInCloud,
  getDefaultSafeAqiLimit,
  isValidMultiSelectProfile,
  loadCareSpaces,
  saveCareSpaces,
  shareViaWhatsApp,
  syncCareSpacesOnSignIn,
  upsertCareSpaceInCloud,
} from '@/lib/care-spaces';
import type { CareSpaceProfile, UserProfile } from '@/types/air-quality';

const validProfile: UserProfile = {
  mode: 'personal',
  location: { city: 'Hyderabad', town: 'Jubilee Hills' },
  stepOutWindows: ['Early Morning (6–9 AM)'],
  travelModes: ['AC Car / Cab'],
  householdMembers: ['Just Me'],
  healthSensitivities: ['None'],
  homeSurroundings: ['Quiet Residential / Gated'],
  existingProtection: ['Air Purifier'],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleSpace: CareSpaceProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  label: 'My Home',
  city: 'Hyderabad',
  safeAqiLimit: 150,
  profile: validProfile,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('care-spaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates valid UUIDs and computes default safe AQI ceilings based on sensitivity', () => {
    const id = createCareSpaceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    expect(getDefaultSafeAqiLimit(validProfile)).toBe(150);
    expect(
      getDefaultSafeAqiLimit({
        ...validProfile,
        householdMembers: ['Kids Under 10'],
      })
    ).toBe(100);
    expect(
      getDefaultSafeAqiLimit({
        ...validProfile,
        healthSensitivities: ['Asthma / Wheezing'],
      })
    ).toBe(100);
  });

  it('validates multi-select profile structure strictly', () => {
    expect(isValidMultiSelectProfile(validProfile)).toBe(true);
    expect(isValidMultiSelectProfile(null)).toBe(false);
    expect(isValidMultiSelectProfile({ location: { city: '' } })).toBe(false);
  });

  it('saves and loads Care Spaces from localStorage and repairs stale activeCareSpaceId', () => {
    saveCareSpaces({
      careSpaces: [sampleSpace],
      activeCareSpaceId: sampleSpace.id,
    });
    expect(localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY)).toContain(
      'Hyderabad'
    );

    saveCareSpaces({
      careSpaces: [sampleSpace],
      activeCareSpaceId: 'non-existent-id',
    });
    const loaded = loadCareSpaces();
    expect(loaded?.careSpaces).toHaveLength(1);
    expect(loaded?.activeCareSpaceId).toBe(sampleSpace.id);
  });

  it('migrates legacy single-profile storage into an initial My Home Care Space and clears corrupt data', () => {
    localStorage.setItem(
      LEGACY_PROFILE_STORAGE_KEY,
      JSON.stringify({
        ...validProfile,
        householdMembers: ['Seniors (60+)'],
      })
    );

    const migrated = loadCareSpaces();
    expect(migrated?.careSpaces).toHaveLength(1);
    expect(migrated?.careSpaces[0].label).toBe('My Home');
    expect(migrated?.careSpaces[0].safeAqiLimit).toBe(100);

    // Corrupt legacy profile is removed cleanly
    localStorage.clear();
    localStorage.setItem(LEGACY_PROFILE_STORAGE_KEY, JSON.stringify({ bad: 1 }));
    expect(loadCareSpaces()).toBeNull();
    expect(localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY)).toBeNull();

    // Invalid JSON in care spaces store fails safely
    localStorage.setItem(CARE_SPACES_STORAGE_KEY, '{broken-json');
    expect(loadCareSpaces()).toBeNull();
  });

  it('opens WhatsApp popup when allowed or falls back to clipboard when blocked', async () => {
    const openSpy = vi
      .spyOn(window, 'open')
      .mockReturnValue({} as Window);
    expect(await shareViaWhatsApp('Hello Air')).toBe('whatsapp');
    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/?text=Hello%20Air',
      '_blank',
      'noopener,noreferrer'
    );

    openSpy.mockReturnValue(null);
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    expect(await shareViaWhatsApp('Fallback Brief')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Fallback Brief');
  });

  it('upserts and deletes Care Spaces in Supabase cloud safely', async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const eqUserMock = vi.fn(async () => ({ error: null }));
    const eqIdMock = vi.fn(() => ({ eq: eqUserMock }));

    mockCreateBrowserClient.mockReturnValue({
      from: vi.fn(() => ({
        upsert: upsertMock,
        delete: vi.fn(() => ({ eq: eqIdMock })),
      })),
    });

    await upsertCareSpaceInCloud('user-1', sampleSpace);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    await deleteCareSpaceInCloud('user-1', sampleSpace.id);
    expect(eqIdMock).toHaveBeenCalledWith('id', sampleSpace.id);
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1');

    // Ignores non-UUID space IDs on delete
    await deleteCareSpaceInCloud('user-1', 'not-a-uuid');
    expect(eqIdMock).toHaveBeenCalledTimes(1);
  });

  it('migrates guest Care Spaces on first sign-in and merges non-duplicates on subsequent sign-in', async () => {
    // Case 1: Cloud is empty -> migrate local guest spaces
    const firstUpsert = vi.fn(async () => ({ error: null }));
    mockCreateBrowserClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [], error: null })),
          })),
        })),
        upsert: firstUpsert,
      })),
    });

    const firstSync = await syncCareSpacesOnSignIn('user-1', {
      careSpaces: [{ ...sampleSpace, id: 'legacy-non-uuid' }],
      activeCareSpaceId: 'legacy-non-uuid',
    });

    expect(firstUpsert).toHaveBeenCalledTimes(1);
    expect(firstSync?.careSpaces).toHaveLength(1);
    expect(firstSync?.careSpaces[0].id).toMatch(/^[0-9a-f-]{36}$/i);

    // Case 2: Cloud has My Home; local has duplicate My Home + new Parents' Place
    const secondUpsert = vi.fn(async () => ({ error: null }));
    const cloudRow = {
      id: sampleSpace.id,
      user_id: 'user-1',
      label: 'My Home',
      city: 'Hyderabad',
      safe_aqi_limit: 150,
      profile: validProfile,
      notify_enabled: true,
      last_alert_status: 'safe',
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    mockCreateBrowserClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: [cloudRow], error: null })),
          })),
        })),
        upsert: secondUpsert,
      })),
    });

    const parentsSpace: CareSpaceProfile = {
      ...sampleSpace,
      id: '22222222-2222-4222-8222-222222222222',
      label: "Parents' Place",
      city: 'Lucknow',
      safeAqiLimit: 100,
    };

    const merged = await syncCareSpacesOnSignIn('user-1', {
      careSpaces: [sampleSpace, parentsSpace],
      activeCareSpaceId: sampleSpace.id,
    });

    expect(secondUpsert).toHaveBeenCalledTimes(1);
    expect(merged?.careSpaces).toHaveLength(2);
    expect(merged?.careSpaces.map((s) => s.label)).toEqual([
      'My Home',
      "Parents' Place",
    ]);
  });

  it('returns localStore unchanged when Supabase is unconfigured or query fails', async () => {
    const localStore = {
      careSpaces: [sampleSpace],
      activeCareSpaceId: sampleSpace.id,
    };

    mockCreateBrowserClient.mockReturnValue(null);
    expect(await syncCareSpacesOnSignIn('user-1', localStore)).toEqual(
      localStore
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockCreateBrowserClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({
              data: null,
              error: { message: 'db unavailable' },
            })),
          })),
        })),
      })),
    });
    expect(await syncCareSpacesOnSignIn('user-1', localStore)).toEqual(
      localStore
    );
    warnSpy.mockRestore();
  });
});
