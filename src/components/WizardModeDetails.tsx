'use client';

import React from 'react';
import type {
  IndustryProfile,
  SchoolProfile,
  SupportMode,
} from '@/types/air-quality';

interface WizardModeDetailsProps {
  mode: SupportMode;
  school: SchoolProfile;
  industry: IndustryProfile;
  onChangeSchool: (next: SchoolProfile) => void;
  onChangeIndustry: (next: IndustryProfile) => void;
}

const STUDENT_GROUPS: ReadonlyArray<SchoolProfile['studentGroup']> = [
  'Primary (Ages 5-10)',
  'Middle & High (Ages 11-17)',
  'College & University',
];

const FACILITY_TYPES: ReadonlyArray<IndustryProfile['facilityType']> = [
  'Office & IT Park',
  'Manufacturing & Warehouse',
  'Construction & Logistics',
];

/**
 * Renders optional school or workplace details during Onboarding Step 2.
 */
export default function WizardModeDetails({
  mode,
  school,
  industry,
  onChangeSchool,
  onChangeIndustry,
}: WizardModeDetailsProps) {
  if (mode === 'school') {
    return (
      <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          School / Campus Details
        </div>
        <div className="flex flex-wrap gap-2">
          {STUDENT_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              aria-pressed={school.studentGroup === group}
              onClick={() => onChangeSchool({ ...school, studentGroup: group })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                school.studentGroup === group
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-white text-[#0F172A] border-[#E7E5E0]'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'industry') {
    return (
      <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] p-4 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          Workplace / Site Details
        </div>
        <div className="flex flex-wrap gap-2">
          {FACILITY_TYPES.map((facility) => (
            <button
              key={facility}
              type="button"
              aria-pressed={industry.facilityType === facility}
              onClick={() =>
                onChangeIndustry({ ...industry, facilityType: facility })
              }
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                industry.facilityType === facility
                  ? 'bg-[#059669] text-white border-[#059669]'
                  : 'bg-white text-[#0F172A] border-[#E7E5E0]'
              }`}
            >
              {facility}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
