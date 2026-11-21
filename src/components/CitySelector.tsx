'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Plus, Search } from 'lucide-react';
import { EXPANDED_INDIAN_CITIES, TOP_METRO_CITIES } from '@/types/air-quality';

interface CitySelectorProps {
  value: string;
  onChange: (city: string) => void;
  variant?: 'full' | 'compact';
}

export default function CitySelector({
  value,
  onChange,
  variant = 'full',
}: CitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [manualCity, setManualCity] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...EXPANDED_INDIAN_CITIES];
    return EXPANDED_INDIAN_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  const handleSelect = (cityName: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
    setQuery('');
    setManualCity('');
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualCity.trim() || query.trim();
    if (!trimmed) return;
    handleSelect(trimmed);
  };

  return (
    <div ref={containerRef} className="relative space-y-3">
      {variant === 'full' && (
        <div className="flex flex-wrap gap-2">
          {TOP_METRO_CITIES.map((metro) => {
            const active = value.toLowerCase() === metro.toLowerCase();
            return (
              <button
                key={metro}
                type="button"
                onClick={() => handleSelect(metro)}
                className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors border cursor-pointer ${
                  active
                    ? 'bg-[#1C1B18] text-white border-[#1C1B18]'
                    : 'bg-[#F4F2ED] text-[#1C1B18] border-[#E7E5E0] hover:border-[#1C1B18]/40'
                }`}
              >
                {metro}
              </button>
            );
          })}
        </div>
      )}

      {/* Searchable Dropdown Trigger */}
      <div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={
            variant === 'compact'
              ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#1C1B18]/40 transition-colors cursor-pointer'
              : 'w-full flex items-center justify-between rounded-xl bg-[#FFFFFF] border border-[#E7E5E0] hover:border-[#1C1B18]/40 px-3.5 py-2.5 text-sm text-[#1C1B18] transition-colors cursor-pointer'
          }
        >
          <span className="inline-flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-[#6B6860] shrink-0" />
            <span className="font-medium truncate">
              {value || 'Search 60+ Indian cities or type your own...'}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[#6B6860] shrink-0 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <div
            className={`absolute z-30 mt-1.5 rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] shadow-lg overflow-hidden ${
              variant === 'compact' ? 'w-72 sm:w-80 left-0' : 'w-full left-0'
            }`}
          >
            {/* Search Input */}
            <div className="p-2.5 border-b border-[#E7E5E0]">
              <div className="flex items-center gap-2 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3 py-2">
                <Search className="h-3.5 w-3.5 text-[#6B6860] shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search city (e.g. Kochi, Indore, Noida)..."
                  autoFocus
                  className="w-full bg-transparent text-xs sm:text-sm text-[#1C1B18] placeholder:text-[#6B6860] focus:outline-none"
                />
              </div>
            </div>

            {/* City List */}
            <div className="max-h-52 overflow-y-auto p-1.5">
              {filteredCities.length > 0 ? (
                filteredCities.map((c) => {
                  const active = value.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-between ${
                        active
                          ? 'bg-[#1C1B18] text-white font-medium'
                          : 'text-[#1C1B18] hover:bg-[#F4F2ED]'
                      }`}
                    >
                      <span>{c}</span>
                      {active && (
                        <span className="text-[10px] uppercase tracking-wider opacity-80">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-xs text-[#6B6860]">
                  No preset match for &ldquo;{query}&rdquo;. Add it below.
                </div>
              )}
            </div>

            {/* Manual City Input */}
            <div className="p-2.5 border-t border-[#E7E5E0] bg-[#FAF9F6]">
              <div className="text-[11px] font-medium text-[#6B6860] mb-1.5">
                Can&apos;t find your city? Type it manually
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  placeholder={query || 'Enter any Indian city or town'}
                  className="flex-1 rounded-xl bg-[#FFFFFF] border border-[#E7E5E0] px-3 py-1.5 text-xs text-[#1C1B18] placeholder:text-[#6B6860] focus:outline-none focus:border-[#1C1B18]"
                />
                <button
                  type="button"
                  onClick={() => handleManualSubmit()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1C1B18] text-white text-xs font-medium hover:bg-[#1C1B18]/90 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Use
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
