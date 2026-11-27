import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from '@/components/Dashboard';
import ExpertChatBox from '@/components/ExpertChatBox';
import HourlyAirWave from '@/components/HourlyAirWave';
import LandingPage from '@/components/LandingPage';
import MenuDrawer from '@/components/MenuDrawer';
import OnboardingWizard from '@/components/OnboardingWizard';
import { buildHourlyTimeline } from '@/lib/aqi-utils';
import type {
  AqiResponse,
  CareSpaceProfile,
  UserProfile,
} from '@/types/air-quality';

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: () => false,
  createSupabaseBrowserClient: () => null,
}));

const sampleProfile: UserProfile = {
  mode: 'personal',
  location: { city: 'Hyderabad', town: 'Jubilee Hills' },
  stepOutWindows: ['Early Morning (6–9 AM)'],
  travelModes: ['Two-Wheeler / Bike'],
  householdMembers: ['Kids Under 10'],
  healthSensitivities: ['None'],
  homeSurroundings: ['Quiet Residential / Gated'],
  existingProtection: ['N95 / KN95 Masks'],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleSpaces: CareSpaceProfile[] = [
  {
    id: 'cs-1',
    label: 'My Home',
    city: 'Hyderabad',
    safeAqiLimit: 100,
    profile: sampleProfile,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'cs-2',
    label: "Parents' Place",
    city: 'Lucknow',
    safeAqiLimit: 100,
    profile: { ...sampleProfile, location: { city: 'Lucknow' } },
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const sampleAqi: AqiResponse = {
  stationName: 'Zoo Park Monitor',
  locationLabel: 'Hyderabad',
  aqi: 145,
  category: 'Moderate',
  pollutants: { pm25: 72, pm10: 120, no2: 34, o3: 40, co: 1.1, so2: 14 },
  source: 'OpenAQ Live',
  timestamp: '2026-01-01T08:00:00.000Z',
  advisories: [],
  simulated: false,
};

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

      fireEvent.click(guestButton);
      expect(onContinueAsGuest).toHaveBeenCalledTimes(1);

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

      expect(
        screen.getByRole('img', {
          name: /hourly air quality wave from 06:00 to 22:00/i,
        })
      ).toBeInTheDocument();

      expect(screen.getByText(/14:00 · AQI 140/i)).toBeInTheDocument();

      const morningTick = screen.getByRole('button', { name: '08:00' });
      fireEvent.click(morningTick);

      expect(morningTick).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText(/08:00 · AQI 248/i)).toBeInTheDocument();
      expect(
        screen.getByText(/your routine hour · wear snug mask/i)
      ).toBeInTheDocument();
    });
  });

  describe('Dashboard', () => {
    it('displays personalized caution verdict and switches Care Spaces', () => {
      const onSelectCareSpace = vi.fn();
      const onOpenMenu = vi.fn();

      render(
        <Dashboard
          profile={sampleProfile}
          careSpaces={sampleSpaces}
          activeCareSpace={sampleSpaces[0]}
          aqiData={sampleAqi}
          recommendations={null}
          loadingAqi={false}
          loadingRecs={false}
          simulateSevere={false}
          onCityChange={vi.fn()}
          onSelectCareSpace={onSelectCareSpace}
          onOpenMenu={onOpenMenu}
        />
      );

      expect(
        screen.getByText(/caution: delay outdoor activity \(145 > 100 limit\)/i)
      ).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('button', { name: /parents' place · lucknow/i })
      );
      expect(onSelectCareSpace).toHaveBeenCalledWith('cs-2');

      fireEvent.click(
        screen.getByRole('button', { name: /open navigation menu/i })
      );
      expect(onOpenMenu).toHaveBeenCalledTimes(1);
    });
  });

  describe('OnboardingWizard', () => {
    it('completes the 3-step guest personalization flow cleanly', () => {
      const onComplete = vi.fn();

      render(<OnboardingWizard onComplete={onComplete} />);

      expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
      const townInput = screen.getByLabelText(/neighbourhood \/ area/i);
      fireEvent.change(townInput, { target: { value: 'Indiranagar' } });

      fireEvent.click(
        screen.getByRole('button', { name: /next: travel & household/i })
      );
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('button', { name: /next: home & protection/i })
      );
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole('button', { name: /build my daily plan/i })
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0].location.town).toBe('Indiranagar');
    });
  });

  describe('ExpertChatBox & MenuDrawer dialogs', () => {
    it('opens accessible ExpertChatBox modal dialog and closes on Escape', () => {
      render(
        <ExpertChatBox
          profile={sampleProfile}
          activeCareSpace={sampleSpaces[0]}
          aqiData={sampleAqi}
          recommendations={null}
        />
      );

      const chatFab = screen.getByRole('button', {
        name: /open ask air expert chat/i,
      });
      fireEvent.click(chatFab);

      const dialog = screen.getByRole('dialog', {
        name: /ask the air expert/i,
      });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(
        screen.getByLabelText(/ask the air expert a question/i)
      ).toHaveFocus();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(
        screen.queryByRole('dialog', { name: /ask the air expert/i })
      ).not.toBeInTheDocument();
    });

    it('renders MenuDrawer with aria-modal and focuses close button', () => {
      const onClose = vi.fn();
      render(
        <MenuDrawer
          open={true}
          activeView="dashboard"
          activeCity="Hyderabad"
          careSpaceCount={2}
          loadingAqi={false}
          simulateSevere={false}
          onSelectView={vi.fn()}
          onClose={onClose}
          onRefresh={vi.fn()}
          onToggleSimulate={vi.fn()}
          onOpenLanding={vi.fn()}
        />
      );

      const navDialog = screen.getByRole('dialog', { name: /navigation menu/i });
      expect(navDialog).toHaveAttribute('aria-modal', 'true');
      expect(
        screen.getByRole('button', { name: /close navigation menu/i })
      ).toHaveFocus();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
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
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      expect(onReset).toHaveBeenCalledTimes(1);

      errorSpy.mockRestore();
    });
  });
});
