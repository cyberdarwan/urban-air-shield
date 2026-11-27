'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { ActiveView } from '@/components/MenuDrawer';
import {
  createCareSpaceId,
  deleteCareSpaceInCloud,
  getDefaultSafeAqiLimit,
  loadCareSpaces,
  saveCareSpaces,
  syncCareSpacesOnSignIn,
  upsertCareSpaceInCloud,
} from '@/lib/care-spaces';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  AqiResponse,
  CareSpaceProfile,
  CareSpacesStore,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

/**
 * Manages SmogSense Care Space persistence, Supabase cloud sync, live telemetry fetching,
 * and AI recommendation state cleanly outside the root page shell.
 */
export function useCareSpaces() {
  const [hydrated, setHydrated] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const [store, setStore] = useState<CareSpacesStore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [simulateSevere, setSimulateSevere] = useState(false);
  const [aqiData, setAqiData] = useState<AqiResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationPayload | null>(null);
  const [recGeneratedBy, setRecGeneratedBy] = useState<string | null>(null);
  const [loadingAqi, setLoadingAqi] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();

    const runSync = async (signedInUser: User) => {
      if (!active) return;
      setSyncingCloud(true);
      try {
        const currentLocal = loadCareSpaces();
        const synced = await syncCareSpacesOnSignIn(
          signedInUser.id,
          currentLocal
        );
        if (active && synced) {
          setStore(synced);
          setShowLanding(false);
        }
      } finally {
        if (active) setSyncingCloud(false);
      }
    };

    const initializeSession = async () => {
      const loaded = loadCareSpaces();
      if (!active) return;

      if (loaded) {
        setStore(loaded);
        setShowLanding(false);
      }

      if (!supabase) {
        if (!loaded) setShowLanding(true);
        setHydrated(true);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;

      if (data.user) {
        setUser(data.user);
        setShowLanding(false);
        await runSync(data.user);
        if (active) setHydrated(true);
      } else {
        if (!loaded) setShowLanding(true);
        setHydrated(true);
      }
    };

    void Promise.resolve().then(initializeSession);

    if (!supabase) {
      return () => {
        active = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setShowLanding(false);
        void runSync(nextUser);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const activeCareSpace: CareSpaceProfile | null = store
    ? store.careSpaces.find((cs) => cs.id === store.activeCareSpaceId) ||
      store.careSpaces[0] ||
      null
    : null;

  const profile: UserProfile | null = activeCareSpace
    ? activeCareSpace.profile
    : null;

  const fetchTelemetryAndRecommendations = useCallback(
    async (
      activeProfile: UserProfile,
      severe: boolean,
      signal?: AbortSignal,
      bypassCache = false
    ) => {
      setLoadingAqi(true);
      setLoadingRecs(true);
      try {
        const params = new URLSearchParams();
        if (severe) params.set('simulate', 'severe');
        if (bypassCache) params.set('refresh', '1');
        if (activeProfile.location.city)
          params.set('city', activeProfile.location.city);
        if (activeProfile.location.town)
          params.set('town', activeProfile.location.town);

        const aqiRes = await fetch(`/api/aqi?${params.toString()}`, {
          cache: 'no-store',
          signal,
        });
        const aqiJson = (await aqiRes.json()) as AqiResponse;
        if (signal?.aborted) return;
        setAqiData(aqiJson);
        setLoadingAqi(false);

        const recRes = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal,
          body: JSON.stringify({
            profile: activeProfile,
            aqiData: aqiJson,
          }),
        });
        const recJson = await recRes.json();
        if (signal?.aborted) return;
        if (recJson?.recommendations) {
          setRecommendations(recJson.recommendations as RecommendationPayload);
          setRecGeneratedBy(recJson.generatedBy ?? null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Failed to sync air quality data:', err);
      } finally {
        if (!signal?.aborted) {
          setLoadingAqi(false);
          setLoadingRecs(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (profile && !editingProfile) {
      const controller = new AbortController();
      void Promise.resolve().then(() => {
        if (!controller.signal.aborted) {
          void fetchTelemetryAndRecommendations(
            profile,
            simulateSevere,
            controller.signal
          );
        }
      });
      return () => controller.abort();
    }
  }, [profile, editingProfile, simulateSevere, fetchTelemetryAndRecommendations]);

  const updateStore = (nextStore: CareSpacesStore) => {
    setStore(nextStore);
    saveCareSpaces(nextStore);
  };

  const handleProfileComplete = (nextProfile: UserProfile) => {
    setEditingProfile(false);
    setRecommendations(null);
    setRecGeneratedBy(null);

    if (!store || !activeCareSpace) {
      const initial: CareSpaceProfile = {
        id: createCareSpaceId(),
        label: 'My Home',
        city: nextProfile.location.city,
        safeAqiLimit: getDefaultSafeAqiLimit(nextProfile),
        profile: nextProfile,
        updatedAt: new Date().toISOString(),
      };
      updateStore({
        careSpaces: [initial],
        activeCareSpaceId: initial.id,
      });
      if (user) void upsertCareSpaceInCloud(user.id, initial);
      return;
    }

    const updatedSpace: CareSpaceProfile = {
      ...activeCareSpace,
      city: nextProfile.location.city,
      profile: nextProfile,
      updatedAt: new Date().toISOString(),
    };
    updateStore({
      careSpaces: store.careSpaces.map((cs) =>
        cs.id === activeCareSpace.id ? updatedSpace : cs
      ),
      activeCareSpaceId: activeCareSpace.id,
    });
    if (user) void upsertCareSpaceInCloud(user.id, updatedSpace);
  };

  const handleCityChange = (nextCity: string) => {
    if (!store || !activeCareSpace) return;
    const updatedProfile: UserProfile = {
      ...activeCareSpace.profile,
      location: { city: nextCity, town: undefined },
      updatedAt: new Date().toISOString(),
    };
    const updatedSpace: CareSpaceProfile = {
      ...activeCareSpace,
      city: nextCity,
      profile: updatedProfile,
      updatedAt: new Date().toISOString(),
    };
    setRecommendations(null);
    setRecGeneratedBy(null);
    updateStore({
      careSpaces: store.careSpaces.map((cs) =>
        cs.id === activeCareSpace.id ? updatedSpace : cs
      ),
      activeCareSpaceId: activeCareSpace.id,
    });
    if (user) void upsertCareSpaceInCloud(user.id, updatedSpace);
  };

  const handleSelectCareSpace = (id: string, switchToDashboard = false) => {
    if (!store) return;
    if (id !== store.activeCareSpaceId) {
      setRecommendations(null);
      setRecGeneratedBy(null);
      updateStore({ ...store, activeCareSpaceId: id });
    }
    if (switchToDashboard) setActiveView('dashboard');
  };

  const handleSaveCareSpace = (space: CareSpaceProfile) => {
    if (!store) {
      updateStore({ careSpaces: [space], activeCareSpaceId: space.id });
      if (user) void upsertCareSpaceInCloud(user.id, space);
      return;
    }
    const exists = store.careSpaces.some((cs) => cs.id === space.id);
    const nextSpaces = exists
      ? store.careSpaces.map((cs) => (cs.id === space.id ? space : cs))
      : [...store.careSpaces, space];

    if (space.id === store.activeCareSpaceId) {
      setRecommendations(null);
      setRecGeneratedBy(null);
    }
    updateStore({
      careSpaces: nextSpaces,
      activeCareSpaceId: store.activeCareSpaceId,
    });
    if (user) void upsertCareSpaceInCloud(user.id, space);
  };

  const handleDeleteCareSpace = (id: string) => {
    if (!store || store.careSpaces.length <= 1) return;
    const nextSpaces = store.careSpaces.filter((cs) => cs.id !== id);
    const nextActiveId =
      store.activeCareSpaceId === id
        ? nextSpaces[0].id
        : store.activeCareSpaceId;
    if (store.activeCareSpaceId === id) {
      setRecommendations(null);
      setRecGeneratedBy(null);
    }
    updateStore({ careSpaces: nextSpaces, activeCareSpaceId: nextActiveId });
    if (user) void deleteCareSpaceInCloud(user.id, id);
  };

  const handleToggleNotify = (spaceId: string, enabled: boolean) => {
    if (!store) return;
    const target = store.careSpaces.find((cs) => cs.id === spaceId);
    if (!target) return;
    const updated: CareSpaceProfile = {
      ...target,
      notifyEnabled: enabled,
      updatedAt: new Date().toISOString(),
    };
    updateStore({
      careSpaces: store.careSpaces.map((cs) =>
        cs.id === spaceId ? updated : cs
      ),
      activeCareSpaceId: store.activeCareSpaceId,
    });
    if (user) void upsertCareSpaceInCloud(user.id, updated);
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setSyncingCloud(true);
    try {
      const synced = await syncCareSpacesOnSignIn(user.id, store);
      if (synced) setStore(synced);
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  return {
    hydrated,
    showLanding,
    setShowLanding,
    store,
    user,
    syncingCloud,
    editingProfile,
    setEditingProfile,
    activeView,
    setActiveView,
    drawerOpen,
    setDrawerOpen,
    simulateSevere,
    setSimulateSevere,
    activeCareSpace,
    profile,
    aqiData,
    recommendations,
    recGeneratedBy,
    loadingAqi,
    loadingRecs,
    fetchTelemetryAndRecommendations,
    handleProfileComplete,
    handleCityChange,
    handleSelectCareSpace,
    handleSaveCareSpace,
    handleDeleteCareSpace,
    handleToggleNotify,
    handleSyncNow,
    handleSignOut,
  };
}
