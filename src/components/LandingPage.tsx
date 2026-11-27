'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  MessageSquare,
  ShieldCheck,
  Users,
  Wind,
} from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface LandingPageProps {
  hasExistingProfile: boolean;
  onContinueAsGuest: () => void;
}

const PREVIEW_SCENARIOS = [
  {
    id: 'home',
    label: 'My Home',
    city: 'Hyderabad',
    aqi: 68,
    limit: 100,
    status: 'Safe to Move Out',
    statusTone: 'safe' as const,
    verdict:
      'Afternoon sun has cleared morning haze. Open cross-windows until 4:30 PM.',
    detail: 'Kids Under 10 · Safe Limit ≤ 100 AQI',
  },
  {
    id: 'parents',
    label: "Parents' Place",
    city: 'Lucknow',
    aqi: 148,
    limit: 100,
    status: 'Caution · Morning Walk',
    statusTone: 'caution' as const,
    verdict:
      'Delay 7 AM park walk—shift to 1:00 PM sunshine or indoor stretching.',
    detail: 'Seniors (60+) · Safe Limit ≤ 100 AQI',
  },
  {
    id: 'commute',
    label: 'Daily Commute',
    city: 'New Delhi',
    aqi: 238,
    limit: 200,
    status: 'Mask Recommended',
    statusTone: 'caution' as const,
    verdict:
      'Two-wheeler rush hour: wear snug N95 + visor down, rinse nose after ride.',
    detail: 'Two-Wheeler / Bike · Evening Rush',
  },
];

export default function LandingPage({
  hasExistingProfile,
  onContinueAsGuest,
}: LandingPageProps) {
  const [showSignIn, setShowSignIn] = useState(false);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScenarioIdx((prev) => (prev + 1) % PREVIEW_SCENARIOS.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const activeScenario = PREVIEW_SCENARIOS[activeScenarioIdx];

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-[#FAF9F6] text-[#0F172A]"
    >
      {/* Animated Ambient Radial Gradient Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="animate-drift-slow absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[#10B981]/15 blur-3xl" />
        <div className="animate-drift-reverse absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#F59E0B]/12 blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
        {/* Top Brand Bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm flex items-center justify-center text-[#059669]">
              <Wind className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-[#0F172A]">
                SmogSense
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-[#475569]">
                Urban Air &amp; Harm-Reduction Assistant
              </span>
            </div>
          </div>

          {!showSignIn ? (
            <button
              type="button"
              onClick={() => setShowSignIn(true)}
              className="text-xs sm:text-sm font-medium text-[#0F172A] px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#E7E5E0] hover:border-[#059669] transition-colors cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSignIn(false)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#475569] hover:text-[#0F172A] cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Overview
            </button>
          )}
        </header>

        {showSignIn ? (
          /* Dedicated Passwordless Sign-In View */
          <section className="max-w-md mx-auto rounded-3xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                Cloud Sync &amp; Threshold Alerts
              </span>
              <h1 className="text-xl font-bold text-[#0F172A]">
                Sign In &amp; Sync Your Care Spaces
              </h1>
              <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                Keep your family Care Spaces in sync across laptop and phone,
                and enable browser AQI threshold alerts.
              </p>
            </div>

            {!supabaseReady ? (
              <div className="rounded-2xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2 text-xs text-[#475569]">
                <p className="font-semibold text-[#0F172A]">
                  Cloud Sign-In Not Configured Yet
                </p>
                <p>
                  Supabase environment variables are not set in this
                  environment. You can use all SmogSense features immediately in
                  Guest Mode.
                </p>
                <button
                  type="button"
                  onClick={onContinueAsGuest}
                  className="mt-2 w-full py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue as Guest
                </button>
              </div>
            ) : (
              <AuthForm layout="stacked" dividerText="Or email magic link" />
            )}

            <div className="pt-2 border-t border-[#E7E5E0] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowSignIn(false)}
                className="text-[#475569] hover:text-[#0F172A] font-medium cursor-pointer"
              >
                ← Back to Overview
              </button>
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-[#059669] hover:underline font-medium cursor-pointer"
              >
                Continue as Guest
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Hero Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm text-xs font-medium text-[#059669]">
                  <span className="h-2 w-2 rounded-full bg-[#059669]" />
                  Live OpenAQ v3 &amp; CPCB Reference Stations across India
                </div>

                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#0F172A] leading-[1.12]">
                  Practical air guidance for your real daily routine.
                </h1>

                <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl">
                  Raw AQI numbers don&apos;t tell you when to open windows, how
                  to ride a bike safely through rush hour, or whether your
                  parents can take their morning walk. SmogSense turns live
                  city readings into clear, jargon-free harm-reduction steps.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <span>
                      {hasExistingProfile
                        ? 'Open My Dashboard'
                        : 'Continue as Guest'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSignIn(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/80 backdrop-blur-md border border-[#E7E5E0] hover:border-[#0F172A]/40 text-[#0F172A] font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                  >
                    <Cloud className="h-4 w-4 text-[#059669]" aria-hidden="true" />
                    Sign In &amp; Sync
                  </button>
                </div>

                <p className="text-xs text-[#475569]">
                  Zero login required to start · Your Care Spaces stay private in
                  your browser until you choose to sync.
                </p>
              </div>

              {/* Animated Atmospheric Hero Visual */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 sm:p-7 overflow-hidden space-y-5">
                  {/* Animated Atmospheric Waves SVG */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-40 overflow-hidden"
                  >
                    <svg
                      viewBox="0 0 600 120"
                      className="animate-wave-float w-[115%] h-full"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,64 C120,24 220,104 340,64 C460,24 520,88 600,56 L600,120 L0,120 Z"
                        fill="#10B981"
                        fillOpacity="0.18"
                      />
                      <path
                        d="M0,84 C140,48 260,112 380,76 C490,44 550,92 600,72 L600,120 L0,120 Z"
                        fill="#F59E0B"
                        fillOpacity="0.16"
                      />
                    </svg>
                  </div>

                  {/* Pulsing AQI Safety Ring + Status */}
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                        <span
                          className={`animate-pulse-ring absolute inset-0 rounded-full ${
                            activeScenario.statusTone === 'safe'
                              ? 'bg-[#10B981]/30'
                              : 'bg-[#F59E0B]/30'
                          }`}
                        />
                        <div
                          className={`relative h-14 w-14 rounded-full border-2 flex flex-col items-center justify-center bg-white ${
                            activeScenario.statusTone === 'safe'
                              ? 'border-[#059669] text-[#059669]'
                              : 'border-[#D97706] text-[#D97706]'
                          }`}
                        >
                          <span className="text-lg font-bold leading-none tabular-nums">
                            {activeScenario.aqi}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wider">
                            AQI
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                          {activeScenario.city}
                        </div>
                        <div className="text-base font-bold text-[#0F172A]">
                          {activeScenario.label}
                        </div>
                        <span
                          className={`inline-block mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            activeScenario.statusTone === 'safe'
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                              : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                          }`}
                        >
                          {activeScenario.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live-Cycling Verdict Card */}
                  <div className="relative rounded-2xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#475569]">
                      {activeScenario.detail}
                    </div>
                    <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed font-medium">
                      &ldquo;{activeScenario.verdict}&rdquo;
                    </p>
                  </div>

                  {/* Scenario Switcher Pills */}
                  <div className="relative flex flex-wrap gap-2">
                    {PREVIEW_SCENARIOS.map((sc, idx) => (
                      <button
                        key={sc.id}
                        type="button"
                        aria-pressed={idx === activeScenarioIdx}
                        onClick={() => setActiveScenarioIdx(idx)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          idx === activeScenarioIdx
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-white text-[#475569] border-[#E7E5E0] hover:text-[#0F172A]'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Bento Feature Highlights (3 Concise Cards) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Personalized Safe Limits
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Custom AQI ceilings tailored for kids, seniors, asthma, sinus
                  allergies, and daily two-wheeler or car commutes.
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Multi-City Family Care Spaces
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Track air quality for My Home, Parents&apos; Place, and
                  College across 60+ Indian cities—plus one-tap WhatsApp briefs.
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#0284C7]">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                </div>
                <h2 className="text-base font-bold text-[#0F172A]">
                  Zero-Panic AI Air Expert
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Harm-reduction guidance powered by Gemini and live OpenAQ v3
                  stations—never generic &ldquo;stay indoors&rdquo; textbook
                  advice.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
