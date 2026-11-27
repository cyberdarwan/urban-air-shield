'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import {
  Bell,
  Cloud,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import AuthForm from '@/components/AuthForm';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { CareSpaceProfile } from '@/types/air-quality';

interface AccountAuthViewProps {
  user: User | null;
  careSpaces: CareSpaceProfile[];
  syncing: boolean;
  onSyncNow: () => Promise<void>;
  onToggleNotify: (spaceId: string, enabled: boolean) => void;
  onSignOut: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function AccountAuthView({
  user,
  careSpaces,
  syncing,
  onSyncNow,
  onToggleNotify,
  onSignOut,
}: AccountAuthViewProps) {
  const [pushLoading, setPushLoading] = useState(false);
  const [pushStatus, setPushStatus] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);

  const supabaseReady = isSupabaseConfigured();
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  const handleEnablePush = async () => {
    setPushStatus('');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('Browser Web Push is not supported on this device.');
      return;
    }
    if (!vapidPublicKey) {
      setPushStatus(
        'VAPID public key is not configured yet (set NEXT_PUBLIC_VAPID_PUBLIC_KEY).'
      );
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus(
          'Notification permission was blocked. Allow notifications in browser settings to receive AQI alerts.'
        );
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
        const errData = await res.json().catch(() => ({}));
        setPushStatus(errData.error || 'Failed to save push subscription.');
        return;
      }

      setPushSubscribed(true);
      setPushStatus(
        'Push alerts enabled on this device. Toggle alerts per Care Space below.'
      );
    } catch (err) {
      setPushStatus(
        err instanceof Error ? err.message : 'Unable to enable push alerts.'
      );
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    setPushStatus('');
    try {
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPushStatus(data.error || 'Could not send test alert.');
      } else {
        setPushStatus(
          `Test notification sent to ${data.sent || 1} subscribed device(s).`
        );
      }
    } finally {
      setPushLoading(false);
    }
  };

  if (!supabaseReady) {
    return (
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
            <Cloud className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">
              Guest Mode Active (Cloud Sync Ready)
            </h2>
            <p className="text-xs text-[#475569]">
              Your {careSpaces.length} Care Space
              {careSpaces.length === 1 ? '' : 's'} are saved privately in your
              browser.
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
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
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

        <AuthForm layout="inline" dividerText="Or use email magic link" />
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
                  <Cloud className="h-3 w-3" aria-hidden="true" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#0F172A] border border-[#E7E5E0] hover:border-[#D6D3CD] transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[#059669] ${syncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white text-[#475569] border border-[#E7E5E0] hover:text-[#E11D48] hover:border-[#FECDD3] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Automated Browser Push Alerts */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#059669]" aria-hidden="true" />
              <h2 className="text-base font-bold text-[#0F172A]">
                Threshold Push Alerts
              </h2>
            </div>
            <p className="text-xs text-[#475569] mt-1">
              Get a browser notification only when a Care Space crosses above or
              drops back below its safe AQI limit (checked hourly via OpenAQ).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-[#059669] hover:bg-[#047857] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              {pushSubscribed
                ? 'Device Subscribed'
                : 'Enable Browser Push Alerts'}
            </button>
            <button
              type="button"
              onClick={handleTestPush}
              disabled={pushLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Send Test Alert
            </button>
          </div>
        </div>

        {pushStatus && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2.5 text-xs text-[#0F172A]"
          >
            {pushStatus}
          </div>
        )}

        <div className="space-y-2.5 pt-2 border-t border-[#E7E5E0]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
            Alerts Per Care Space
          </div>
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
