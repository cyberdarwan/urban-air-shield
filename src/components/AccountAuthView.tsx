'use client';

import React, { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  CheckCircle2,
  Cloud,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from '@/lib/supabase/client';
import type { CareSpaceProfile } from '@/types/air-quality';

interface AccountAuthViewProps {
  user: User | null;
  careSpaces: CareSpaceProfile[];
  syncing: boolean;
  onSyncNow: () => Promise<void>;
  onToggleNotify: (spaceId: string, enabled: boolean) => void;
  onSignOut: () => Promise<void>;
}

export default function AccountAuthView({
  user,
  careSpaces,
  syncing,
  onSyncNow,
  onToggleNotify,
  onSignOut,
}: AccountAuthViewProps) {
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState('');
  const supabaseReady = isSupabaseConfigured();

  const handleGoogleSignIn = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setAuthError(error.message);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setAuthError('Please enter your email address.');
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSendingLink(true);
    setAuthError('');
    setLinkSent(false);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setAuthError(error.message);
      } else {
        setLinkSent(true);
      }
    } finally {
      setSendingLink(false);
    }
  };

  if (!supabaseReady) {
    return (
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
            <Cloud className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1B18]">
              Guest Mode Active (Cloud Sync Ready)
            </h2>
            <p className="text-xs text-[#6B6860]">
              Your {careSpaces.length} Care Space{careSpaces.length === 1 ? '' : 's'} are saved privately in your browser.
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#6B6860] leading-relaxed">
          To enable passwordless Google &amp; Email Magic Link sign-in and
          cross-device cloud sync, add{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#F4F2ED] text-[#1C1B18]">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#F4F2ED] text-[#1C1B18]">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{' '}
          in your environment variables and run{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#F4F2ED] text-[#1C1B18]">
            supabase/schema.sql
          </code>
          .
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 sm:p-8 max-w-xl space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#F4F2ED] text-[#1C1B18] border border-[#E7E5E0]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#2E6F40]" />
            Passwordless Sign-In
          </div>
          <h2 className="text-lg font-bold text-[#1C1B18]">
            Sync Your Care Spaces Across Devices
          </h2>
          <p className="text-xs sm:text-sm text-[#6B6860] leading-relaxed">
            Your saved Care Spaces ({careSpaces.length}) will automatically sync
            to your account upon sign-in.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1C1B18] hover:bg-[#1C1B18]/90 text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E7E5E0]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#6B6860]">
            Or use email magic link
          </span>
          <div className="h-px flex-1 bg-[#E7E5E0]" />
        </div>

        <form onSubmit={handleMagicLink} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2.5 text-sm text-[#1C1B18] placeholder:text-[#6B6860] focus:outline-none focus:border-[#1C1B18]"
            />
            <button
              type="submit"
              disabled={sendingLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F4F2ED] hover:bg-[#E7E5E0] text-[#1C1B18] border border-[#E7E5E0] text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {sendingLink ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>

          {linkSent && (
            <div className="rounded-xl bg-[#EDF6F0] border border-[#CBE6D3] p-3 text-xs text-[#2E6F40] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Magic link sent to <strong>{email}</strong>. Open it on this
                device to complete sign-in.
              </span>
            </div>
          )}

          {authError && (
            <p className="text-xs text-[#B91C1C] font-medium">{authError}</p>
          )}
        </form>
      </section>
    );
  }

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null;

  return (
    <div className="space-y-6">
      {/* Account Summary Card */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.email || 'Account'}
                className="h-10 w-10 rounded-full border border-[#E7E5E0] object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#1C1B18] text-white flex items-center justify-center text-sm font-bold">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#1C1B18]">
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF6F0] text-[#2E6F40] border border-[#CBE6D3]">
                  <Cloud className="h-3 w-3" />
                  Synced to Cloud
                </span>
              </div>
              <p className="text-xs text-[#6B6860] mt-0.5">
                {careSpaces.length} Care Space
                {careSpaces.length === 1 ? '' : 's'} synced across your devices
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#F4F2ED] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#1C1B18]/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
              />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0] hover:border-[#B91C1C] hover:text-[#B91C1C] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Per-Care-Space Phase 4 Threshold Notification Toggles */}
      <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#1C1B18]" />
            <h3 className="text-base font-bold text-[#1C1B18]">
              Threshold Alerts (Phase 4 Ready)
            </h3>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F4F2ED] text-[#6B6860] border border-[#E7E5E0]">
            Saved to Cloud
          </span>
        </div>
        <p className="text-xs text-[#6B6860]">
          Choose which Care Spaces should trigger alerts when live AQI crosses
          their Safe AQI Limit.
        </p>

        <div className="space-y-2.5">
          {careSpaces.map((space) => {
            const enabled = Boolean(space.notifyEnabled);
            return (
              <div
                key={space.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-[#1C1B18]">
                    {space.label} · {space.city}
                  </div>
                  <div className="text-xs text-[#6B6860]">
                    Alert when AQI &gt; {space.safeAqiLimit}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => onToggleNotify(space.id, !enabled)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    enabled
                      ? 'bg-[#EDF6F0] text-[#2E6F40] border-[#CBE6D3]'
                      : 'bg-[#FFFFFF] text-[#6B6860] border-[#E7E5E0]'
                  }`}
                >
                  {enabled ? 'Alerts ON' : 'Alerts OFF'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
