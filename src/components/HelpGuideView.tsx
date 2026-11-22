'use client';

import React from 'react';
import { Activity, BookOpen, Info } from 'lucide-react';

const CPCB_BANDS = [
  {
    category: 'Good',
    range: '0 – 50',
    bg: '#EDF6F0',
    text: '#2E6F40',
    border: '#CBE6D3',
    meaning:
      'Clean, comfortable air. Great for morning walks, kids’ outdoor play, and keeping windows open.',
  },
  {
    category: 'Satisfactory',
    range: '51 – 100',
    bg: '#F3F8EC',
    text: '#4D7C0F',
    border: '#D9E9C3',
    meaning:
      'Generally fine for everyday routines. Very sensitive asthmatics may notice mild irritation near heavy traffic.',
  },
  {
    category: 'Moderate',
    range: '101 – 200',
    bg: '#FEF9EC',
    text: '#9A6700',
    border: '#F5E4B8',
    meaning:
      'Typical urban haze. Carry on with work and errands—just switch car AC to recirculate and rinse face/nose after open-road rides.',
  },
  {
    category: 'Poor',
    range: '201 – 300',
    bg: '#FFF4ED',
    text: '#B45309',
    border: '#F9D8C0',
    meaning:
      'Elevated smoke and dust. Wear a snug mask on two-wheelers/autos and air out rooms only during the sunny 12:00 PM – 4:00 PM window.',
  },
  {
    category: 'Very Poor',
    range: '301 – 400',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#F7CACA',
    meaning:
      'Heavy particulate buildup. Wear a fitted N95 outdoors, shift workouts indoors, and keep morning/evening windows shut.',
  },
  {
    category: 'Severe',
    range: '401 – 500',
    bg: '#F9ECEC',
    text: '#7F1D1D',
    border: '#E8B8B8',
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
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1B18]">
              Indian CPCB AQI Scale (0–500)
            </h2>
            <p className="text-xs text-[#6B6860]">
              What each air quality band means for your real daily routine
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CPCB_BANDS.map((band) => (
            <div
              key={band.category}
              className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2"
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
                <span className="text-xs font-bold text-[#1C1B18] tabular-nums">
                  {band.range}
                </span>
              </div>
              <p className="text-xs text-[#6B6860] leading-relaxed">
                {band.meaning}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pollutant Guide */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1B18]">
              Pollutant Guide
            </h2>
            <p className="text-xs text-[#6B6860]">
              Where urban pollutants come from and how they affect breathing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {POLLUTANTS.map((p) => (
            <div
              key={p.symbol}
              className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E7E5E0] text-[#1C1B18]">
                  {p.symbol}
                </span>
                <span className="text-xs font-semibold text-[#1C1B18]">
                  {p.name}
                </span>
              </div>
              <p className="text-xs text-[#6B6860] leading-relaxed">
                <strong className="text-[#1C1B18]">Sources:</strong> {p.sources}
              </p>
              <p className="text-xs text-[#6B6860] leading-relaxed">
                <strong className="text-[#1C1B18]">Impact:</strong> {p.effect}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How Readings Are Calculated */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
            <Info className="h-4 w-4" />
          </div>
          <h2 className="text-base font-bold text-[#1C1B18]">
            How Readings Are Calculated
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#6B6860] leading-relaxed">
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
