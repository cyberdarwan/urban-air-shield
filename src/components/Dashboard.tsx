'use client';

import React from 'react';
import {
  AlertTriangle,
  Clock,
  Flame,
  Menu,
  ShieldCheck,
  Sun,
  Wind,
} from 'lucide-react';
import CitySelector from '@/components/CitySelector';
import GuidanceSection from '@/components/GuidanceSection';
import HourlyAirWave from '@/components/HourlyAirWave';
import { buildHourlyTimeline, isAirSafe } from '@/lib/aqi-utils';
import type {
  AqiCategory,
  AqiResponse,
  CareSpaceProfile,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

interface DashboardProps {
  profile: UserProfile;
  careSpaces: CareSpaceProfile[];
  activeCareSpace: CareSpaceProfile;
  aqiData: AqiResponse | null;
  recommendations: RecommendationPayload | null;
  recGeneratedBy?: string | null;
  loadingAqi: boolean;
  loadingRecs: boolean;
  simulateSevere: boolean;
  onCityChange: (city: string) => void;
  onSelectCareSpace: (id: string) => void;
  onOpenMenu: () => void;
}

function getCpcbBadgeStyle(category?: AqiCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'Good':
    case 'Satisfactory':
      return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    case 'Moderate':
      return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
    case 'Poor':
      return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' };
    case 'Very Poor':
    case 'Severe':
      return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
    default:
      return { bg: '#FAF9F6', text: '#0F172A', border: '#E7E5E0' };
  }
}

export default function Dashboard({
  profile,
  careSpaces,
  activeCareSpace,
  aqiData,
  recommendations,
  recGeneratedBy,
  loadingAqi,
  loadingRecs,
  simulateSevere,
  onCityChange,
  onSelectCareSpace,
  onOpenMenu,
}: DashboardProps) {
  const timeline = aqiData ? buildHourlyTimeline(aqiData.aqi) : [];
  const badgeStyle = getCpcbBadgeStyle(aqiData?.category);

  const formattedIstTime = aqiData?.timestamp
    ? new Date(aqiData.timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' IST'
    : 'Syncing...';

  const isSafeToMove =
    aqiData !== null ? isAirSafe(aqiData.aqi, activeCareSpace.safeAqiLimit) : null;

  return (
    <div className="space-y-6">
      {/* Minimal Editorial Top Bar */}
      <header className="space-y-3 pb-3 border-b border-[#E7E5E0]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
            className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm flex items-center justify-center text-[#0F172A] transition-all cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
              <Wind className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
              SmogSense
            </h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-[#0F172A] border border-[#E7E5E0] shadow-sm">
              {activeCareSpace.label}
            </span>
          </div>

          <CitySelector
            value={profile.location.city}
            onChange={onCityChange}
            variant="compact"
          />

          {simulateSevere && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
              <Flame className="h-3 w-3" />
              Simulated Severe (432)
            </span>
          )}
        </div>

        <div className="text-xs text-[#475569]">
          {aqiData?.stationName || 'Loading station...'} · {formattedIstTime}
        </div>

        {/* Quick Care Space Switcher Pill Bar */}
        {careSpaces.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-[#475569] mr-1">
              Care Spaces:
            </span>
            {careSpaces.map((cs) => {
              const active = cs.id === activeCareSpace.id;
              return (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() => onSelectCareSpace(cs.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                      : 'bg-white/80 text-[#475569] border-[#E7E5E0] hover:border-[#D6D3CD] hover:text-[#0F172A]'
                  }`}
                >
                  {cs.label} · {cs.city}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Hero AQI Card */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.text,
                  borderColor: badgeStyle.border,
                }}
              >
                {aqiData?.category || 'Loading'} Air Quality
              </span>
              {aqiData?.debug && (
                <span
                  title={aqiData.debug.fallbackReason || undefined}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                    aqiData.debug.source === 'Fallback'
                      ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                      : 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      aqiData.debug.source === 'Fallback'
                        ? 'bg-[#D97706]'
                        : 'bg-[#059669]'
                    }`}
                  />
                  {aqiData.debug.source === 'Fallback'
                    ? 'Fallback Active'
                    : aqiData.debug.source}
                </span>
              )}
              {aqiData?.debug?.fallbackReason && (
                <span className="text-[11px] text-[#475569]">
                  ({aqiData.debug.fallbackReason})
                </span>
              )}
            </div>

            {/* Pulsing Safety Ring + Hero Score */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                <span
                  className={`animate-pulse-ring absolute inset-0 rounded-full ${
                    isSafeToMove === false
                      ? 'bg-[#E11D48]/25'
                      : 'bg-[#10B981]/30'
                  }`}
                />
                <div
                  className={`relative h-14 w-14 rounded-full border-2 flex items-center justify-center bg-white shadow-sm ${
                    isSafeToMove === false
                      ? 'border-[#E11D48] text-[#E11D48]'
                      : 'border-[#059669] text-[#059669]'
                  }`}
                >
                  {isSafeToMove === false ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <div className="text-5xl sm:text-7xl font-bold tracking-tight text-[#0F172A] tabular-nums">
                  {loadingAqi || !aqiData ? '---' : aqiData.aqi}
                </div>
                <div className="text-xs uppercase tracking-widest text-[#475569] font-semibold">
                  CPCB AQI
                </div>
              </div>
            </div>

            {/* Personal Movement Verdict */}
            {aqiData && isSafeToMove !== null && (
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border ${
                  isSafeToMove
                    ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                    : 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]'
                }`}
              >
                {isSafeToMove ? (
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {isSafeToMove
                    ? `Okay to Move Out (${aqiData.aqi} ≤ ${activeCareSpace.safeAqiLimit} limit)`
                    : `Caution: Delay Outdoor Activity (${aqiData.aqi} > ${activeCareSpace.safeAqiLimit} limit)`}
                </span>
              </div>
            )}

            <p className="text-sm sm:text-base text-[#0F172A] leading-relaxed">
              {recommendations?.heroVerdict ||
                aqiData?.advisories?.[0]?.summary ||
                'Syncing live air quality readings for your routine...'}
            </p>
          </div>

          {/* Horizontal Pollutant Pills */}
          <div className="flex flex-wrap lg:justify-end gap-2.5">
            {[
              { label: 'PM2.5', val: aqiData?.pollutants.pm25, unit: 'µg/m³' },
              { label: 'PM10', val: aqiData?.pollutants.pm10, unit: 'µg/m³' },
              { label: 'NO₂', val: aqiData?.pollutants.no2, unit: 'µg/m³' },
              { label: 'O₃', val: aqiData?.pollutants.o3, unit: 'µg/m³' },
              {
                label: 'CO',
                val: aqiData?.pollutants.co ?? 1.1,
                unit: 'mg/m³',
              },
              {
                label: 'SO₂',
                val: aqiData?.pollutants.so2 ?? 12,
                unit: 'µg/m³',
              },
            ].map((p) => (
              <div
                key={p.label}
                className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] hover:border-[#D6D3CD] hover:shadow-sm transition-all px-3.5 py-2.5 min-w-[92px]"
              >
                <div className="text-[11px] font-medium text-[#475569]">
                  {p.label}
                </div>
                <div className="text-base font-bold text-[#0F172A] tabular-nums mt-0.5">
                  {p.val ?? '--'}{' '}
                  <span className="text-[11px] font-normal text-[#475569]">
                    {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clock-Hour Windows + Daylight Timeline */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#059669]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Clock-Hour Windows
            </h2>
          </div>
          <span className="text-xs text-[#475569]">
            Afternoon sun clears ground smoke; early morning &amp; night trap it
          </span>
        </div>

        {recommendations?.clockWindows && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#059669]">
                <Sun className="h-4 w-4" />
                Best Time to Step Out
              </div>
              <div className="text-lg font-bold text-[#0F172A]">
                {recommendations.clockWindows.bestWindowToStepOut}
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                {recommendations.clockWindows.bestWindowReason}
              </p>
            </div>

            <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E11D48]">
                <AlertTriangle className="h-4 w-4" />
                Peak Smoke Hours — Keep Windows Shut
              </div>
              <div className="text-lg font-bold text-[#0F172A]">
                {recommendations.clockWindows.peakSmokeHours}
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                {recommendations.clockWindows.peakSmokeReason}
              </p>
            </div>
          </div>
        )}

        <HourlyAirWave
          timeline={timeline}
          stepOutWindows={profile.stepOutWindows}
        />
      </section>

      {/* Today's Practical Moves vs. Future Upgrades */}
      <GuidanceSection
        recommendations={recommendations}
        recGeneratedBy={recGeneratedBy}
        loadingRecs={loadingRecs}
      />
    </div>
  );
}
