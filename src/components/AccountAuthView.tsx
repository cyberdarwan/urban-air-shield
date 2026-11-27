'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);
  const supabaseReady = isSupabaseConfigured();

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnableBrowserPush = async () => {
    setPushStatusMsg(null);
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushStatusMsg('Browser push notifications are not supported here.');
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushStatusMsg(
        'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured yet in this environment.'
      );
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatusMsg('Notification permission was denied in browser settings.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          subscription: subscription.toJSON(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setPushStatusMsg(errJson.error || 'Could not save push subscription.');
        return;
      }

      setPushEnabled(true);
      setPushStatusMsg('Browser push alerts enabled on this device.');
    } catch {
      setPushStatusMsg('Failed to register push notifications.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    setPushLoading(true);
    setPushStatusMsg(null);
    try {
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPushStatusMsg(data.error || 'Could not send test alert.');
      } else {
        setPushStatusMsg(`Test alert sent to ${data.sent ?? 1} device(s).`);
      }
    } catch {
      setPushStatusMsg('Network error sending test alert.');
    } finally {
      setPushLoading(false);
    }
  };

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
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <Cloud className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Guest Mode Active (Cloud Sync Ready)
            </h2>
            <p className="text-xs text-[#475569]">
              Your {careSpaces.length} Care Space{careSpaces.length === 1 ? '' : 's'} are saved privately in your browser.
            </p>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
          To enable passwordless Google &amp; Email Magic Link sign-in and
          cross-device cloud sync, add{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E7E5E0] text-[#0F172A]">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E7E5E0] text-[#0F172A]">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{' '}
          in your environment variables and run{' '}
          <code className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E7E5E0] text-[#0F172A]">
            supabase/schema.sql
          </code>
          .
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 sm:p-8 max-w-xl space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Passwordless Sign-In
          </div>
          <h2 className="text-lg font-bold text-[#0F172A]">
            Sync Your Care Spaces Across Devices
          </h2>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            Your saved Care Spaces ({careSpaces.length}) will automatically sync
            to your account upon sign-in.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E7E5E0]" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#475569]">
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
              className="flex-1 rounded-xl bg-white/90 border border-[#E7E5E0] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20"
            />
            <button
              type="submit"
              disabled={sendingLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {sendingLink ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>

          {linkSent && (
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs text-[#059669] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Magic link sent to <strong>{email}</strong>. Open it on this
                device to complete sign-in.
              </span>
            </div>
          )}

          {authError && (
            <p className="text-xs text-[#D97706] font-medium">{authError}</p>
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
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={user.email || 'Account'}
                width={40}
                height={40}
                unoptimized
                className="h-10 w-10 rounded-full border border-[#E7E5E0] object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-[#059669] text-white flex items-center justify-center text-sm font-bold">
                {(user.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-[#0F172A]">
                  {user.email}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  <Cloud className="h-3 w-3" />
                  Synced to Cloud
                </span>
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/90 text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#059669] ${syncing ? 'animate-spin' : ''}`}
              />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/90 text-[#0F172A] border border-[#E7E5E0] hover:border-[#FECDD3] hover:text-[#E11D48] shadow-sm transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Per-Care-Space Browser Threshold Notification Toggles */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#059669]" />
            <h3 className="text-base font-bold text-[#0F172A]">
              Browser Threshold Alerts
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnableBrowserPush}
              disabled={pushLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5" />
              {pushEnabled ? 'Push Enabled' : 'Enable Browser Push Alerts'}
            </button>
            <button
              type="button"
              onClick={handleSendTestAlert}
              disabled={pushLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/90 text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              Send Test Alert
            </button>
          </div>
        </div>
        <p className="text-xs text-[#475569]">
          Enable browser push on this device, then choose which Care Spaces
          should alert you when live AQI crosses their Safe AQI Limit.
        </p>

        {pushStatusMsg && (
          <div className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-xs text-[#0F172A]">
            {pushStatusMsg}
          </div>
        )}

        <div className="space-y-2.5">
          {careSpaces.map((space) => {
            const enabled = Boolean(space.notifyEnabled);
            return (
              <div
                key={space.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF9F6]/90 border border-[#E7E5E0] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">
                    {space.label} · {space.city}
                  </div>
                  <div className="text-xs text-[#475569]">
                    Alert when AQI &gt; {space.safeAqiLimit}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => onToggleNotify(space.id, !enabled)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    enabled
                      ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                      : 'bg-white text-[#475569] border-[#E7E5E0]'
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
