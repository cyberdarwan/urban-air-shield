'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import CitySelector from '@/components/CitySelector';
import MultiSelectChips from '@/components/MultiSelectChips';
import { SAFE_AQI_PRESETS, createCareSpaceId } from '@/lib/care-spaces';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type CareSpaceProfile,
} from '@/types/air-quality';

const LABEL_QUICK_FILLS = [
  'My Home',
  "Parents' Place",
  "Son's College",
  "Daughter's School",
  'Office Commute',
] as const;

interface CareSpaceFormProps {
  initialSpace: CareSpaceProfile | null;
  onSave: (space: CareSpaceProfile, isEdit: boolean) => void;
  onCancel: () => void;
}

/**
 * Accessible inline form for creating or editing a Family Care Space profile.
 */
export default function CareSpaceForm({
  initialSpace,
  onSave,
  onCancel,
}: CareSpaceFormProps) {
  const isEdit = Boolean(initialSpace);
  const [label, setLabel] = useState(initialSpace?.label ?? '');
  const [city, setCity] = useState(initialSpace?.city ?? 'New Delhi');
  const [town, setTown] = useState(initialSpace?.profile.location.town ?? '');
  const [safeAqiLimit, setSafeAqiLimit] = useState(
    initialSpace?.safeAqiLimit ?? 100
  );
  const [stepOutWindows, setStepOutWindows] = useState<string[]>(
    initialSpace?.profile.stepOutWindows?.length
      ? initialSpace.profile.stepOutWindows
      : ['Early Morning (6–9 AM)']
  );
  const [travelModes, setTravelModes] = useState<string[]>(
    initialSpace?.profile.travelModes?.length
      ? initialSpace.profile.travelModes
      : ['Bus / Walk']
  );
  const [householdMembers, setHouseholdMembers] = useState<string[]>(
    initialSpace?.profile.householdMembers?.length
      ? initialSpace.profile.householdMembers
      : ['Seniors (60+)']
  );
  const [healthSensitivities, setHealthSensitivities] = useState<string[]>(
    initialSpace?.profile.healthSensitivities?.length
      ? initialSpace.profile.healthSensitivities
      : ['None']
  );
  const [homeSurroundings, setHomeSurroundings] = useState<string[]>(
    initialSpace?.profile.homeSurroundings?.length
      ? initialSpace.profile.homeSurroundings
      : ['Quiet Residential / Gated']
  );
  const [existingProtection, setExistingProtection] = useState<string[]>(
    initialSpace?.profile.existingProtection?.length
      ? initialSpace.profile.existingProtection
      : ['None (Zero-Cost Tips Only)']
  );
  const [formError, setFormError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    const cleanCity = city.trim();
    if (!cleanLabel) {
      setFormError(
        "Please enter a Care Space name (e.g., Parents' Place or My Home)."
      );
      return;
    }
    if (!cleanCity) {
      setFormError('Please select a city.');
      return;
    }

    const now = new Date().toISOString();
    const nextSpace: CareSpaceProfile = {
      id: initialSpace?.id || createCareSpaceId(),
      label: cleanLabel,
      city: cleanCity,
      safeAqiLimit,
      notifyEnabled: initialSpace?.notifyEnabled,
      lastAlertStatus: initialSpace?.lastAlertStatus,
      profile: {
        mode: initialSpace?.profile.mode || 'personal',
        location: {
          city: cleanCity,
          town: town.trim() || undefined,
        },
        stepOutWindows:
          stepOutWindows.length > 0
            ? stepOutWindows
            : ['Office / College Hours (9 AM–6 PM)'],
        travelModes: travelModes.length > 0 ? travelModes : ['Bus / Walk'],
        householdMembers:
          householdMembers.length > 0 ? householdMembers : ['Just Me'],
        healthSensitivities:
          healthSensitivities.length > 0 ? healthSensitivities : ['None'],
        homeSurroundings:
          homeSurroundings.length > 0
            ? homeSurroundings
            : ['Quiet Residential / Gated'],
        existingProtection:
          existingProtection.length > 0
            ? existingProtection
            : ['None (Zero-Cost Tips Only)'],
        school: initialSpace?.profile.school,
        industry: initialSpace?.profile.industry,
        updatedAt: now,
      },
      updatedAt: now,
    };

    onSave(nextSpace, isEdit);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] p-6 space-y-5"
    >
      <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-3">
        <h3 className="text-sm font-bold text-[#0F172A]">
          {isEdit ? 'Edit Care Space' : 'Add New Care Space'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close Care Space form"
          className="h-7 w-7 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#F4F2ED] flex items-center justify-center cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="care-space-label"
          className="block text-xs font-semibold uppercase tracking-wider text-[#475569]"
        >
          Care Space Label
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {LABEL_QUICK_FILLS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setLabel(q)}
              className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                label === q
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-[#F4F2ED] text-[#0F172A] border-[#E7E5E0]'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
        <input
          id="care-space-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Parents' Place, Son's Hostel"
          className="w-full rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="care-space-town"
          className="block text-xs font-semibold uppercase tracking-wider text-[#475569]"
        >
          City &amp; Neighbourhood
        </label>
        <CitySelector value={city} onChange={setCity} variant="full" />
        <input
          id="care-space-town"
          type="text"
          value={town}
          onChange={(e) => setTown(e.target.value)}
          placeholder="Optional area (e.g., Gomti Nagar, Banjara Hills)"
          className="w-full rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="care-space-aqi-limit"
            className="text-xs font-semibold uppercase tracking-wider text-[#475569]"
          >
            Safe-to-Step-Out AQI Ceiling
          </label>
          <span className="text-xs font-bold text-[#0F172A] tabular-nums">
            ≤ {safeAqiLimit} AQI
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAFE_AQI_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setSafeAqiLimit(preset.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                safeAqiLimit === preset.value
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-[#F4F2ED] text-[#0F172A] border-[#E7E5E0]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          id="care-space-aqi-limit"
          type="range"
          min={40}
          max={250}
          step={10}
          value={safeAqiLimit}
          aria-valuetext={`Up to ${safeAqiLimit} AQI`}
          onChange={(e) => setSafeAqiLimit(Number(e.target.value))}
          className="w-full accent-[#0F172A]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiSelectChips
          variant="compact"
          title="When You Step Out"
          presets={STEP_OUT_WINDOWS}
          values={stepOutWindows}
          onChange={setStepOutWindows}
        />
        <MultiSelectChips
          variant="compact"
          title="How You Travel"
          presets={TRAVEL_MODES}
          values={travelModes}
          onChange={setTravelModes}
        />
        <MultiSelectChips
          variant="compact"
          title="Who Lives at Home"
          presets={HOUSEHOLD_MEMBERS}
          values={householdMembers}
          onChange={setHouseholdMembers}
          exclusiveItem="Just Me"
        />
        <MultiSelectChips
          variant="compact"
          title="Health Sensitivities"
          presets={HEALTH_SENSITIVITIES}
          values={healthSensitivities}
          onChange={setHealthSensitivities}
          exclusiveItem="None"
        />
        <MultiSelectChips
          variant="compact"
          title="Home Surroundings"
          presets={HOME_SURROUNDINGS}
          values={homeSurroundings}
          onChange={setHomeSurroundings}
        />
        <MultiSelectChips
          variant="compact"
          title="Protection Available"
          presets={EXISTING_PROTECTIONS}
          values={existingProtection}
          onChange={setExistingProtection}
          exclusiveItem="None (Zero-Cost Tips Only)"
        />
      </div>

      {formError && (
        <p role="alert" className="text-xs text-[#E11D48] font-medium">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5E0]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium bg-[#F4F2ED] text-[#0F172A] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-xs font-medium bg-[#0F172A] text-white cursor-pointer"
        >
          {isEdit ? 'Save Changes' : 'Create Care Space'}
        </button>
      </div>
    </form>
  );
}
