'use client';

import React, { useEffect } from 'react';
import {
  Bell,
  BookOpen,
  LayoutDashboard,
  MapPin,
  Users,
  Wind,
  X,
} from 'lucide-react';

export type ActiveView = 'dashboard' | 'profiles' | 'help' | 'account';

interface MenuDrawerProps {
  open: boolean;
  activeView: ActiveView;
  activeCity: string;
  careSpaceCount?: number;
  userEmail?: string | null;
  onSelectView: (view: ActiveView) => void;
  onClose: () => void;
  onEditProfile: () => void;
}

const NAV_ITEMS: Array<{
  id: ActiveView;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtitle: 'Live air & daily routine plan',
    icon: LayoutDashboard,
  },
  {
    id: 'profiles',
    label: 'Family Profiles',
    subtitle: 'Home, parents, college spaces',
    icon: Users,
  },
  {
    id: 'help',
    label: 'AQI Scale & Help',
    subtitle: 'CPCB bands, pollutants & FAQ',
    icon: BookOpen,
  },
  {
    id: 'account',
    label: 'Account & Alerts',
    subtitle: 'Sign-in & threshold alerts',
    icon: Bell,
  },
];

export default function MenuDrawer({
  open,
  activeView,
  activeCity,
  careSpaceCount,
  userEmail,
  onSelectView,
  onClose,
  onEditProfile,
}: MenuDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Subtle Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C1B18]/25 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Out Daylight Panel */}
      <aside
        role="dialog"
        aria-label="Navigation menu"
        className="relative z-50 w-72 sm:w-80 max-w-[85vw] h-full bg-[#FFFFFF] border-r border-[#E7E5E0] shadow-xl flex flex-col justify-between"
      >
        <div>
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-[#E7E5E0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
                <Wind className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#1C1B18]">
                  SmogSense
                </div>
                <div className="text-[11px] text-[#6B6860]">
                  Urban Air Assistant
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="h-8 w-8 rounded-lg text-[#6B6860] hover:text-[#1C1B18] hover:bg-[#F4F2ED] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    onClose();
                  }}
                  className={`w-full text-left flex items-start gap-3 px-3.5 py-3 rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#F4F2ED] text-[#1C1B18] font-medium'
                      : 'text-[#6B6860] hover:bg-[#FAF9F6] hover:text-[#1C1B18]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      isActive ? 'text-[#1C1B18]' : 'text-[#6B6860]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm leading-tight">{item.label}</span>
                      {item.id === 'profiles' &&
                        typeof careSpaceCount === 'number' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0]">
                            {careSpaceCount}
                          </span>
                        )}
                    </div>
                    <div className="text-[11px] text-[#6B6860] mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E7E5E0] bg-[#FAF9F6] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border truncate max-w-full ${
                userEmail
                  ? 'bg-[#EDF6F0] text-[#2E6F40] border-[#CBE6D3]'
                  : 'bg-[#FFFFFF] text-[#6B6860] border-[#E7E5E0]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  userEmail ? 'bg-[#2E6F40]' : 'bg-[#6B6860]'
                }`}
              />
              <span className="truncate">
                {userEmail ? `Synced · ${userEmail}` : 'Guest Mode (Local)'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6B6860]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1C1B18]" />
            <span className="truncate">
              Active City: <strong className="text-[#1C1B18]">{activeCity}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditProfile();
            }}
            className="w-full px-3.5 py-2 rounded-xl text-xs font-medium bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#1C1B18]/40 transition-colors cursor-pointer"
          >
            Edit Routine Profile
          </button>
        </div>
      </aside>
    </div>
  );
}
