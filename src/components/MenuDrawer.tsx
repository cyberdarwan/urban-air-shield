'use client';

import React, { useEffect } from 'react';
import {
  Bell,
  BookOpen,
  Flame,
  Info,
  LayoutDashboard,
  MapPin,
  RefreshCw,
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
  loadingAqi: boolean;
  simulateSevere: boolean;
  onSelectView: (view: ActiveView) => void;
  onClose: () => void;
  onRefresh: () => void;
  onToggleSimulate: () => void;
  onOpenLanding: () => void;
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
  loadingAqi,
  simulateSevere,
  onSelectView,
  onClose,
  onRefresh,
  onToggleSimulate,
  onOpenLanding,
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
        className="fixed inset-0 bg-[#0F172A]/25 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Out Atmospheric Daylight Panel */}
      <aside
        role="dialog"
        aria-label="Navigation menu"
        className="relative z-50 w-72 sm:w-80 max-w-[85vw] h-full bg-[#FAF9F6]/95 backdrop-blur-xl border-r border-[#E7E5E0] shadow-xl flex flex-col justify-between"
      >
        <div className="overflow-y-auto">
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-[#E7E5E0] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/80 border border-[#E7E5E0] shadow-sm flex items-center justify-center text-[#059669]">
                <Wind className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#0F172A]">
                  SmogSense
                </div>
                <div className="text-[11px] text-[#475569]">
                  Urban Air Assistant
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="h-8 w-8 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-white/80 flex items-center justify-center transition-colors cursor-pointer"
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
                  className={`w-full text-left flex items-start gap-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] font-medium shadow-sm'
                      : 'border-transparent text-[#475569] hover:bg-white/80 hover:text-[#0F172A]'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      isActive ? 'text-[#059669]' : 'text-[#475569]'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm leading-tight">{item.label}</span>
                      {item.id === 'profiles' &&
                        typeof careSpaceCount === 'number' && (
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                              isActive
                                ? 'bg-white/90 text-[#059669] border-[#A7F3D0]'
                                : 'bg-white/80 text-[#0F172A] border-[#E7E5E0]'
                            }`}
                          >
                            {careSpaceCount}
                          </span>
                        )}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        isActive ? 'text-[#059669]/80' : 'text-[#475569]'
                      }`}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick Controls */}
          <div className="px-4 py-3 border-t border-[#E7E5E0] space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              Quick Controls
            </div>

            <button
              type="button"
              onClick={() => {
                onRefresh();
                onClose();
              }}
              disabled={loadingAqi}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white/80 text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Refresh Live AQI</span>
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#059669] ${
                  loadingAqi ? 'animate-spin' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={onToggleSimulate}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border shadow-sm transition-all cursor-pointer ${
                simulateSevere
                  ? 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]'
                  : 'bg-white/80 text-[#0F172A] border-[#E7E5E0] hover:border-[#D6D3CD]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5" />
                Simulate Severe Smog
              </span>
              <span className="text-[11px] font-semibold">
                {simulateSevere ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLanding();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white/80 text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm transition-all cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#475569]" />
                About / Welcome Screen
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E7E5E0] bg-white/60 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full border truncate max-w-full ${
                userEmail
                  ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                  : 'bg-white/80 text-[#475569] border-[#E7E5E0]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  userEmail ? 'bg-[#059669]' : 'bg-[#475569]'
                }`}
              />
              <span className="truncate">
                {userEmail ? `Synced · ${userEmail}` : 'Guest Mode (Local)'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
            <span className="truncate">
              Active City: <strong className="text-[#0F172A]">{activeCity}</strong>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}
