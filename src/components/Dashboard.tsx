'use client';

import React from 'react';
import {
  AlertTriangle,
  Bus,
  Clock,
  Flame,
  HeartPulse,
  Home,
  Leaf,
  MapPin,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
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

  return (
    <div className="space-y-6">
      {/* Top Weather App Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Wind className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                SmogSense
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {profile.mode}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-sky-400" />
              <span>
                {[profile.location.town, profile.location.city, profile.location.state]
                  .filter(Boolean)
                  .join(', ') || 'Urban Station'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Severe Smog Simulator Toggle */}
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
            Edit Profile
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

      {/* Hourly Safe-Window Timeline */}
      <section className="rounded-3xl bg-slate-900/85 border border-slate-800 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Diurnal Winter Smog & Safe-Window Timeline
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Midday solar mixing (12:00-16:00) typically offers lowest ground-level PM2.5
          </span>
        </div>

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

      {/* 4 Structured GenAI Cards */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Official Warnings */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Official Warnings & GRAP
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {recommendations.officialWarnings.grapStage}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-200">
              {recommendations.officialWarnings.headline}
            </p>

            <ul className="space-y-2">
              {recommendations.officialWarnings.restrictions.map((item, idx) => (
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

          {/* Card 2: Health Hazard Impact */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Health Hazard Impact
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {recommendations.healthHazardImpact.riskLevel}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {recommendations.healthHazardImpact.summary}
            </p>

            <div className="space-y-2.5">
              {recommendations.healthHazardImpact.groupImpacts.map((g, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">
                      {g.group}
                    </span>
                    <span className="text-[11px] font-semibold text-rose-300">
                      {g.risk}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{g.guidance}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Commute & Transport Plan */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Bus className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Commute & Transport Plan
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                Gemini Plan
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-3">
                <div className="font-semibold text-white mb-0.5">Today</div>
                <p>{recommendations.commuteAndTransportPlan.dayPlan}</p>
              </div>
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-3">
                <div className="font-semibold text-white mb-0.5">This Week</div>
                <p>{recommendations.commuteAndTransportPlan.weekPlan}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {recommendations.commuteAndTransportPlan.safeTimeWindows.map(
                (w, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                  >
                    {w}
                  </span>
                )
              )}
            </div>

            <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-slate-800">
              <div>
                <span className="font-semibold text-white">Mask Guidance: </span>
                {recommendations.commuteAndTransportPlan.maskGuidance}
              </div>
              <div className="text-emerald-300">
                <span className="font-semibold">Emission Savings: </span>
                {recommendations.commuteAndTransportPlan.emissionSavings}
              </div>
            </div>
          </div>

          {/* Card 4: Subtle Household Changes */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Home className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-base">
                  Subtle Household Changes
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {profile.budget}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {recommendations.subtleHouseholdChanges.summary}
            </p>

            <div className="space-y-3">
              {recommendations.subtleHouseholdChanges.adjustments.map(
                (adj, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-800/60 border border-slate-700/70 p-3.5 space-y-2"
                  >
                    <div className="font-semibold text-xs text-white">
                      {adj.title}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {adj.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25">
                        -{adj.exposureDropPercent}% Exposure
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        <Leaf className="h-3 w-3" />
                        {adj.co2SavedKgPerWeek} kg CO₂/wk saved
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
