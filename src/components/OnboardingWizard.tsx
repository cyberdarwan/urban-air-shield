'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Plus,
  Users,
  Wind,
  X,
} from 'lucide-react';
import CitySelector from '@/components/CitySelector';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type IndustryProfile,
  type SchoolProfile,
  type SupportMode,
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

function toggleMulti(
  current: string[],
  item: string,
  exclusiveItem?: string
): string[] {
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

function MultiSelectSection({
  title,
  presets,
  values,
  onChange,
  exclusiveItem,
  placeholder,
}: {
  title: string;
  presets: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  exclusiveItem?: string;
  placeholder: string;
}) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [draft, setDraft] = useState('');

  const presetSet = new Set(presets);
  const customValues = values.filter((v) => !presetSet.has(v));

  const commitCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setAddingCustom(false);
      return;
    }
    const withoutExclusive = exclusiveItem
      ? values.filter((v) => v !== exclusiveItem)
      : [...values];
    if (!withoutExclusive.includes(trimmed)) {
      onChange([...withoutExclusive, trimmed]);
    }
    setDraft('');
    setAddingCustom(false);
  };

  const removeCustom = (item: string) => {
    const next = values.filter((v) => v !== item);
    if (next.length === 0 && exclusiveItem) {
      onChange([exclusiveItem]);
    } else {
      onChange(next);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          {title}
        </h2>
        <span className="text-[11px] font-medium text-[#475569]">
          Select all that apply
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((item) => {
          const active = values.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(toggleMulti(values, item, exclusiveItem))}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border cursor-pointer ${
                active
                  ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                  : 'bg-[#FAF9F6] text-[#0F172A] border-[#E7E5E0] hover:border-[#D6D3CD]'
              }`}
            >
              {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              <span>{item}</span>
            </button>
          );
        })}

        {customValues.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1.5 pl-3.5 pr-2 py-2 rounded-full text-xs sm:text-sm font-medium bg-[#059669] text-white border border-[#059669] shadow-sm"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeCustom(item)}
              aria-label={`Remove ${item}`}
              className="p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {!addingCustom && (
          <button
            type="button"
            onClick={() => setAddingCustom(true)}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium bg-white/80 text-[#475569] border border-dashed border-[#E7E5E0] hover:border-[#059669] hover:text-[#059669] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Other / Custom</span>
          </button>
        )}
      </div>

      {addingCustom && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitCustom();
              } else if (e.key === 'Escape') {
                setAddingCustom(false);
                setDraft('');
              }
            }}
            placeholder={placeholder}
            autoFocus
            className="flex-1 rounded-xl bg-white/90 border border-[#E7E5E0] px-3.5 py-2 text-xs sm:text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
          />
          <button
            type="button"
            onClick={commitCustom}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAddingCustom(false);
              setDraft('');
            }}
            className="px-2.5 py-2 rounded-xl text-xs text-[#475569] hover:text-[#0F172A] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
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
  const [city, setCity] = useState<string>(
    initialProfile?.location?.city || 'New Delhi'
  );
  const [town, setTown] = useState(initialProfile?.location?.town ?? '');

  const [stepOutWindows, setStepOutWindows] = useState<string[]>(
    initialProfile?.stepOutWindows?.length
      ? initialProfile.stepOutWindows
      : ['Office / College Hours (9 AM–6 PM)']
  );
  const [travelModes, setTravelModes] = useState<string[]>(
    initialProfile?.travelModes?.length
      ? initialProfile.travelModes
      : ['Metro / Local Train']
  );
  const [householdMembers, setHouseholdMembers] = useState<string[]>(
    initialProfile?.householdMembers?.length
      ? initialProfile.householdMembers
      : ['Just Me']
  );
  const [healthSensitivities, setHealthSensitivities] = useState<string[]>(
    initialProfile?.healthSensitivities?.length
      ? initialProfile.healthSensitivities
      : ['None']
  );
  const [homeSurroundings, setHomeSurroundings] = useState<string[]>(
    initialProfile?.homeSurroundings?.length
      ? initialProfile.homeSurroundings
      : ['Quiet Residential / Gated']
  );
  const [existingProtection, setExistingProtection] = useState<string[]>(
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
    if (!city.trim()) {
      setStepError('Please select or enter your city.');
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
        city: city.trim(),
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
    <div className="relative min-h-screen overflow-hidden bg-[#FAF9F6] text-[#0F172A] flex items-center justify-center px-4 py-10">
      {/* Ambient Atmospheric Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-drift-slow absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[#10B981]/12 blur-3xl" />
        <div className="animate-drift-reverse absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#F59E0B]/10 blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[#E7E5E0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
              <Wind className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#0F172A]">
                SmogSense Setup
              </h1>
              <p className="text-xs text-[#475569]">
                Tailored to your real daily routine · Saved locally
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-full">
              Step {step} of 3
            </span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-[#475569] hover:text-[#0F172A] px-2 py-1 rounded-lg hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Emerald Progress Bar */}
        <div className="h-1 w-full bg-[#E7E5E0]/60">
          <div
            className="h-full bg-[#059669] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-7">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Your City
                </h2>
                <CitySelector value={city} onChange={setCity} variant="full" />
                <div className="pt-1">
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    Neighbourhood / Area (optional)
                  </label>
                  <input
                    type="text"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="e.g., Indiranagar, Bandra, Jubilee Hills, Rohini"
                    className="w-full rounded-xl bg-white/90 border border-[#E7E5E0] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                  Who is this plan for?
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'personal' as const,
                      title: 'Personal & Family',
                      desc: 'Commute & home',
                      icon: Users,
                    },
                    {
                      id: 'school' as const,
                      title: 'School & College',
                      desc: 'Classes & games',
                      icon: GraduationCap,
                    },
                    {
                      id: 'industry' as const,
                      title: 'Workplace & Site',
                      desc: 'Shifts & team care',
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
                        className={`text-left rounded-xl p-3 border transition-all cursor-pointer ${
                          active
                            ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] shadow-sm'
                            : 'bg-[#FAF9F6] text-[#0F172A] border-[#E7E5E0] hover:border-[#D6D3CD]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 mb-1.5 ${
                            active ? 'text-[#059669]' : 'text-[#475569]'
                          }`}
                        />
                        <div className="font-semibold text-xs sm:text-sm">
                          {item.title}
                        </div>
                        <div
                          className={`text-[11px] ${
                            active ? 'text-[#059669]/80' : 'text-[#475569]'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <MultiSelectSection
                title="When You Step Out"
                presets={STEP_OUT_WINDOWS}
                values={stepOutWindows}
                onChange={setStepOutWindows}
                placeholder="e.g., Night shift 11 PM–7 AM"
              />

              {stepError && (
                <p className="text-xs text-[#E11D48] font-medium">{stepError}</p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Next: Travel &amp; Household
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <MultiSelectSection
                title="How You Travel"
                presets={TRAVEL_MODES}
                values={travelModes}
                onChange={setTravelModes}
                placeholder="e.g., Electric scooter, Company shuttle"
              />

              <MultiSelectSection
                title="Who Lives at Home"
                presets={HOUSEHOLD_MEMBERS}
                values={householdMembers}
                onChange={setHouseholdMembers}
                exclusiveItem="Just Me"
                placeholder="e.g., Toddler with nebulizer, Pet dog"
              />

              <MultiSelectSection
                title="Health Sensitivities"
                presets={HEALTH_SENSITIVITIES}
                values={healthSensitivities}
                onChange={setHealthSensitivities}
                exclusiveItem="None"
                placeholder="e.g., Mild bronchitis, Dry cough at night"
              />

              {mode === 'school' && (
                <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                    School / Campus Details
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'Primary (Ages 5-10)',
                        'Middle & High (Ages 11-17)',
                        'College & University',
                      ] as const
                    ).map((g) => {
                      const active = school.studentGroup === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            setSchool((s) => ({ ...s, studentGroup: g }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#059669] text-white border-[#059669]'
                              : 'bg-white text-[#0F172A] border-[#E7E5E0]'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === 'industry' && (
                <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                    Workplace / Site Details
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        'Office & IT Park',
                        'Manufacturing & Warehouse',
                        'Construction & Logistics',
                      ] as const
                    ).map((f) => {
                      const active = industry.facilityType === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() =>
                            setIndustry((ind) => ({ ...ind, facilityType: f }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#059669] text-white border-[#059669]'
                              : 'bg-white text-[#0F172A] border-[#E7E5E0]'
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {stepError && (
                <p className="text-xs text-[#E11D48] font-medium">{stepError}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStepError('');
                    setStep(1);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/80 border border-[#E7E5E0] hover:border-[#D6D3CD] text-[#0F172A] text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  Next: Home &amp; Protection
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <MultiSelectSection
                title="Home Surroundings"
                presets={HOME_SURROUNDINGS}
                values={homeSurroundings}
                onChange={setHomeSurroundings}
                placeholder="e.g., Stone crusher unit nearby, Open drain"
              />

              <MultiSelectSection
                title="Protection You Already Have"
                presets={EXISTING_PROTECTIONS}
                values={existingProtection}
                onChange={setExistingProtection}
                exclusiveItem="None (Zero-Cost Tips Only)"
                placeholder="e.g., Wet cloth on window, Indoor plants"
              />

              {stepError && (
                <p className="text-xs text-[#E11D48] font-medium">{stepError}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStepError('');
                    setStep(2);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/80 border border-[#E7E5E0] hover:border-[#D6D3CD] text-[#0F172A] text-sm font-medium transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer"
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
