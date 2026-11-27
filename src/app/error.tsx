'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wind } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('SmogSense runtime boundary caught error:', error);
  }, [error]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF9F6] text-[#0F172A] flex items-center justify-center px-4 py-12">
      {/* Ambient Atmospheric Daylight Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-drift-slow absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
        <div className="animate-drift-reverse absolute top-1/3 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#F59E0B]/10 blur-3xl" />
        <div className="animate-drift-slow absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-[#0EA5E9]/10 blur-3xl" />
      </div>

      <section
        role="alert"
        className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm p-6 sm:p-8 space-y-5 text-center"
      >
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] flex items-center justify-center text-[#E11D48]">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
            <Wind className="h-3.5 w-3.5" aria-hidden="true" />
            SmogSense
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Something interrupted the air feed
          </h1>
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            An unexpected display error occurred. Your saved Care Spaces remain
            safe—tap retry to reload your live dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </section>
    </main>
  );
}
