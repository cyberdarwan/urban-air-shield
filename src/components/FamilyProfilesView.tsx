'use client';

import React, { useState } from 'react';
import {
  Check,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import CitySelector from '@/components/CitySelector';
import { deduplicateCities } from '@/lib/alert-evaluator';
import { isAirSafe } from '@/lib/aqi-utils';
import {
  SAFE_AQI_PRESETS,
  createCareSpaceId,
  shareViaWhatsApp,
} from '@/lib/care-spaces';
import {
  formatFamilyRollupWhatsAppBrief,
  formatWhatsAppBrief,
} from '@/lib/whatsapp-formatter';
import {
  EXISTING_PROTECTIONS,
  HEALTH_SENSITIVITIES,
  HOME_SURROUNDINGS,
  HOUSEHOLD_MEMBERS,
  STEP_OUT_WINDOWS,
  TRAVEL_MODES,
  type AqiResponse,
  type CareSpaceProfile,
} from '@/types/air-quality';

interface FamilyProfilesViewProps {
  careSpaces: CareSpaceProfile[];
  activeCareSpaceId: string;
  onSelectSpace: (id: string, switchToDashboard?: boolean) => void;
  onSaveSpace: (space: CareSpaceProfile) => void;
  onDeleteSpace: (id: string) => void;
}

const LABEL_QUICK_FILLS = [
  'My Home',
  "Parents' Place",
  "Son's College",
  'Office',
];

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
    if (next.length === 0 && exclusiveItem) return [exclusiveItem];
    return next;
  }
  return [...withoutExclusive, item];
}

function ChipGroup({
  title,
  presets,
  values,
  onChange,
  exclusiveItem,
}: {
  title: string;
  presets: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  exclusiveItem?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const presetSet = new Set(presets);
  const customValues = values.filter((v) => !presetSet.has(v));

  const addCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    const base = exclusiveItem
      ? values.filter((v) => v !== exclusiveItem)
      : [...values];
    if (!base.includes(trimmed)) onChange([...base, trimmed]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((item) => {
          const active = values.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(toggleMulti(values, item, exclusiveItem))}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-[#F4F2ED] text-[#0F172A] border-[#E7E5E0] hover:border-[#0F172A]/40'
              }`}
            >
              {active && <Check className="h-3 w-3 shrink-0" />}
              <span>{item}</span>
            </button>
          );
        })}

        {customValues.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-medium bg-[#0F172A] text-white border border-[#0F172A]"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => {
                const next = values.filter((v) => v !== item);
                onChange(
                  next.length === 0 && exclusiveItem ? [exclusiveItem] : next
                );
              }}
              aria-label={`Remove ${item}`}
              className="p-0.5 rounded-full hover:bg-white/20 cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 backdrop-blur-md text-[#475569] border border-dashed border-[#E7E5E0] hover:border-[#0F172A]/40 hover:text-[#0F172A] cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Other
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              } else if (e.key === 'Escape') {
                setAdding(false);
                setDraft('');
              }
            }}
            placeholder="Add custom detail..."
            autoFocus
            className="flex-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
          />
          <button
            type="button"
            onClick={addCustom}
            className="px-3 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-medium cursor-pointer"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function FamilyProfilesView({
  careSpaces,
  activeCareSpaceId,
  onSelectSpace,
  onSaveSpace,
  onDeleteSpace,
}: FamilyProfilesViewProps) {
  const [cityAqiMap, setCityAqiMap] = useState<Record<string, AqiResponse>>({});
  const [refreshingRollup, setRefreshingRollup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Add/Edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [town, setTown] = useState('');
  const [safeAqiLimit, setSafeAqiLimit] = useState(100);
  const [stepOutWindows, setStepOutWindows] = useState<string[]>([
    'Office / College Hours (9 AM–6 PM)',
  ]);
  const [travelModes, setTravelModes] = useState<string[]>([
    'Metro / Local Train',
  ]);
  const [householdMembers, setHouseholdMembers] = useState<string[]>([
    'Just Me',
  ]);
  const [healthSensitivities, setHealthSensitivities] = useState<string[]>([
    'None',
  ]);
  const [homeSurroundings, setHomeSurroundings] = useState<string[]>([
    'Quiet Residential / Gated',
  ]);
  const [existingProtection, setExistingProtection] = useState<string[]>([
    'None (Zero-Cost Tips Only)',
  ]);
  const [formError, setFormError] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openNewForm = () => {
    setEditingId(null);
    setLabel('');
    setCity('New Delhi');
    setTown('');
    setSafeAqiLimit(100);
    setStepOutWindows(['Early Morning (6–9 AM)']);
    setTravelModes(['Bus / Walk']);
    setHouseholdMembers(['Seniors (60+)']);
    setHealthSensitivities(['None']);
    setHomeSurroundings(['Quiet Residential / Gated']);
    setExistingProtection(['None (Zero-Cost Tips Only)']);
    setFormError('');
    setFormOpen(true);
  };

  const openEditForm = (space: CareSpaceProfile) => {
    setEditingId(space.id);
    setLabel(space.label);
    setCity(space.city);
    setTown(space.profile.location.town || '');
    setSafeAqiLimit(space.safeAqiLimit);
    setStepOutWindows(space.profile.stepOutWindows);
    setTravelModes(space.profile.travelModes);
    setHouseholdMembers(space.profile.householdMembers);
    setHealthSensitivities(space.profile.healthSensitivities);
    setHomeSurroundings(space.profile.homeSurroundings);
    setExistingProtection(space.profile.existingProtection);
    setFormError('');
    setFormOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setFormError('Please enter a label (e.g., Parents’ Place).');
      return;
    }
    if (!city.trim()) {
      setFormError('Please select a city.');
      return;
    }
    const existing = editingId
      ? careSpaces.find((cs) => cs.id === editingId)
      : undefined;

    const now = new Date().toISOString();
    const nextSpace: CareSpaceProfile = {
      id: editingId || createCareSpaceId(),
      label: label.trim(),
      city: city.trim(),
      safeAqiLimit,
      profile: {
        mode: existing?.profile.mode ?? 'personal',
        location: {
          city: city.trim(),
          town: town.trim() || undefined,
        },
        stepOutWindows:
          stepOutWindows.length > 0
            ? stepOutWindows
            : ['Office / College Hours (9 AM–6 PM)'],
        travelModes:
          travelModes.length > 0 ? travelModes : ['Metro / Local Train'],
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
        school: existing?.profile.school,
        industry: existing?.profile.industry,
        updatedAt: now,
      },
      updatedAt: now,
    };

    onSaveSpace(nextSpace);
    setFormOpen(false);
    showToast(editingId ? 'Care Space updated' : 'Care Space added');
  };

  const refreshAllFamilyCities = async () => {
    setRefreshingRollup(true);
    try {
      const uniqueCities = deduplicateCities(careSpaces);
      const entries = await Promise.all(
        uniqueCities.map(async (c) => {
          const res = await fetch(
            `/api/aqi?city=${encodeURIComponent(c)}`,
            { cache: 'no-store' }
          );
          const data = (await res.json()) as AqiResponse;
          return [c.toLowerCase(), data] as const;
        })
      );
      setCityAqiMap(Object.fromEntries(entries));
    } catch {
      showToast('Could not refresh all cities right now');
    } finally {
      setRefreshingRollup(false);
    }
  };

  const handleShareSingle = async (space: CareSpaceProfile) => {
    let data = cityAqiMap[space.city.toLowerCase()];
    if (!data) {
      try {
        const res = await fetch(
          `/api/aqi?city=${encodeURIComponent(space.city)}`,
          { cache: 'no-store' }
        );
        data = (await res.json()) as AqiResponse;
        setCityAqiMap((prev) => ({
          ...prev,
          [space.city.toLowerCase()]: data,
        }));
      } catch {
        showToast('Could not fetch AQI to share');
        return;
      }
    }
    const brief = formatWhatsAppBrief(space, data);
    const result = await shareViaWhatsApp(brief);
    if (result === 'copied') {
      showToast('Air brief copied to clipboard');
    }
  };

  const handleShareRollup = async () => {
    const brief = formatFamilyRollupWhatsAppBrief(careSpaces, cityAqiMap);
    const result = await shareViaWhatsApp(brief);
    if (result === 'copied') {
      showToast('Family air check-in copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#0F172A] text-white text-xs font-medium shadow-md">
          {toast}
        </div>
      )}

      {/* Live Multi-City Family Rollup Card */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Family Care Spaces Rollup
            </h2>
            <p className="text-xs text-[#475569]">
              Compare live air across every home, parent, or college city at once
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAllFamilyCities}
              disabled={refreshingRollup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshingRollup ? 'animate-spin' : ''}`}
              />
              Refresh All Family Cities
            </button>
            <button
              type="button"
              onClick={handleShareRollup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share All Family Places on WhatsApp
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {careSpaces.map((space) => {
            const live = cityAqiMap[space.city.trim().toLowerCase()];
            const isOk = live ? isAirSafe(live.aqi, space.safeAqiLimit) : null;
            return (
              <div
                key={space.id}
                className="rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] hover:border-[#D6D3CD] hover:shadow-sm transition-all p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#0F172A] truncate">
                    {space.label}
                  </span>
                  <span className="text-[11px] text-[#475569] shrink-0">
                    Limit ≤ {space.safeAqiLimit}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#475569]">
                  <MapPin className="h-3 w-3 shrink-0 text-[#059669]" />
                  <span>{space.city}</span>
                </div>
                {live ? (
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-[#0F172A] tabular-nums">
                      {live.aqi}{' '}
                      <span className="text-xs font-normal text-[#475569]">
                        ({live.category})
                      </span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        isOk
                          ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                          : 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]'
                      }`}
                    >
                      {isOk ? 'Okay to Move Out' : 'Caution / Stay Indoors'}
                    </span>
                  </div>
                ) : (
                  <div className="pt-1 text-xs text-[#475569]">
                    Tap &ldquo;Refresh All Family Cities&rdquo; for live verdict
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Care Space Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#059669]" />
            <h2 className="text-base font-bold text-[#0F172A]">
              Saved Care Spaces ({careSpaces.length})
            </h2>
          </div>
          {!formOpen && (
            <button
              type="button"
              onClick={openNewForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#059669] text-white hover:bg-[#047857] shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Care Space
            </button>
          )}
        </div>

        {/* Add / Edit Inline Form */}
        {formOpen && (
          <form
            onSubmit={handleSaveForm}
            className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E7E5E0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {editingId ? 'Edit Care Space' : 'Add New Care Space'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                aria-label="Close Care Space form"
                className="h-7 w-7 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-[#F4F2ED] flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
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
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Parents' Place, Son's Hostel"
                className="w-full rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#475569]">
                City &amp; Neighbourhood
              </label>
              <CitySelector value={city} onChange={setCity} variant="full" />
              <input
                type="text"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                placeholder="Optional area (e.g., Gomti Nagar, Banjara Hills)"
                className="w-full rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
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
                type="range"
                min={40}
                max={250}
                step={10}
                value={safeAqiLimit}
                onChange={(e) => setSafeAqiLimit(Number(e.target.value))}
                className="w-full accent-[#0F172A]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChipGroup
                title="When You Step Out"
                presets={STEP_OUT_WINDOWS}
                values={stepOutWindows}
                onChange={setStepOutWindows}
              />
              <ChipGroup
                title="How You Travel"
                presets={TRAVEL_MODES}
                values={travelModes}
                onChange={setTravelModes}
              />
              <ChipGroup
                title="Who Lives at Home"
                presets={HOUSEHOLD_MEMBERS}
                values={householdMembers}
                onChange={setHouseholdMembers}
                exclusiveItem="Just Me"
              />
              <ChipGroup
                title="Health Sensitivities"
                presets={HEALTH_SENSITIVITIES}
                values={healthSensitivities}
                onChange={setHealthSensitivities}
                exclusiveItem="None"
              />
              <ChipGroup
                title="Home Surroundings"
                presets={HOME_SURROUNDINGS}
                values={homeSurroundings}
                onChange={setHomeSurroundings}
              />
              <ChipGroup
                title="Protection Available"
                presets={EXISTING_PROTECTIONS}
                values={existingProtection}
                onChange={setExistingProtection}
                exclusiveItem="None (Zero-Cost Tips Only)"
              />
            </div>

            {formError && (
              <p className="text-xs text-[#E11D48] font-medium">{formError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5E0]">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#F4F2ED] text-[#0F172A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-medium bg-[#0F172A] text-white cursor-pointer"
              >
                {editingId ? 'Save Changes' : 'Create Care Space'}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {careSpaces.map((space) => {
            const isActive = space.id === activeCareSpaceId;
            const tags = [
              ...space.profile.householdMembers.filter((m) => m !== 'Just Me'),
              ...space.profile.healthSensitivities.filter((s) => s !== 'None'),
              ...space.profile.travelModes.slice(0, 1),
            ].slice(0, 4);

            return (
              <div
                key={space.id}
                className={`rounded-2xl bg-white/80 backdrop-blur-md border p-5 space-y-4 ${
                  isActive ? 'border-[#0F172A]' : 'border-[#E7E5E0]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#0F172A]">
                        {space.label}
                      </h3>
                      {isActive && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0F172A] text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">
                      {space.city}
                      {space.profile.location.town
                        ? ` · ${space.profile.location.town}`
                        : ''}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F4F2ED] text-[#0F172A] border border-[#E7E5E0] shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
                    ≤ {space.safeAqiLimit} AQI
                  </span>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#475569] border border-[#E7E5E0]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E7E5E0]">
                  <button
                    type="button"
                    onClick={() => onSelectSpace(space.id, true)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#0F172A] text-white hover:bg-[#0F172A]/90 transition-colors cursor-pointer"
                  >
                    {isActive ? 'View Dashboard' : 'Switch to Dashboard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(space)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F4F2ED] text-[#0F172A] border border-[#E7E5E0] hover:border-[#0F172A]/40 transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareSingle(space)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#E1F1E6] transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3 w-3" />
                    Share Brief
                  </button>
                  {careSpaces.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSpace(space.id)}
                      aria-label={`Delete ${space.label}`}
                      className="ml-auto p-1.5 rounded-lg text-[#475569] hover:text-[#E11D48] hover:bg-[#FFF1F2] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
