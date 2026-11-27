import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HourlyAirWave from '@/components/HourlyAirWave';
import LandingPage from '@/components/LandingPage';
import { buildHourlyTimeline } from '@/lib/aqi-utils';

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => false,
  createSupabaseBrowserClient: () => null,
}));

describe('UI Components', () => {
  describe('LandingPage', () => {
    it('renders the hero heading, accessible entry CTAs, and invokes guest callback', () => {
      const onContinueAsGuest = vi.fn();

      render(
        <LandingPage
          hasExistingProfile={false}
          onContinueAsGuest={onContinueAsGuest}
        />
      );

      expect(
        screen.getByRole('heading', {
          name: /practical air guidance for your real daily routine/i,
        })
      ).toBeInTheDocument();

      const guestButton = screen.getByRole('button', {
        name: /continue as guest/i,
      });
      const signInButton = screen.getByRole('button', {
        name: /sign in & sync/i,
      });

      expect(guestButton).toBeInTheDocument();
      expect(signInButton).toBeInTheDocument();

      fireEvent.click(guestButton);
      expect(onContinueAsGuest).toHaveBeenCalledTimes(1);

      // Verify transition into dedicated Sign-In view and back
      fireEvent.click(signInButton);
      expect(
        screen.getByRole('heading', {
          name: /sign in & sync your care spaces/i,
        })
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getAllByRole('button', { name: /back to overview/i })[0]
      );
      expect(
        screen.getByRole('heading', {
          name: /practical air guidance for your real daily routine/i,
        })
      ).toBeInTheDocument();
    });
  });

  describe('HourlyAirWave', () => {
    it('renders accessible SVG wave chart and updates inspector bar on hour selection', () => {
      const timeline = buildHourlyTimeline(200);

      render(
        <HourlyAirWave
          timeline={timeline}
          stepOutWindows={['Early Morning (6–9 AM)']}
        />
      );

      // Accessible SVG chart role and descriptive aria-label
      const chart = screen.getByRole('img', {
        name: /hourly air quality wave from 06:00 to 22:00/i,
      });
      expect(chart).toBeInTheDocument();

      // Defaults to the safest afternoon dip (14:00)
      expect(screen.getByText(/14:00 · AQI 140/i)).toBeInTheDocument();
      expect(screen.getByText(/best window for quick errands/i)).toBeInTheDocument();

      // Clicking 08:00 time tick updates the inline inspector bar and pressed state
      const morningTick = screen.getByRole('button', { name: '08:00' });
      fireEvent.click(morningTick);

      expect(morningTick).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/08:00 · AQI 248/i)).toBeInTheDocument();
      expect(
        screen.getByText(/your routine hour · wear snug mask/i)
      ).toBeInTheDocument();
    });
  });

  describe('ErrorPage boundary', () => {
    it('renders accessible alert UI and invokes reset on Retry click', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { default: ErrorPage } = await import('@/app/error');
      const onReset = vi.fn();

      render(
        <ErrorPage error={new Error('Simulated render crash')} reset={onReset} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /something interrupted the air feed/i,
        })
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onReset).toHaveBeenCalledTimes(1);

      errorSpy.mockRestore();
    });
  });
});
