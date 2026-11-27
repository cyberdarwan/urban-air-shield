'use client';

import React from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  HeartPulse,
  Home,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { RecommendationPayload } from '@/types/air-quality';

interface GuidanceSectionProps {
  recommendations: RecommendationPayload | null;
  recGeneratedBy?: string | null;
  loadingRecs: boolean;
}

export default function GuidanceSection({
  recommendations,
  recGeneratedBy,
  loadingRecs,
}: GuidanceSectionProps) {
  if (loadingRecs && !recommendations) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 h-48 animate-pulse space-y-3"
          >
            <div className="h-4 w-40 bg-[#E7E5E0]/60 rounded" />
            <div className="h-3 w-full bg-[#E7E5E0]/60 rounded" />
            <div className="h-3 w-5/6 bg-[#E7E5E0]/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations) return null;

  return (
    <div className="space-y-6">
      {/* Today's Practical Moves */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Today&apos;s Practical Moves
            </h2>
            <p className="text-xs text-[#475569]">
              Realistic harm-reduction steps tailored to your exact routine today
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {recGeneratedBy && (
              <span
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                  recGeneratedBy === 'fallback'
                    ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                    : 'bg-[#FAF9F6] text-[#475569] border-[#E7E5E0]'
                }`}
              >
                {recGeneratedBy === 'fallback'
                  ? 'Offline Fallback'
                  : `AI Live · ${recGeneratedBy}`}
              </span>
            )}
            <span className="text-[11px] font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1 rounded-full">
              Immediate Actions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
              <Bus className="h-4 w-4 text-[#059669]" />
              On the Move
            </div>
            <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed">
              {recommendations.todaysPracticalMoves.onTheMove}
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
              <Home className="h-4 w-4 text-[#059669]" />
              At Home
            </div>
            <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed">
              {recommendations.todaysPracticalMoves.atHome}
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
              <HeartPulse className="h-4 w-4 text-[#059669]" />
              For Your Household
            </div>
            <p className="text-xs sm:text-sm text-[#0F172A] leading-relaxed">
              {recommendations.todaysPracticalMoves.forYourHousehold}
            </p>
          </div>
        </div>

        {recommendations.todaysPracticalMoves.quickChecklist?.length > 0 && (
          <div className="pt-3 border-t border-[#E7E5E0]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-2.5">
              Quick Checklist for Today
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendations.todaysPracticalMoves.quickChecklist.map(
                (item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[#0F172A] bg-[#FAF9F6]/90 rounded-xl px-3 py-2 border border-[#E7E5E0]"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
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
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-[#0F172A] text-base">
                {recommendations.officialWarnings.advisoryTitle}
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              {recommendations.officialWarnings.stageOrLevel}
            </span>
          </div>

          <p className="text-sm font-medium text-[#0F172A]">
            {recommendations.officialWarnings.headline}
          </p>

          <ul className="space-y-2">
            {recommendations.officialWarnings.bullets.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-[#475569] leading-relaxed"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-[#D97706] shrink-0 mt-0.5" />
                <span className="text-[#0F172A]">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Future Lifestyle Upgrades */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-[#0F172A] text-base">
                Future Lifestyle Upgrades
              </h3>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#FAF9F6] text-[#475569] border border-[#E7E5E0]">
              Optional · Gradual
            </span>
          </div>

          <p className="text-xs text-[#475569]">
            {recommendations.futureLifestyleUpgrades.summary}
          </p>

          <div className="space-y-2.5">
            {recommendations.futureLifestyleUpgrades.upgrades.map(
              (upg, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-3.5 space-y-1"
                >
                  <div className="font-semibold text-xs text-[#0F172A]">
                    {upg.title}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {upg.description}
                  </p>
                  <p className="text-[11px] font-medium text-[#059669]">
                    Why it helps: {upg.whyItHelps}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
