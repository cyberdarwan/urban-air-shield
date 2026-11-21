'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Users,
  Wind,
} from 'lucide-react';
import type {
  BudgetTier,
  CommuteType,
  ExerciseHabit,
  HealthSensitivity,
  IndustryProfile,
  PersonalProfile,
  SchoolProfile,
  SupportMode,
  UserProfile,
} from '@/types/air-quality';

interface OnboardingWizardProps {
  initialProfile?: UserProfile | null;
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

const DEFAULT_PERSONAL: PersonalProfile = {
  adults: 2,
  children: 1,
  seniors: 0,
  sensitivity: 'None',
  commute: 'Metro/Bus',
  exerciseHabit: '3x/Week',
};

const DEFAULT_SCHOOL: SchoolProfile = {
  studentGroup: 'Middle & High (Ages 11-17)',
  indoorSportsHall: 'Yes',
  outdoorSportsSchedule: 'Morning Assembly & PT',
  dropoffType: 'School Bus Fleet',
};

const DEFAULT_INDUSTRY: IndustryProfile = {
  facilityType: 'Office & IT Park',
  shiftSchedule: 'Day Shift (9 AM - 6 PM)',
  dieselFleetUsage: 'Backup DG Only',
};

function StepPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all border cursor-pointer ${
        active
          ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-500/25'
          : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function Counter({
  label,
  sublabel,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-800/60 border border-slate-700/80 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-white">{label}</div>
        <div className="text-xs text-slate-400">{sublabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="h-9 w-9 rounded-full bg-slate-700/80 hover:bg-slate-600 text-white flex items-center justify-center transition cursor-pointer"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center text-base font-bold text-white tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          aria-label={`Increase ${label}`}
          className="h-9 w-9 rounded-full bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
  const [stateName, setStateName] = useState(
    initialProfile?.location?.state ?? ''
  );
  const [cityName, setCityName] = useState(
    initialProfile?.location?.city ?? ''
  );
  const [townName, setTownName] = useState(
    initialProfile?.location?.town ?? ''
  );
  const [locationError, setLocationError] = useState('');

  const [personal, setPersonal] = useState<PersonalProfile>(
    initialProfile?.personal ?? DEFAULT_PERSONAL
  );
  const [school, setSchool] = useState<SchoolProfile>(
    initialProfile?.school ?? DEFAULT_SCHOOL
  );
  const [industry, setIndustry] = useState<IndustryProfile>(
    initialProfile?.industry ?? DEFAULT_INDUSTRY
  );
  const [budget, setBudget] = useState<BudgetTier>(
    initialProfile?.budget ?? 'Zero-Cost Household Changes'
  );

  const handleStep1Next = () => {
    if (!cityName.trim() && !townName.trim()) {
      setLocationError('Please enter at least your City or Town to fetch local AQI.');
      return;
    }
    setLocationError('');
    setStep(2);
  };

  const handleFinish = () => {
    const profile: UserProfile = {
      mode,
      location: {
        state: stateName.trim(),
        city: cityName.trim(),
        town: townName.trim(),
      },
      personal: mode === 'personal' ? personal : undefined,
      school: mode === 'school' ? school : undefined,
      industry: mode === 'industry' ? industry : undefined,
      budget,
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
                SmogSense Personalization
              </h1>
              <p className="text-xs text-slate-400">
                2-minute tap setup · Saved locally · Zero login
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
          {/* STEP 1: LOCATION + SUPPORT TYPE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-sky-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                    Your Location (for exact local AQI)
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      State / Region
                    </label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="e.g., Central Region"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      placeholder="e.g., Metro City"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Town / Locality
                    </label>
                    <input
                      type="text"
                      value={townName}
                      onChange={(e) => setTownName(e.target.value)}
                      placeholder="e.g., North Sector"
                      className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                {locationError && (
                  <p className="mt-2 text-xs text-rose-400">{locationError}</p>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-3">
                  Select Support Type
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'personal' as const,
                      title: 'Personal & Family',
                      desc: 'Home exposure, commute & respiratory care',
                      icon: Users,
                    },
                    {
                      id: 'school' as const,
                      title: 'School & College',
                      desc: 'Campus sports, assemblies & bus fleets',
                      icon: GraduationCap,
                    },
                    {
                      id: 'industry' as const,
                      title: 'Industry & Workplace',
                      desc: 'Shifts, outdoor crews & DG/fleet protocols',
                      icon: Building2,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    const selected = mode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMode(item.id)}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                          selected
                            ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/10'
                            : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon
                            className={`h-5 w-5 ${
                              selected ? 'text-sky-400' : 'text-slate-400'
                            }`}
                          />
                          {selected && (
                            <span className="h-5 w-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-sm text-white">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DYNAMIC COUNTERS & PILLS */}
          {step === 2 && mode === 'personal' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Household Composition
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <Counter
                  label="Adults (18-59)"
                  sublabel="Working & commuting adults"
                  value={personal.adults}
                  min={1}
                  onChange={(v) => setPersonal({ ...personal, adults: v })}
                />
                <Counter
                  label="Children (0-17)"
                  sublabel="Developing lungs, higher inhalation rate"
                  value={personal.children}
                  onChange={(v) => setPersonal({ ...personal, children: v })}
                />
                <Counter
                  label="Seniors (60+)"
                  sublabel="Higher cardiovascular & respiratory sensitivity"
                  value={personal.seniors}
                  onChange={(v) => setPersonal({ ...personal, seniors: v })}
                />
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Health Sensitivities
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['None', 'Asthma/Respiratory', 'Cardiac'] as HealthSensitivity[]).map(
                    (opt) => (
                      <StepPill
                        key={opt}
                        label={opt}
                        active={personal.sensitivity === opt}
                        onClick={() =>
                          setPersonal({ ...personal, sensitivity: opt })
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Primary Commute
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Two-Wheeler/Walk',
                      'Car',
                      'Metro/Bus',
                      'Work From Home',
                    ] as CommuteType[]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={personal.commute === opt}
                      onClick={() => setPersonal({ ...personal, commute: opt })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Weekly Outing / Exercise Habit
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Daily Outdoor',
                      '3x/Week',
                      'Indoor Only',
                      'Minimal',
                    ] as ExerciseHabit[]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={personal.exerciseHabit === opt}
                      onClick={() =>
                        setPersonal({ ...personal, exerciseHabit: opt })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && mode === 'school' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Campus & Student Details
              </h2>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Student Group
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Primary (Ages 5-10)',
                      'Middle & High (Ages 11-17)',
                      'College & University',
                    ] as SchoolProfile['studentGroup'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={school.studentGroup === opt}
                      onClick={() =>
                        setSchool({ ...school, studentGroup: opt })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Indoor Sports Hall Available?
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['Yes', 'No'] as SchoolProfile['indoorSportsHall'][]).map(
                    (opt) => (
                      <StepPill
                        key={opt}
                        label={opt}
                        active={school.indoorSportsHall === opt}
                        onClick={() =>
                          setSchool({ ...school, indoorSportsHall: opt })
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Outdoor Sports Schedule
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Morning Assembly & PT',
                      'Afternoon Games',
                      'Suspended in Smog',
                    ] as SchoolProfile['outdoorSportsSchedule'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={school.outdoorSportsSchedule === opt}
                      onClick={() =>
                        setSchool({ ...school, outdoorSportsSchedule: opt })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  School Bus / Drop-Off Type
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'School Bus Fleet',
                      'Private Cars & Vans',
                      'Walk / Cycle',
                    ] as SchoolProfile['dropoffType'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={school.dropoffType === opt}
                      onClick={() => setSchool({ ...school, dropoffType: opt })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && mode === 'industry' && (
            <div className="space-y-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Workplace & Operations
              </h2>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Facility Type
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Office & IT Park',
                      'Manufacturing & Warehouse',
                      'Construction & Logistics',
                    ] as IndustryProfile['facilityType'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={industry.facilityType === opt}
                      onClick={() =>
                        setIndustry({ ...industry, facilityType: opt })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Shift Schedule
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Day Shift (9 AM - 6 PM)',
                      '24/7 Rotating Shifts',
                      'Early Morning / Night',
                    ] as IndustryProfile['shiftSchedule'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={industry.shiftSchedule === opt}
                      onClick={() =>
                        setIndustry({ ...industry, shiftSchedule: opt })
                      }
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Diesel Generator / Fleet Usage
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'None / Electric',
                      'Backup DG Only',
                      'Heavy Fleet & DG',
                    ] as IndustryProfile['dieselFleetUsage'][]
                  ).map((opt) => (
                    <StepPill
                      key={opt}
                      label={opt}
                      active={industry.dieselFleetUsage === opt}
                      onClick={() =>
                        setIndustry({ ...industry, dieselFleetUsage: opt })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUDGET & SETUP */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Budget & Indoor Setup Tier
              </h2>
              <p className="text-sm text-slate-400">
                Gemini will tailor your indoor air protection & emission-saving
                actions strictly to this tier.
              </p>

              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    tier: 'Zero-Cost Household Changes' as BudgetTier,
                    desc: 'Timed ventilation windows, damp mopping, cooking exhaust & behavioral shifts.',
                  },
                  {
                    tier: 'Mid-Range' as BudgetTier,
                    desc: 'N95/N99 masks, window draft sealing, DIY MERV-13 box-fan scrubbers.',
                  },
                  {
                    tier: 'HEPA Purifiers' as BudgetTier,
                    desc: 'True HEPA H13 air purifiers, indoor PM2.5 sensors & HVAC filtration.',
                  },
                ].map((item) => {
                  const active = budget === item.tier;
                  return (
                    <button
                      key={item.tier}
                      type="button"
                      onClick={() => setBudget(item.tier)}
                      className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        active
                          ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/10'
                          : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-500'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {item.tier}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {item.desc}
                        </div>
                      </div>
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ml-4 ${
                          active
                            ? 'bg-sky-500 text-white'
                            : 'border border-slate-600'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={handleStep1Next}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition cursor-pointer"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition cursor-pointer"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                Launch Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
