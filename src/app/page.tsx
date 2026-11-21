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

export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const [simulateSevere, setSimulateSevere] = useState(false);
  const [aqiData, setAqiData] = useState<AqiResponse | null>(null);
  const [recommendations, setRecommendations] =
    useState<RecommendationPayload | null>(null);
  const [loadingAqi, setLoadingAqi] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProfile(JSON.parse(saved) as UserProfile);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchTelemetryAndRecommendations = useCallback(
    async (activeProfile: UserProfile, severe: boolean) => {
      setLoadingAqi(true);
      setLoadingRecs(true);
      try {
        const params = new URLSearchParams();
        if (severe) params.set('simulate', 'severe');
        if (activeProfile.location.state)
          params.set('state', activeProfile.location.state);
        if (activeProfile.location.city)
          params.set('city', activeProfile.location.city);
        if (activeProfile.location.town)
          params.set('town', activeProfile.location.town);

        const aqiRes = await fetch(`/api/aqi?${params.toString()}`);
        const aqiJson = (await aqiRes.json()) as AqiResponse;
        setAqiData(aqiJson);
        setLoadingAqi(false);

        const recRes = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: activeProfile,
            aqiData: aqiJson,
          }),
        });
        const recJson = await recRes.json();
        if (recJson?.recommendations) {
          setRecommendations(recJson.recommendations as RecommendationPayload);
        }
      } catch (err) {
        console.error('Failed to sync air quality data:', err);
      } finally {
        setLoadingAqi(false);
        setLoadingRecs(false);
      }
    },
    []
  );

  useEffect(() => {
    if (profile && !editingProfile) {
      fetchTelemetryAndRecommendations(profile, simulateSevere);
    }
  }, [profile, editingProfile, simulateSevere, fetchTelemetryAndRecommendations]);

  const handleProfileComplete = (nextProfile: UserProfile) => {
    setProfile(nextProfile);
    setEditingProfile(false);
    setRecommendations(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <Dashboard
          profile={profile}
          aqiData={aqiData}
          recommendations={recommendations}
          loadingAqi={loadingAqi}
          loadingRecs={loadingRecs}
          simulateSevere={simulateSevere}
          onToggleSimulate={() => setSimulateSevere((prev) => !prev)}
          onRefresh={() =>
            fetchTelemetryAndRecommendations(profile, simulateSevere)
          }
          onEditProfile={() => setEditingProfile(true)}
        />
        <ExpertChatBox profile={profile} aqiData={aqiData} />
      </div>
    </main>
  );
}
