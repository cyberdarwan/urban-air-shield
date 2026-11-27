'use client';

import React from 'react';
import { Menu, Wind } from 'lucide-react';
import AccountAuthView from '@/components/AccountAuthView';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
import FamilyProfilesView from '@/components/FamilyProfilesView';
import HelpGuideView from '@/components/HelpGuideView';
import LandingPage from '@/components/LandingPage';
import MenuDrawer, { type ActiveView } from '@/components/MenuDrawer';
import OnboardingWizard from '@/components/OnboardingWizard';
import { useCareSpaces } from '@/hooks/useCareSpaces';

const VIEW_TITLES: Record<Exclude<ActiveView, 'dashboard'>, string> = {
  profiles: 'Family Care Spaces',
  help: 'AQI Scale & Help',
  account: 'Account & Alerts',
};

export default function HomePage() {
  const {
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
  } = useCareSpaces();

  if (!hydrated) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B6860]">
          <Wind className="h-4 w-4 animate-pulse" aria-hidden="true" />
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
    <main
      id="main-content"
      className="relative min-h-screen bg-[#FAF9F6] text-[#0F172A]"
    >
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
          void fetchTelemetryAndRecommendations(
            profile,
            simulateSevere,
            undefined,
            true
          )
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
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-[#059669]" aria-hidden="true" />
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
