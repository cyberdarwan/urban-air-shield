'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Menu, Wind } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
import FamilyProfilesView from '@/components/FamilyProfilesView';
import HelpGuideView from '@/components/HelpGuideView';
import MenuDrawer, { type ActiveView } from '@/components/MenuDrawer';
import OnboardingWizard from '@/components/OnboardingWizard';
import {
  createCareSpaceId,
  getDefaultSafeAqiLimit,
  loadCareSpaces,
  saveCareSpaces,
} from '@/lib/care-spaces';
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
  const [store, setStore] = useState<CareSpacesStore | null>(null);
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
    }
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
  };

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
    <main className="min-h-screen bg-[#FAF9F6] text-[#1C1B18]">
      <MenuDrawer
        open={drawerOpen}
        activeView={activeView}
        activeCity={activeCareSpace.city}
        careSpaceCount={store.careSpaces.length}
        onSelectView={setActiveView}
        onClose={() => setDrawerOpen(false)}
        onEditProfile={() => setEditingProfile(true)}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 space-y-6">
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
            onToggleSimulate={() => setSimulateSevere((prev) => !prev)}
            onRefresh={() =>
              fetchTelemetryAndRecommendations(profile, simulateSevere)
            }
            onEditProfile={() => setEditingProfile(true)}
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
                  className="h-9 w-9 rounded-xl bg-[#FFFFFF] border border-[#E7E5E0] hover:border-[#1C1B18]/40 flex items-center justify-center text-[#1C1B18] transition-colors cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-[#6B6860]" />
                  <h1 className="text-lg font-bold tracking-tight text-[#1C1B18]">
                    {VIEW_TITLES[activeView]}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#1C1B18]/40 transition-colors cursor-pointer"
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
              <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F2ED] text-[#6B6860] border border-[#E7E5E0] mb-1">
                      Phases 3–4 Preview
                    </span>
                    <h2 className="text-base font-bold text-[#1C1B18]">
                      Account Sync &amp; Threshold Alerts
                    </h2>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#6B6860] leading-relaxed">
                  Currently your Care Spaces are stored privately in your
                  browser with zero login required. In upcoming phases, you&apos;ll
                  be able to sign in to sync profiles across devices and set
                  custom AQI threshold alerts for your family&apos;s cities.
                </p>
              </section>
            )}
          </>
        )}
      </div>
      <ExpertChatBox profile={profile} aqiData={aqiData} />
    </main>
  );
}
