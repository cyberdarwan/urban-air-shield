'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Menu, Users, Wind } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
import HelpGuideView from '@/components/HelpGuideView';
import MenuDrawer, { type ActiveView } from '@/components/MenuDrawer';
import OnboardingWizard from '@/components/OnboardingWizard';
import type {
  AqiResponse,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

const STORAGE_KEY = 'smogsense_profile_v1';

function isValidMultiSelectProfile(data: unknown): data is UserProfile {
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

const VIEW_TITLES: Record<Exclude<ActiveView, 'dashboard'>, string> = {
  profiles: 'Family Profiles',
  help: 'AQI Scale & Help',
  account: 'Account & Alerts',
};

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidMultiSelectProfile(parsed)) {
          setProfile(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

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

  const handleProfileComplete = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setEditingProfile(false);
    setRecommendations(null);
    setRecGeneratedBy(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    } catch {
      // ignore storage errors
    }
  };

  const handleCityChange = (nextCity: string) => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      location: {
        city: nextCity,
        town: undefined,
      },
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    setRecommendations(null);
    setRecGeneratedBy(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
  };

  if (!profile || editingProfile) {
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
        activeCity={profile.location.city}
        onSelectView={setActiveView}
        onClose={() => setDrawerOpen(false)}
        onEditProfile={() => setEditingProfile(true)}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 space-y-6">
        {activeView === 'dashboard' ? (
          <Dashboard
            profile={profile}
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
              <div className="space-y-5">
                <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#1C1B18]">
                          Active Routine Profile
                        </h2>
                        <p className="text-xs text-[#6B6860]">
                          {profile.location.city}
                          {profile.location.town ? ` · ${profile.location.town}` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingProfile(true)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1C1B18] text-white hover:bg-[#1C1B18]/90 transition-colors cursor-pointer"
                    >
                      Edit Routine
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-3.5">
                      <div className="font-semibold text-[#6B6860] uppercase tracking-wider text-[11px] mb-1">
                        When You Step Out
                      </div>
                      <div className="text-[#1C1B18]">
                        {profile.stepOutWindows.join(', ')}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-3.5">
                      <div className="font-semibold text-[#6B6860] uppercase tracking-wider text-[11px] mb-1">
                        How You Travel
                      </div>
                      <div className="text-[#1C1B18]">
                        {profile.travelModes.join(', ')}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-3.5">
                      <div className="font-semibold text-[#6B6860] uppercase tracking-wider text-[11px] mb-1">
                        Household &amp; Health
                      </div>
                      <div className="text-[#1C1B18]">
                        {[...profile.householdMembers, ...profile.healthSensitivities].join(', ')}
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-3.5">
                      <div className="font-semibold text-[#6B6860] uppercase tracking-wider text-[11px] mb-1">
                        Home &amp; Protection
                      </div>
                      <div className="text-[#1C1B18]">
                        {[...profile.homeSurroundings, ...profile.existingProtection].join(', ')}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-2">
                  <span className="inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F4F2ED] text-[#6B6860] border border-[#E7E5E0]">
                    Phase 2 Preview
                  </span>
                  <h3 className="text-sm font-bold text-[#1C1B18]">
                    Multi-Profile Care Spaces (Home, Parents&apos; Place, College)
                  </h3>
                  <p className="text-xs text-[#6B6860] leading-relaxed">
                    Soon you&apos;ll be able to save and switch between multiple
                    family care spaces—each with its own city, health sensitivities,
                    and daily commute routine.
                  </p>
                </section>
              </div>
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
                  Currently your routine profile is stored privately in your
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
