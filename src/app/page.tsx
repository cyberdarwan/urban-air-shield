'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Menu, Wind } from 'lucide-react';
import AccountAuthView from '@/components/AccountAuthView';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
import FamilyProfilesView from '@/components/FamilyProfilesView';
import HelpGuideView from '@/components/HelpGuideView';
import LandingPage from '@/components/LandingPage';
import MenuDrawer, { type ActiveView } from '@/components/MenuDrawer';
import OnboardingWizard from '@/components/OnboardingWizard';
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

const VIEW_TITLES: Record<Exclude<ActiveView, 'dashboard'>, string> = {
  profiles: 'Family Care Spaces',
  help: 'AQI Scale & Help',
  account: 'Account & Alerts',
};

export default function HomePage() {
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
    const loaded = loadCareSpaces();
    if (loaded) {
      setStore(loaded);
      setShowLanding(false);
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      if (!loaded) setShowLanding(true);
      setHydrated(true);
      return;
    }

    const runSync = async (signedInUser: User) => {
      setSyncingCloud(true);
      try {
        const currentLocal = loadCareSpaces();
        const synced = await syncCareSpacesOnSignIn(
          signedInUser.id,
          currentLocal
        );
        if (synced) {
          setStore(synced);
          setShowLanding(false);
        }
      } finally {
        setSyncingCloud(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setShowLanding(false);
        runSync(data.user).finally(() => setHydrated(true));
      } else {
        if (!loaded) setShowLanding(true);
        setHydrated(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        setShowLanding(false);
        runSync(nextUser);
      }
    });

    return () => subscription.unsubscribe();
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
      signal?: AbortSignal
    ) => {
      setLoadingAqi(true);
      setLoadingRecs(true);
      try {
        const params = new URLSearchParams();
        if (severe) params.set('simulate', 'severe');
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
      fetchTelemetryAndRecommendations(profile, simulateSevere, controller.signal);
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
      if (user) {
        upsertCareSpaceInCloud(user.id, initial);
      }
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
    if (user) {
      upsertCareSpaceInCloud(user.id, updatedSpace);
    }
  };

  const handleCityChange = (nextCity: string) => {
    if (!store || !activeCareSpace) return;
    const updatedProfile: UserProfile = {
      ...activeCareSpace.profile,
      location: {
        city: nextCity,
        town: undefined,
      },
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
    if (user) {
      upsertCareSpaceInCloud(user.id, updatedSpace);
    }
  };

  const handleSelectCareSpace = (id: string, switchToDashboard = false) => {
    if (!store) return;
    if (id !== store.activeCareSpaceId) {
      setRecommendations(null);
      setRecGeneratedBy(null);
      updateStore({
        ...store,
        activeCareSpaceId: id,
      });
    }
    if (switchToDashboard) {
      setActiveView('dashboard');
    }
  };

  const handleSaveCareSpace = (space: CareSpaceProfile) => {
    if (!store) {
      updateStore({
        careSpaces: [space],
        activeCareSpaceId: space.id,
      });
      if (user) {
        upsertCareSpaceInCloud(user.id, space);
      }
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
    if (user) {
      upsertCareSpaceInCloud(user.id, space);
    }
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
    updateStore({
      careSpaces: nextSpaces,
      activeCareSpaceId: nextActiveId,
    });
    if (user) {
      deleteCareSpaceInCloud(user.id, id);
    }
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
    if (user) {
      upsertCareSpaceInCloud(user.id, updated);
    }
  };

  const handleSyncNow = async () => {
    if (!user) return;
    setSyncingCloud(true);
    try {
      const synced = await syncCareSpacesOnSignIn(user.id, store);
      if (synced) {
        setStore(synced);
      }
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

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B6860]">
          <Wind className="h-4 w-4 animate-pulse" />
          Loading SmogSense...
        </div>
      </main>
    );
  }

  if (showLanding) {
    return (
      <LandingPage
        hasExistingProfile={Boolean(store && activeCareSpace)}
        onContinueAsGuest={() => {
          setShowLanding(false);
          if (!store || !activeCareSpace || !profile) {
            setEditingProfile(true);
          }
        }}
      />
    );
  }

  if (!store || !activeCareSpace || !profile || editingProfile) {
    return (
      <OnboardingWizard
        initialProfile={profile}
        onComplete={handleProfileComplete}
        onCancel={profile ? () => setEditingProfile(false) : undefined}
      />
    );
  }

  return (
    <main className="relative min-h-screen bg-[#FAF9F6] text-[#0F172A]">
      {/* Ambient Atmospheric Daylight Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-drift-slow absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
        <div className="animate-drift-reverse absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#F59E0B]/10 blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
      </div>

      <MenuDrawer
        open={drawerOpen}
        activeView={activeView}
        activeCity={activeCareSpace.city}
        careSpaceCount={store.careSpaces.length}
        userEmail={user?.email ?? null}
        loadingAqi={loadingAqi}
        simulateSevere={simulateSevere}
        onSelectView={setActiveView}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() =>
          fetchTelemetryAndRecommendations(profile, simulateSevere)
        }
        onToggleSimulate={() => setSimulateSevere((prev) => !prev)}
        onOpenLanding={() => setShowLanding(true)}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-28 space-y-6">
        {activeView === 'dashboard' ? (
          <Dashboard
            profile={profile}
            careSpaces={store.careSpaces}
            activeCareSpace={activeCareSpace}
            aqiData={aqiData}
            recommendations={recommendations}
            recGeneratedBy={recGeneratedBy}
            loadingAqi={loadingAqi}
            loadingRecs={loadingRecs}
            simulateSevere={simulateSevere}
            onCityChange={handleCityChange}
            onSelectCareSpace={(id) => handleSelectCareSpace(id, false)}
            onOpenMenu={() => setDrawerOpen(true)}
          />
        ) : (
          <>
            {/* Clean Top Bar for Secondary Views */}
            <header className="flex items-center justify-between gap-4 pb-3 border-b border-[#E7E5E0]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open navigation menu"
                  className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm flex items-center justify-center text-[#0F172A] transition-all cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-[#059669]" />
                  <h1 className="text-lg font-bold tracking-tight text-[#0F172A]">
                    {VIEW_TITLES[activeView]}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm transition-all cursor-pointer"
              >
                Back to Dashboard
              </button>
            </header>

            {activeView === 'help' && <HelpGuideView />}

            {activeView === 'profiles' && (
              <FamilyProfilesView
                careSpaces={store.careSpaces}
                activeCareSpaceId={store.activeCareSpaceId}
                onSelectSpace={handleSelectCareSpace}
                onSaveSpace={handleSaveCareSpace}
                onDeleteSpace={handleDeleteCareSpace}
              />
            )}

            {activeView === 'account' && (
              <AccountAuthView
                user={user}
                careSpaces={store.careSpaces}
                syncing={syncingCloud}
                onSyncNow={handleSyncNow}
                onToggleNotify={handleToggleNotify}
                onSignOut={handleSignOut}
              />
            )}
          </>
        )}
      </div>
      <ExpertChatBox
        profile={profile}
        activeCareSpace={activeCareSpace}
        aqiData={aqiData}
        recommendations={recommendations}
      />
    </main>
  );
}
