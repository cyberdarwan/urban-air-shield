'use client';

import React, { useState } from 'react';
import {
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import CareSpaceForm from '@/components/CareSpaceForm';
import { deduplicateCities } from '@/lib/alert-evaluator';
import { isAirSafe } from '@/lib/aqi-utils';
import { shareViaWhatsApp } from '@/lib/care-spaces';
import {
  formatFamilyRollupWhatsAppBrief,
  formatWhatsAppBrief,
} from '@/lib/whatsapp-formatter';
import type { AqiResponse, CareSpaceProfile } from '@/types/air-quality';

interface FamilyProfilesViewProps {
  careSpaces: CareSpaceProfile[];
  activeCareSpaceId: string;
  onSelectSpace: (id: string, switchToDashboard?: boolean) => void;
  onSaveSpace: (space: CareSpaceProfile) => void;
  onDeleteSpace: (id: string) => void;
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<CareSpaceProfile | null>(
    null
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const openNewForm = () => {
    setEditingSpace(null);
    setFormOpen(true);
  };

  const openEditForm = (space: CareSpaceProfile) => {
    setEditingSpace(space);
    setFormOpen(true);
  };

  const handleSave = (space: CareSpaceProfile, isEdit: boolean) => {
    onSaveSpace(space);
    setFormOpen(false);
    setEditingSpace(null);
    showToast(isEdit ? 'Care Space updated' : 'Care Space added');
  };

  const refreshAllFamilyCities = async () => {
    setRefreshingRollup(true);
    try {
      const uniqueCities = deduplicateCities(careSpaces);
      const entries = await Promise.all(
        uniqueCities.map(async (c) => {
          const res = await fetch(
            `/api/aqi?city=${encodeURIComponent(c)}&refresh=1`,
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
    let data = cityAqiMap[space.city.trim().toLowerCase()];
    if (!data) {
      try {
        const res = await fetch(
          `/api/aqi?city=${encodeURIComponent(space.city)}`,
          { cache: 'no-store' }
        );
        data = (await res.json()) as AqiResponse;
        setCityAqiMap((prev) => ({
          ...prev,
          [space.city.trim().toLowerCase()]: data,
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
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#0F172A] text-white text-xs font-medium shadow-md"
        >
          {toast}
        </div>
      )}

      {/* Family Multi-City Rollup Banner */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Family Air Check-In
            </h2>
            <p className="text-xs text-[#475569]">
              Compare live AQI against each loved one&apos;s personal safe ceiling
              and share a one-tap WhatsApp brief.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshAllFamilyCities}
              disabled={refreshingRollup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#059669] ${refreshingRollup ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {refreshingRollup ? 'Checking Cities...' : 'Refresh All Family Cities'}
            </button>
            <button
              type="button"
              onClick={handleShareRollup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Share Family Check-In
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
                  <MapPin
                    className="h-3 w-3 shrink-0 text-[#059669]"
                    aria-hidden="true"
                  />
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
            <Users className="h-4 w-4 text-[#059669]" aria-hidden="true" />
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
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Care Space
            </button>
          )}
        </div>

        {/* Add / Edit Inline Form */}
        {formOpen && (
          <CareSpaceForm
            key={editingSpace?.id ?? 'new'}
            initialSpace={editingSpace}
            onSave={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingSpace(null);
            }}
          />
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
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-[#059669]"
                      aria-hidden="true"
                    />
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
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareSingle(space)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#E1F1E6] transition-colors cursor-pointer"
                  >
                    <Share2 className="h-3 w-3" aria-hidden="true" />
                    Share Brief
                  </button>
                  {careSpaces.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteSpace(space.id)}
                      aria-label={`Delete ${space.label}`}
                      className="ml-auto p-1.5 rounded-lg text-[#475569] hover:text-[#E11D48] hover:bg-[#FFF1F2] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
