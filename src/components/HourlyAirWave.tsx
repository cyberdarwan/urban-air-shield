'use client';

import React, { useMemo, useState } from 'react';
import {
  findSafestHourlyWindow,
  type HourlyWindow,
} from '@/lib/aqi-utils';

interface HourlyAirWaveProps {
  timeline: HourlyWindow[];
  stepOutWindows?: string[];
}

function getRoutineHours(stepOutWindows: string[] = []): Set<string> {
  const hours = new Set<string>();
  for (const w of stepOutWindows) {
    if (w.includes('Early Morning')) {
      hours.add('06:00');
      hours.add('08:00');
    } else if (w.includes('Office / College')) {
      hours.add('10:00');
      hours.add('16:00');
    } else if (w.includes('Evening Rush')) {
      hours.add('18:00');
      hours.add('20:00');
    } else if (w.includes('Late Night')) {
      hours.add('22:00');
    }
  }
  return hours;
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function HourlyAirWave({
  timeline,
  stepOutWindows = [],
}: HourlyAirWaveProps) {
  const bestIndex = useMemo(() => {
    const { index } = findSafestHourlyWindow(timeline);
    return index >= 0 ? index : 0;
  }, [timeline]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const activeIndex =
    selectedIndex !== null && selectedIndex < timeline.length
      ? selectedIndex
      : bestIndex;

  const routineHours = useMemo(
    () => getRoutineHours(stepOutWindows),
    [stepOutWindows]
  );

  if (timeline.length === 0) return null;

  const width = 720;
  const height = 132;
  const padX = 28;
  const padTop = 20;
  const padBottom = 16;

  const values = timeline.map((t) => t.estimatedAqi);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = Math.max(20, maxVal - minVal);

  const points = timeline.map((slot, idx) => {
    const x =
      padX + (idx / Math.max(1, timeline.length - 1)) * (width - padX * 2);
    const normalized = (slot.estimatedAqi - minVal) / range;
    const y =
      height - padBottom - normalized * (height - padTop - padBottom);
    return { x, y, slot, idx };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  const activePoint = points[activeIndex];
  const activeSlot = activePoint.slot;
  const isRoutineHour = routineHours.has(activeSlot.hourLabel);

  const statusText =
    activeIndex === bestIndex || activeSlot.status === 'Safe Window'
      ? 'Best window for quick errands'
      : activeSlot.status === 'Peak Smog'
        ? isRoutineHour
          ? 'Your routine hour · Wear snug mask & keep windows shut'
          : 'Peak smoke · Keep windows shut'
        : isRoutineHour
          ? 'Your routine hour · Moderate haze, use car AC recirculate'
          : 'Transitional air · Moderate haze';

  const inspectorTone =
    activeIndex === bestIndex || activeSlot.status === 'Safe Window'
      ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
      : activeSlot.status === 'Peak Smog'
        ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]'
        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]';

  return (
    <div className="space-y-2">
      {/* Fluid Borderless SVG Wave (136px tall) */}
      <div className="relative w-full h-[136px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Hourly air quality wave from 06:00 to 22:00"
        >
          <defs>
            <linearGradient id="smogWaveFill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.22" />
              <stop offset="22%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#10B981" stopOpacity="0.26" />
              <stop offset="78%" stopColor="#F59E0B" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id="smogWaveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E11D48" />
              <stop offset="25%" stopColor="#D97706" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="75%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
          </defs>

          {/* Translucent Gradient Area */}
          <path d={areaPath} fill="url(#smogWaveFill)" />

          {/* Smooth Spline Line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#smogWaveStroke)"
            strokeWidth="2.75"
            strokeLinecap="round"
          />

          {/* Interactive Nodes */}
          {points.map(({ x, y, slot, idx }) => {
            const isActive = idx === activeIndex;
            const isBest = idx === bestIndex;
            const isRoutine = routineHours.has(slot.hourLabel);
            const nodeColor =
              isBest || slot.status === 'Safe Window'
                ? '#059669'
                : slot.status === 'Peak Smog'
                  ? '#E11D48'
                  : '#D97706';

            return (
              <g
                key={slot.hourLabel}
                className="cursor-pointer"
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => setSelectedIndex(idx)}
                onFocus={() => setSelectedIndex(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIndex(idx);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${slot.hourLabel}: AQI ${slot.estimatedAqi}, ${slot.status}`}
              >
                {/* Invisible wider hit target */}
                <circle cx={x} cy={y} r="16" fill="transparent" />

                {/* Routine or Best Window subtle halo */}
                {(isBest || isRoutine || isActive) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? 9 : 7}
                    fill={nodeColor}
                    fillOpacity={isActive ? 0.18 : 0.12}
                  />
                )}

                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 5 : isBest ? 4.5 : 3.5}
                  fill="#FFFFFF"
                  stroke={nodeColor}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Time Ticks */}
      <div className="grid grid-cols-9 gap-1 px-1">
        {timeline.map((slot, idx) => {
          const isActive = idx === activeIndex;
          const isRoutine = routineHours.has(slot.hourLabel);
          return (
            <button
              key={slot.hourLabel}
              type="button"
              aria-pressed={isActive}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => setSelectedIndex(idx)}
              className={`text-center py-1 rounded-lg text-[11px] transition-colors cursor-pointer tabular-nums ${
                isActive
                  ? 'font-bold text-[#0F172A] bg-[#FAF9F6]'
                  : 'font-medium text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <span>{slot.hourLabel}</span>
              {isRoutine && (
                <span
                  title="Your routine hour"
                  className="block mx-auto mt-0.5 h-1 w-1 rounded-full bg-[#059669]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Slim Inline Inspector Bar */}
      <div
        role="status"
        aria-live="polite"
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs transition-colors ${inspectorTone}`}
      >
        <div className="font-semibold tabular-nums">
          {activeSlot.hourLabel} · AQI {activeSlot.estimatedAqi} —{' '}
          <span className="font-medium">{statusText}</span>
        </div>
        {routineHours.size > 0 && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#475569]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
            Routine hours marked
          </span>
        )}
      </div>
    </div>
  );
}
