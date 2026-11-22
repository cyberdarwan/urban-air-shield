'use client';

import React from 'react';
import { Activity, BookOpen, Info } from 'lucide-react';

const CPCB_BANDS = [
  {
    category: 'Good',
    range: '0 – 50',
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    meaning:
      'Clean, comfortable air. Great for morning walks, kids’ outdoor play, and keeping windows open.',
  },
  {
    category: 'Satisfactory',
    range: '51 – 100',
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    meaning:
      'Generally fine for everyday routines. Very sensitive asthmatics may notice mild irritation near heavy traffic.',
  },
  {
    category: 'Moderate',
    range: '101 – 200',
    bg: '#FFFBEB',
    text: '#D97706',
    border: '#FDE68A',
    meaning:
      'Typical urban haze. Carry on with work and errands—just switch car AC to recirculate and rinse face/nose after open-road rides.',
  },
  {
    category: 'Poor',
    range: '201 – 300',
    bg: '#FFF7ED',
    text: '#C2410C',
    border: '#FED7AA',
    meaning:
      'Elevated smoke and dust. Wear a snug mask on two-wheelers/autos and air out rooms only during the sunny 12:00 PM – 4:00 PM window.',
  },
  {
    category: 'Very Poor',
    range: '301 – 400',
    bg: '#FFF1F2',
    text: '#E11D48',
    border: '#FECDD3',
    meaning:
      'Heavy particulate buildup. Wear a fitted N95 outdoors, shift workouts indoors, and keep morning/evening windows shut.',
  },
  {
    category: 'Severe',
    range: '401 – 500',
    bg: '#FFF1F2',
    text: '#BE123C',
    border: '#FECDD3',
    meaning:
      'Emergency smog episode. Minimize non-essential evening travel; wear a sealed N95/N99 for unavoidable commutes and protect kids & seniors indoors.',
  },
];

const POLLUTANTS = [
  {
    symbol: 'PM2.5',
    name: 'Fine Particulate Matter',
    sources: 'Vehicle exhaust, biomass/trash burning, kitchen smoke, winter haze',
    effect:
      'Tiny enough to travel deep into airways and trigger coughing, wheezing, and sinus flare-ups.',
  },
  {
    symbol: 'PM10',
    name: 'Coarse Dust & Grit',
    sources: 'Construction sites, unpaved road dust, sweeping, windblown soil',
    effect:
      'Irritates eyes, nose, and throat—especially noticeable on two-wheelers and open autos.',
  },
  {
    symbol: 'NO₂',
    name: 'Nitrogen Dioxide',
    sources: 'Diesel trucks, buses, dense traffic bottlenecks, power generators',
    effect:
      'Inflames airways quickly during rush-hour commutes along main roads.',
  },
  {
    symbol: 'SO₂',
    name: 'Sulfur Dioxide',
    sources: 'Industrial boilers, coal/diesel combustion, heavy freight corridors',
    effect:
      'Causes sudden throat tightness and airway sensitivity, especially for people with asthma.',
  },
  {
    symbol: 'O₃',
    name: 'Ground-Level Ozone',
    sources: 'Forms when afternoon sunlight reacts with traffic fumes',
    effect:
      'Peaks on bright, hot afternoons; can cause chest discomfort during intense outdoor exercise.',
  },
  {
    symbol: 'CO',
    name: 'Carbon Monoxide',
    sources: 'Idling vehicles in traffic jams, enclosed parking basements, generators',
    effect:
      'Reduces oxygen delivery in the blood, causing fatigue or headaches in bumper-to-bumper traffic.',
  },
];

export default function HelpGuideView() {
  return (
    <div className="space-y-6">
      {/* CPCB AQI Scale */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Indian CPCB AQI Scale (0–500)
            </h2>
            <p className="text-xs text-[#475569]">
              What each air quality band means for your real daily routine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CPCB_BANDS.map((band) => (
            <div
              key={band.category}
              className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: band.bg,
                    color: band.text,
                    borderColor: band.border,
                  }}
                >
                  {band.category}
                </span>
                <span className="text-xs font-bold text-[#0F172A] tabular-nums">
                  {band.range}
                </span>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                {band.meaning}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pollutant Guide */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Pollutant Guide
            </h2>
            <p className="text-xs text-[#475569]">
              Where urban pollutants come from and how they affect breathing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POLLUTANTS.map((p) => (
            <div
              key={p.symbol}
              className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-[#E7E5E0] text-[#0F172A]">
                  {p.symbol}
                </span>
                <span className="text-xs font-semibold text-[#0F172A]">
                  {p.name}
                </span>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#0F172A]">Sources:</strong> {p.sources}
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#0F172A]">Impact:</strong> {p.effect}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How Readings Are Calculated */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <Info className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A]">
            How Readings Are Calculated
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
          SmogSense queries live government reference stations across India via
          OpenAQ v3 (within a 25 km radius of your selected city). Raw sensor
          readings are normalized to official Indian CPCB units (converting CO
          from µg/m³ or ppb into mg/m³, and NO₂, SO₂, and O₃ into µg/m³). Each
          pollutant is mapped to its CPCB linear sub-index, and the highest
          sub-index determines your city&apos;s overall AQI.
        </p>
      </section>
    </div>
  );
}
