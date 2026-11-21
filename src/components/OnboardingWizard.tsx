'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  GraduationCap,
  HeartPulse,
  Home,
  MapPin,
  Navigation,
  ShieldCheck,
  Users,
  Wind,
} from 'lucide-react';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  INDIAN_CITIES,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type ExistingProtection,
  type HealthSensitivity,
  type HomeSurrounding,
  type HouseholdMember,
  type IndianCity,
  type IndustryProfile,
  type SchoolProfile,
  type StepOutWindow,
  type SupportMode,
  type TravelMode,
  type UserProfile,
} from '@/types/air-quality';

interface OnboardingWizardProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

const DEFAULT_SCHOOL: SchoolProfile = {
  studentGroup: 'Middle & High (Ages 11-17)',
  indoorSportsHall: 'Yes',
  outdoorSportsSchedule: 'Morning Assembly & PT',
};

const DEFAULT_INDUSTRY: IndustryProfile = {
  facilityType: 'Office & IT Park',
  shiftSchedule: 'Day Shift (9 AM - 6 PM)',
  dieselFleetUsage: 'Backup DG Only',
};

function TapChip({
  active,
  label,
  multi = false,
  onClick,
}: {
  active: boolean;
  label: string;
  multi?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border cursor-pointer ${
        active
          ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25'
          : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
      }`}
    >
      {multi && active && <Check className="h-3.5 w-3.5 shrink-0" />}
      <span>{label}</span>
    </button>
  );
}

function toggleMulti<T extends string>(
  current: T[],
  item: T,
  exclusiveItem?: T
): T[] {
  if (exclusiveItem && item === exclusiveItem) {
    return [exclusiveItem];
  }
  const withoutExclusive = exclusiveItem
    ? current.filter((v) => v !== exclusiveItem)
    : [...current];

  if (withoutExclusive.includes(item)) {
    const next = withoutExclusive.filter((v) => v !== item);
    if (next.length === 0 && exclusiveItem) {
      return [exclusiveItem];
    }
    return next;
  }
  return [...withoutExclusive, item];
}

export default function OnboardingWizard({
  initialProfile,
  onComplete,
  onCancel,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [mode, setMode] = useState<SupportMode>(
    initialProfile?.mode ?? 'personal'
  );
  const [city, setCity] = useState<IndianCity | string>(
    initialProfile?.location?.city || 'New Delhi'
  );
  const [town, setTown] = useState(initialProfile?.location?.town ?? '');

  const [stepOutWindows, setStepOutWindows] = useState<StepOutWindow[]>(
    initialProfile?.stepOutWindows?.length
      ? initialProfile.stepOutWindows
      : ['Office / College Hours (9 AM–6 PM)']
  );
  const [travelModes, setTravelModes] = useState<TravelMode[]>(
    initialProfile?.travelModes?.length
      ? initialProfile.travelModes
      : ['Metro / Local Train']
  );
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(
    initialProfile?.householdMembers?.length
      ? initialProfile.householdMembers
      : ['Just Me']
  );
  const [healthSensitivities, setHealthSensitivities] = useState<
    HealthSensitivity[]
  >(
    initialProfile?.healthSensitivities?.length
      ? initialProfile.healthSensitivities
      : ['None']
  );
  const [homeSurroundings, setHomeSurroundings] = useState<HomeSurrounding[]>(
    initialProfile?.homeSurroundings?.length
      ? initialProfile.homeSurroundings
      : ['Quiet Residential / Gated']
  );
  const [existingProtection, setExistingProtection] = useState<
    ExistingProtection[]
  >(
    initialProfile?.existingProtection?.length
      ? initialProfile.existingProtection
      : ['None (Zero-Cost Tips Only)']
  );

  const [school, setSchool] = useState<SchoolProfile>(
    initialProfile?.school ?? DEFAULT_SCHOOL
  );
  const [industry, setIndustry] = useState<IndustryProfile>(
    initialProfile?.industry ?? DEFAULT_INDUSTRY
  );
  const [stepError, setStepError] = useState('');

  const handleStep1Next = () => {
    if (!city) {
      setStepError('Please pick your city.');
      return;
    }
    if (stepOutWindows.length === 0) {
      setStepError('Please pick at least one time you usually step out.');
      return;
    }
    setStepError('');
    setStep(2);
  };

  const handleStep2Next = () => {
    if (travelModes.length === 0) {
      setStepError('Please pick at least one way you travel.');
      return;
    }
    setStepError('');
    setStep(3);
  };

  const handleFinish = () => {
    if (homeSurroundings.length === 0) {
      setStepError('Please pick at least one option for your home surroundings.');
      return;
    }
    const profile: UserProfile = {
      mode,
      location: {
        city,
        town: town.trim() || undefined,
      },
      stepOutWindows,
      travelModes,
      householdMembers,
      healthSensitivities,
      homeSurroundings,
      existingProtection:
        existingProtection.length > 0
          ? existingProtection
          : ['None (Zero-Cost Tips Only)'],
      school: mode === 'school' ? school : undefined,
      industry: mode === 'industry' ? industry : undefined,
      updatedAt: new Date().toISOString(),
    };
    onComplete(profile);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Wind className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                SmogSense Daily Routine Setup
              </h1>
              <p className="text-xs text-slate-400">
                Tap everything that applies · Saved locally · Zero login
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-full">
              Step {step} of 3
            </span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-800">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* STEP 1: CITY + SUPPORT MODE + STEP OUT WINDOWS */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Your City (Single-Select)
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INDIAN_CITIES.map((c) => (
                    <TapChip
                      key={c}
                      label={c}
                      active={city === c}
                      onClick={() => setCity(c)}
                    />
                  ))}
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Neighbourhood / Area (optional, for closer station match)
                  </label>
                  <input
                    type="text"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="e.g., Indiranagar, Bandra, Jubilee Hills, Rohini"
                    className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Who is this plan for?
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'personal' as const,
                      title: 'Personal & Family',
                      desc: 'Daily commute & home',
                      icon: Users,
                    },
                    {
                      id: 'school' as const,
                      title: 'School & College',
                      desc: 'Classes & outdoor games',
                      icon: GraduationCap,
                    },
                    {
                      id: 'industry' as const,
                      title: 'Workplace & Site',
                      desc: 'Shifts & team safety',
                      icon: Building2,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className={`text-left rounded-2xl p-3.5 border transition-all cursor-pointer ${
                          active
                            ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/10'
                            : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-500'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 mb-1.5 ${
                            active ? 'text-sky-400' : 'text-slate-400'
                          }`}
                        />
                        <div className="font-semibold text-sm text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      When You Step Out
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STEP_OUT_WINDOWS.map((w) => (
                    <TapChip
                      key={w}
                      multi
                      label={w}
                      active={stepOutWindows.includes(w)}
                      onClick={() =>
                        setStepOutWindows((prev) => toggleMulti(prev, w))
                      }
                    />
                  ))}
                </div>
              </div>

              {stepError && (
                <p className="text-xs text-rose-400">{stepError}</p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition cursor-pointer"
                >
                  Next: Travel & Household
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: TRAVEL + HOUSEHOLD + HEALTH SENSITIVITIES */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      How You Travel
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_MODES.map((t) => (
                    <TapChip
                      key={t}
                      multi
                      label={t}
                      active={travelModes.includes(t)}
                      onClick={() =>
                        setTravelModes((prev) => toggleMulti(prev, t))
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Who Lives at Home
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOUSEHOLD_MEMBERS.map((m) => (
                    <TapChip
                      key={m}
                      multi
                      label={m}
                      active={householdMembers.includes(m)}
                      onClick={() =>
                        setHouseholdMembers((prev) =>
                          toggleMulti(prev, m, 'Just Me')
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Health Sensitivities
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HEALTH_SENSITIVITIES.map((h) => (
                    <TapChip
                      key={h}
                      multi
                      label={h}
                      active={healthSensitivities.includes(h)}
                      onClick={() =>
                        setHealthSensitivities((prev) =>
                          toggleMulti(prev, h, 'None')
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              {mode === 'school' && (
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/80 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    School / Campus Quick Details
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'Primary (Ages 5-10)',
                        'Middle & High (Ages 11-17)',
                        'College & University',
                      ] as const
                    ).map((g) => (
                      <TapChip
                        key={g}
                        label={g}
                        active={school.studentGroup === g}
                        onClick={() =>
                          setSchool((s) => ({ ...s, studentGroup: g }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {mode === 'industry' && (
                <div className="rounded-2xl bg-slate-800/50 border border-slate-700/80 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Workplace / Site Quick Details
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'Office & IT Park',
                        'Manufacturing & Warehouse',
                        'Construction & Logistics',
                      ] as const
                    ).map((f) => (
                      <TapChip
                        key={f}
                        label={f}
                        active={industry.facilityType === f}
                        onClick={() =>
                          setIndustry((ind) => ({ ...ind, facilityType: f }))
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {stepError && (
                <p className="text-xs text-rose-400">{stepError}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStepError('');
                    setStep(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition cursor-pointer"
                >
                  Next: Home & Protection
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: HOME SURROUNDINGS + PROTECTION YOU ALREADY HAVE */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Home Surroundings
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {HOME_SURROUNDINGS.map((hs) => (
                    <TapChip
                      key={hs}
                      multi
                      label={hs}
                      active={homeSurroundings.includes(hs)}
                      onClick={() =>
                        setHomeSurroundings((prev) => toggleMulti(prev, hs))
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                      Protection You Already Have
                    </h2>
                  </div>
                  <span className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Multi-select
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXISTING_PROTECTIONS.map((ep) => (
                    <TapChip
                      key={ep}
                      multi
                      label={ep}
                      active={existingProtection.includes(ep)}
                      onClick={() =>
                        setExistingProtection((prev) =>
                          toggleMulti(prev, ep, 'None (Zero-Cost Tips Only)')
                        )
                      }
                    />
                  ))}
                </div>
              </div>

              {stepError && (
                <p className="text-xs text-rose-400">{stepError}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStepError('');
                    setStep(2);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition cursor-pointer shadow-lg shadow-emerald-500/25"
                >
                  <Check className="h-4 w-4" />
                  Build My Daily Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
