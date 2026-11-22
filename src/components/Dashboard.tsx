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
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Wind,
} from 'lucide-react';
import CitySelector from '@/components/CitySelector';
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
  onCityChange: (city: string) => void;
}

function getCpcbBadgeStyle(category?: AqiCategory): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'Good':
      return { bg: '#EDF6F0', text: '#2E6F40', border: '#CBE6D3' };
    case 'Satisfactory':
      return { bg: '#F3F8EC', text: '#4D7C0F', border: '#D9E9C3' };
    case 'Moderate':
      return { bg: '#FEF9EC', text: '#9A6700', border: '#F5E4B8' };
    case 'Poor':
      return { bg: '#FFF4ED', text: '#B45309', border: '#F9D8C0' };
    case 'Very Poor':
      return { bg: '#FEF2F2', text: '#B91C1C', border: '#F7CACA' };
    case 'Severe':
      return { bg: '#F9ECEC', text: '#7F1D1D', border: '#E8B8B8' };
    default:
      return { bg: '#F4F2ED', text: '#1C1B18', border: '#E7E5E0' };
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
  onCityChange,
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

  return (
    <div className="space-y-6">
      {/* Minimal Editorial Top Bar */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-[#E7E5E0]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#FFFFFF] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
              <Wind className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1C1B18]">
              SmogSense
            </h1>
          </div>

          <CitySelector
            value={profile.location.city}
            onChange={onCityChange}
            variant="compact"
          />

          <span className="text-xs text-[#6B6860]">
            {aqiData?.stationName || 'Loading station...'} · {formattedIstTime}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSimulate}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
              simulateSevere
                ? 'bg-[#F9ECEC] text-[#7F1D1D] border-[#E8B8B8]'
                : 'bg-[#FFFFFF] text-[#1C1B18] border-[#E7E5E0] hover:border-[#1C1B18]/40'
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            {simulateSevere ? 'Severe Smog: ON (432)' : 'Simulate Severe Smog'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loadingAqi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#1C1B18]/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingAqi ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1C1B18] text-white hover:bg-[#1C1B18]/90 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>
      </header>

      {/* Hero AQI Card */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
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
                      ? 'bg-[#FEF9EC] text-[#9A6700] border-[#F5E4B8]'
                      : 'bg-[#EDF6F0] text-[#2E6F40] border-[#CBE6D3]'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      aqiData.debug.source === 'Fallback'
                        ? 'bg-[#9A6700]'
                        : 'bg-[#2E6F40]'
                    }`}
                  />
                  {aqiData.debug.source === 'Fallback'
                    ? 'Fallback Active'
                    : aqiData.debug.source}
                </span>
              )}
              {aqiData?.debug?.fallbackReason && (
                <span className="text-[11px] text-[#6B6860]">
                  ({aqiData.debug.fallbackReason})
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-4">
              <div className="text-6xl sm:text-7xl font-bold tracking-tight text-[#1C1B18] tabular-nums">
                {loadingAqi || !aqiData ? '---' : aqiData.aqi}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#6B6860] font-semibold">
                CPCB AQI
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#1C1B18] leading-relaxed">
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
                className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2.5 min-w-[92px]"
              >
                <div className="text-[11px] font-medium text-[#6B6860]">
                  {p.label}
                </div>
                <div className="text-base font-bold text-[#1C1B18] tabular-nums mt-0.5">
                  {p.val ?? '--'}{' '}
                  <span className="text-[11px] font-normal text-[#6B6860]">
                    {p.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clock-Hour Windows + Daylight Timeline */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#1C1B18]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6860]">
              Clock-Hour Windows
            </h2>
          </div>
          <span className="text-xs text-[#6B6860]">
            Afternoon sun clears ground smoke; early morning &amp; night trap it
          </span>
        </div>

        {recommendations?.clockWindows && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-xl bg-[#EDF6F0] border border-[#CBE6D3] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2E6F40]">
                <Sun className="h-4 w-4" />
                Best Time to Step Out
              </div>
              <div className="text-lg font-bold text-[#1C1B18]">
                {recommendations.clockWindows.bestWindowToStepOut}
              </div>
              <p className="text-xs text-[#1C1B18]/80 leading-relaxed">
                {recommendations.clockWindows.bestWindowReason}
              </p>
            </div>

            <div className="rounded-xl bg-[#FEF2F2] border border-[#F7CACA] p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                <AlertTriangle className="h-4 w-4" />
                Peak Smoke Hours — Keep Windows Shut
              </div>
              <div className="text-lg font-bold text-[#1C1B18]">
                {recommendations.clockWindows.peakSmokeHours}
              </div>
              <p className="text-xs text-[#1C1B18]/80 leading-relaxed">
                {recommendations.clockWindows.peakSmokeReason}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
          {timeline.map((slot) => {
            const slotStyle =
              slot.status === 'Safe Window'
                ? 'bg-[#EDF6F0] border-[#CBE6D3] text-[#2E6F40]'
                : slot.status === 'Peak Smog'
                  ? 'bg-[#FEF2F2] border-[#F7CACA] text-[#B91C1C]'
                  : 'bg-[#FEF9EC] border-[#F5E4B8] text-[#9A6700]';

            return (
              <div
                key={slot.hourLabel}
                className={`rounded-xl border p-2.5 text-center ${slotStyle}`}
              >
                <div className="text-[11px] font-semibold">
                  {slot.hourLabel}
                </div>
                <div className="text-base font-bold text-[#1C1B18] my-0.5 tabular-nums">
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

      {/* Today's Practical Moves vs. Future Upgrades */}
      {loadingRecs && !recommendations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 h-48 animate-pulse space-y-3"
            >
              <div className="h-4 w-40 bg-[#F4F2ED] rounded" />
              <div className="h-3 w-full bg-[#F4F2ED] rounded" />
              <div className="h-3 w-5/6 bg-[#F4F2ED] rounded" />
            </div>
          ))}
        </div>
      ) : recommendations ? (
        <div className="space-y-6">
          {/* Today's Practical Moves */}
          <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#1C1B18]">
                  Today&apos;s Practical Moves
                </h2>
                <p className="text-xs text-[#6B6860]">
                  Realistic harm-reduction steps tailored to your exact routine today
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#2E6F40] bg-[#EDF6F0] border border-[#CBE6D3] px-3 py-1 rounded-full self-start sm:self-auto">
                Immediate Actions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1C1B18]">
                  <Bus className="h-4 w-4 text-[#6B6860]" />
                  On the Move
                </div>
                <p className="text-xs sm:text-sm text-[#1C1B18] leading-relaxed">
                  {recommendations.todaysPracticalMoves.onTheMove}
                </p>
              </div>

              <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1C1B18]">
                  <Home className="h-4 w-4 text-[#6B6860]" />
                  At Home
                </div>
                <p className="text-xs sm:text-sm text-[#1C1B18] leading-relaxed">
                  {recommendations.todaysPracticalMoves.atHome}
                </p>
              </div>

              <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#1C1B18]">
                  <HeartPulse className="h-4 w-4 text-[#6B6860]" />
                  For Your Household
                </div>
                <p className="text-xs sm:text-sm text-[#1C1B18] leading-relaxed">
                  {recommendations.todaysPracticalMoves.forYourHousehold}
                </p>
              </div>
            </div>

            {recommendations.todaysPracticalMoves.quickChecklist?.length > 0 && (
              <div className="pt-3 border-t border-[#E7E5E0]">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6B6860] mb-2.5">
                  Quick Checklist for Today
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.todaysPracticalMoves.quickChecklist.map(
                    (item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-[#1C1B18] bg-[#FAF9F6] rounded-xl px-3 py-2 border border-[#E7E5E0]"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#2E6F40] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Regional Advisory Box */}
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#FEF9EC] border border-[#F5E4B8] flex items-center justify-center text-[#9A6700]">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-[#1C1B18] text-base">
                    {recommendations.officialWarnings.advisoryTitle}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FEF9EC] text-[#9A6700] border border-[#F5E4B8]">
                  {recommendations.officialWarnings.stageOrLevel}
                </span>
              </div>

              <p className="text-sm font-medium text-[#1C1B18]">
                {recommendations.officialWarnings.headline}
              </p>

              <ul className="space-y-2">
                {recommendations.officialWarnings.bullets.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[#6B6860] leading-relaxed"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-[#9A6700] shrink-0 mt-0.5" />
                    <span className="text-[#1C1B18]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Future Lifestyle Upgrades */}
            <div className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-[#1C1B18] text-base">
                    Future Lifestyle Upgrades
                  </h3>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#F4F2ED] text-[#6B6860] border border-[#E7E5E0]">
                  Optional · Gradual
                </span>
              </div>

              <p className="text-xs text-[#6B6860]">
                {recommendations.futureLifestyleUpgrades.summary}
              </p>

              <div className="space-y-2.5">
                {recommendations.futureLifestyleUpgrades.upgrades.map(
                  (upg, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-3.5 space-y-1"
                    >
                      <div className="font-semibold text-xs text-[#1C1B18]">
                        {upg.title}
                      </div>
                      <p className="text-xs text-[#6B6860] leading-relaxed">
                        {upg.description}
                      </p>
                      <p className="text-[11px] font-medium text-[#2E6F40]">
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
