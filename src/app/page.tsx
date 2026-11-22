'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
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

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-24 space-y-6">
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
        />
      </div>
      <ExpertChatBox profile={profile} aqiData={aqiData} />
    </main>
  );
}
