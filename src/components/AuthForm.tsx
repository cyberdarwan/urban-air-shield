'use client';

import React, { useId, useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface AuthFormProps {
  layout?: 'stacked' | 'inline';
  dividerText?: string;
}

/**
 * Shared passwordless authentication controls (Google OAuth + Email Magic Link)
 * used across LandingPage and AccountAuthView.
 */
export default function AuthForm({
  layout = 'stacked',
  dividerText = 'Or email magic link',
}: AuthFormProps) {
  const emailInputId = useId();
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState('');

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

  const isInline = layout === 'inline';

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
      >
        <span>Continue with Google</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E7E5E0]" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#475569]">
          {dividerText}
        </span>
        <div className="h-px flex-1 bg-[#E7E5E0]" />
      </div>

      <form onSubmit={handleMagicLink} className="space-y-3">
        <label htmlFor={emailInputId} className="sr-only">
          Email address for magic link sign-in
        </label>

        <div className={isInline ? 'flex flex-col sm:flex-row gap-2' : 'space-y-3'}>
          <input
            id={emailInputId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={
              isInline
                ? 'flex-1 rounded-xl bg-white/90 border border-[#E7E5E0] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20'
                : 'w-full rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#475569] focus:outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/20'
            }
          />
          <button
            type="submit"
            disabled={sendingLink}
            className={
              isInline
                ? 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50'
                : 'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50'
            }
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {sendingLink
              ? isInline
                ? 'Sending...'
                : 'Sending Magic Link...'
              : 'Send Magic Link'}
          </button>
        </div>

        {linkSent && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3 text-xs text-[#059669] flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Magic link sent to <strong>{email}</strong>. Open it to sign in.
            </span>
          </div>
        )}

        {authError && (
          <p role="alert" className="text-xs text-[#D97706] font-medium">
            {authError}
          </p>
        )}
      </form>
    </div>
  );
}
