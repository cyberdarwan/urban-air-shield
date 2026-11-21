'use client';

import React from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock,
  Flame,
  HeartPulse,
  Home,
  MapPin,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react';
import { buildHourlyTimeline } from '@/lib/aqi-utils';
import type {
  AqiCategory,
  AqiResponse,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

interface DashboardProps {
  profile: UserProfile;
  aqiData: AqiResponse | null;
  recommendations: RecommendationPayload | null;
  loadingAqi: boolean;
  loadingRecs: boolean;
  simulateSevere: boolean;
  onToggleSimulate: () => void;
  onRefresh: () => void;
  onEditProfile: () => void;
}

function getHeroGradient(category?: AqiCategory): string {
  switch (category) {
    case 'Good':
      return 'from-emerald-600 via-teal-700 to-slate-900';
    case 'Satisfactory':
      return 'from-sky-600 via-cyan-700 to-slate-900';
    case 'Moderate':
      return 'from-amber-600 via-orange-700 to-slate-900';
    case 'Poor':
      return 'from-orange-600 via-red-700 to-slate-900';
    case 'Very Poor':
      return 'from-rose-700 via-red-900 to-slate-950';
    case 'Severe':
      return 'from-red-900 via-rose-950 to-slate-950';
    default:
      return 'from-slate-800 via-slate-900 to-slate-950';
  }
}

export default function Dashboard({
  profile,
  aqiData,
  recommendations,
  loadingAqi,
  loadingRecs,
  simulateSevere,
  onToggleSimulate,
  onRefresh,
  onEditProfile,
}: DashboardProps) {
  const timeline = aqiData ? buildHourlyTimeline(aqiData.aqi) : [];

  const formattedTime = aqiData?.timestamp
    ? new Date(aqiData.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Syncing...';

  const profileSummaryTags = [
    ...(profile.travelModes || []).slice(0, 2),
    ...(profile.healthSensitivities || []).filter((s) => s !== 'None').slice(0, 1),
    ...(profile.existingProtection || []).slice(0, 1),
  ];

  return (
    <div className="space-y-6">
      {/* Top Weather App Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Wind className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                SmogSense
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {profile.mode}
              </span>
              {profileSummaryTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              <span>
                {[profile.location.town, profile.location.city]
                  .filter(Boolean)
                  .join(', ') || 'Urban Station'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleSimulate}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              simulateSevere
                ? 'bg-rose-500/20 text-rose-200 border-rose-400/60 shadow-lg shadow-rose-500/15'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            <Flame
              className={`h-3.5 w-3.5 ${
                simulateSevere ? 'text-rose-400' : 'text-slate-400'
              }`}
            />
            {simulateSevere ? 'Severe Smog: ON (432)' : 'Simulate Severe Smog'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingAqi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-700 hover:border-slate-500 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingAqi ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30 hover:bg-sky-500/25 transition cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Edit Routine
          </button>
        </div>
      </header>

      {/* Hero Weather-Style AQI Card */}
      <section
        className={`relative rounded-3xl bg-gradient-to-br ${getHeroGradient(
          aqiData?.category
        )} p-6 sm:p-8 border border-white/10 shadow-2xl overflow-hidden`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/30 text-white/90 border border-white/15 backdrop-blur-sm">
                <MapPin className="h-3.5 w-3.5" />
                {aqiData?.stationName || 'Loading station...'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/25 text-white/80 border border-white/10">
                <Clock className="h-3.5 w-3.5" />
                {formattedTime}
              </span>
              {aqiData?.source && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 text-white/90">
                  {aqiData.source}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-4 pt-1">
              <div className="text-6xl sm:text-7xl font-black tracking-tight text-white tabular-nums">
                {loadingAqi || !aqiData ? '---' : aqiData.aqi}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/70 font-semibold">
                  Air Quality Index
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {aqiData?.category || 'Fetching...'}
                </div>
              </div>
            </div>

            {aqiData?.advisories?.[0] && (
              <p className="text-sm text-white/85 max-w-2xl leading-relaxed">
                <span className="font-semibold text-white">
                  {aqiData.advisories[0].stage}:
                </span>{' '}
                {aqiData.advisories[0].summary}
              </p>
            )}
          </div>

          {/* Pollutant Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 min-w-[260px]">
            {[
              { label: 'PM2.5', val: aqiData?.pollutants.pm25, unit: 'µg/m³' },
              { label: 'PM10', val: aqiData?.pollutants.pm10, unit: 'µg/m³' },
              { label: 'NO₂', val: aqiData?.pollutants.no2, unit: 'µg/m³' },
              { label: 'O₃', val: aqiData?.pollutants.o3, unit: 'µg/m³' },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-2xl bg-black/25 border border-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="text-xs font-medium text-white/70">
                  {p.label}
                </div>
                <div className="text-xl font-bold text-white mt-0.5 tabular-nums">
                  {p.val ?? '--'}{' '}
                  <span className="text-xs font-normal text-white/60">
                    {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plain-English Clock Windows + Hourly Timeline */}
      <section className="rounded-3xl bg-slate-900/85 border border-slate-800 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Today&apos;s Best &amp; Worst Hours
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Afternoon sun clears ground smoke; early morning &amp; night trap it
          </span>
        </div>

        {recommendations?.clockWindows && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Sun className="h-4 w-4" />
                Best Window to Step Out
              </div>
              <div className="text-lg font-bold text-white">
                {recommendations.clockWindows.bestWindowToStepOut}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {recommendations.clockWindows.bestWindowReason}
              </p>
            </div>

            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                <AlertTriangle className="h-4 w-4" />
                Peak Smoke Hours
              </div>
              <div className="text-lg font-bold text-white">
                {recommendations.clockWindows.peakSmokeHours}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {recommendations.clockWindows.peakSmokeReason}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2.5">
          {timeline.map((slot) => {
            const pillClass =
              slot.status === 'Safe Window'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : slot.status === 'Peak Smog'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200';

            return (
              <div
                key={slot.hourLabel}
                className={`rounded-2xl border p-3 text-center ${pillClass}`}
              >
                <div className="text-xs font-semibold opacity-80">
                  {slot.hourLabel}
                </div>
                <div className="text-lg font-bold text-white my-1 tabular-nums">
                  {slot.estimatedAqi}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide">
                  {slot.status}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* GenAI Harm-Reduction Plan */}
      {loadingRecs && !recommendations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 h-56 animate-pulse space-y-3"
            >
              <div className="h-4 w-40 bg-slate-800 rounded" />
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-5/6 bg-slate-800 rounded" />
              <div className="h-3 w-4/6 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : recommendations ? (
        <div className="space-y-5">
          {/* Today's Practical Moves (Full-width structured card) */}
          <section className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Today&apos;s Practical Moves
                  </h3>
                  <p className="text-xs text-slate-400">
                    Realistic harm-reduction steps for your exact routine today
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full self-start sm:self-auto">
                Immediate Actions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
                  <Bus className="h-4 w-4" />
                  On the Move
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {recommendations.todaysPracticalMoves.onTheMove}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  <Home className="h-4 w-4" />
                  At Home
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {recommendations.todaysPracticalMoves.atHome}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                  <HeartPulse className="h-4 w-4" />
                  For Your Household
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {recommendations.todaysPracticalMoves.forYourHousehold}
                </p>
              </div>
            </div>

            {recommendations.todaysPracticalMoves.quickChecklist?.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  Quick Checklist for Today
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.todaysPracticalMoves.quickChecklist.map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-200 bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-800"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Regional Advisory Card: CAQM GRAP (New Delhi/NCR) vs CPCB Citizen Guidance (All Other Cities) */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">
                    {recommendations.officialWarnings.advisoryTitle}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {recommendations.officialWarnings.stageOrLevel}
                </span>
              </div>

              <p className="text-sm font-medium text-slate-200">
                {recommendations.officialWarnings.headline}
              </p>

              <ul className="space-y-2">
                {recommendations.officialWarnings.bullets.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Future Lifestyle Upgrades (Optional, Low-Pressure) */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-base">
                    Future Lifestyle Upgrades
                  </h3>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Optional · Gradual
                </span>
              </div>

              <p className="text-xs text-slate-400">
                {recommendations.futureLifestyleUpgrades.summary}
              </p>

              <div className="space-y-3">
                {recommendations.futureLifestyleUpgrades.upgrades.map(
                  (upg, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-3.5 space-y-1.5"
                    >
                      <div className="font-semibold text-xs text-white">
                        {upg.title}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {upg.description}
                      </p>
                      <p className="text-[11px] text-emerald-300">
                        Why it helps: {upg.whyItHelps}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
