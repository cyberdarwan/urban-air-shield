'use client';

import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';

export function toggleMultiSelection(
  current: string[],
  item: string,
  exclusiveItem?: string
): string[] {
  if (exclusiveItem && item === exclusiveItem) {
    return [exclusiveItem];
  }
  const withoutExclusive = exclusiveItem
    ? current.filter((v) => v !== exclusiveItem)
    : current;
  if (withoutExclusive.includes(item)) {
    const next = withoutExclusive.filter((v) => v !== item);
    if (next.length === 0 && exclusiveItem) {
      return [exclusiveItem];
    }
    return next;
  }
  return [...withoutExclusive, item];
}

interface MultiSelectChipsProps {
  title: string;
  presets: readonly string[];
  values: string[];
  onChange: (next: string[]) => void;
  exclusiveItem?: string;
  placeholder?: string;
  variant?: 'wizard' | 'compact';
}

/**
 * Shared accessible multi-select chip group supporting preset options and custom entries.
 */
export default function MultiSelectChips({
  title,
  presets,
  values,
  onChange,
  exclusiveItem,
  placeholder = 'Type custom detail...',
  variant = 'wizard',
}: MultiSelectChipsProps) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [draft, setDraft] = useState('');

  const presetSet = new Set(presets);
  const customValues = values.filter((v) => !presetSet.has(v));
  const isCompact = variant === 'compact';

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
    <div className={isCompact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between">
        {isCompact ? (
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
            {title}
          </div>
        ) : (
          <>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              {title}
            </h2>
            <span className="text-[11px] font-medium text-[#475569]">
              Select all that apply
            </span>
          </>
        )}
      </div>

      <div className={isCompact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'}>
        {presets.map((item) => {
          const active = values.includes(item);
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(toggleMultiSelection(values, item, exclusiveItem))
              }
              className={
                isCompact
                  ? `inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                        : 'bg-[#FAF9F6] text-[#0F172A] border-[#E7E5E0] hover:border-[#D6D3CD]'
                    }`
                  : `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all border cursor-pointer ${
                      active
                        ? 'bg-[#059669] text-white border-[#059669] shadow-sm'
                        : 'bg-[#FAF9F6] text-[#0F172A] border-[#E7E5E0] hover:border-[#D6D3CD]'
                    }`
              }
            >
              {active && (
                <Check
                  className={isCompact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'}
                  aria-hidden="true"
                />
              )}
              <span>{item}</span>
            </button>
          );
        })}

        {customValues.map((item) => (
          <span
            key={item}
            className={
              isCompact
                ? 'inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 rounded-full text-xs font-medium bg-[#059669] text-white border border-[#059669] shadow-sm'
                : 'inline-flex items-center gap-1.5 pl-3.5 pr-2 py-2 rounded-full text-xs sm:text-sm font-medium bg-[#059669] text-white border border-[#059669] shadow-sm'
            }
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeCustom(item)}
              aria-label={`Remove ${item}`}
              className="p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        {!addingCustom && (
          <button
            type="button"
            onClick={() => setAddingCustom(true)}
            className={
              isCompact
                ? 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-white/80 text-[#475569] border border-dashed border-[#E7E5E0] hover:border-[#059669] hover:text-[#059669] transition-colors cursor-pointer'
                : 'inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium bg-white/80 text-[#475569] border border-dashed border-[#E7E5E0] hover:border-[#059669] hover:text-[#059669] transition-colors cursor-pointer'
            }
          >
            <Plus className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" />
            <span>{isCompact ? 'Other' : 'Other / Custom'}</span>
          </button>
        )}
      </div>

      {addingCustom && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`Add custom ${title.toLowerCase()}`}
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
            {!isCompact && <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
            Add
          </button>
          {!isCompact && (
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
          )}
        </div>
      )}
    </div>
  );
}
