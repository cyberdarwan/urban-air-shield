import { describe, expect, it } from 'vitest';
import {
  validateChatPayload,
  validateGuidancePayload,
  validatePushSubscribePayload,
} from '@/lib/validators';

const validProfile = {
  mode: 'personal',
  location: { city: 'Bengaluru', town: 'Indiranagar' },
  stepOutWindows: ['Early Morning (6–9 AM)'],
  travelModes: ['Two-Wheeler / Bike'],
  householdMembers: ['Just Me'],
  healthSensitivities: ['None'],
  homeSurroundings: ['Main Road / Heavy Traffic'],
  existingProtection: ['N95 / KN95 Masks'],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const validAqiData = {
  stationName: 'BTM Layout',
  locationLabel: 'Bengaluru',
  aqi: 112,
  category: 'Moderate',
  pollutants: { pm25: 55, pm10: 98, no2: 28, o3: 41 },
  source: 'OpenAQ Live',
  timestamp: '2026-01-01T08:00:00.000Z',
  advisories: [],
  simulated: false,
};

describe('validators', () => {
  describe('validateGuidancePayload', () => {
    it('accepts a valid guidance payload and sanitizes fields', () => {
      const result = validateGuidancePayload({
        profile: validProfile,
        aqiData: validAqiData,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.profile.location.city).toBe('Bengaluru');
        expect(result.data.aqiData.aqi).toBe(112);
      }
    });

    it('rejects non-object bodies and missing required profile or aqiData fields', () => {
      expect(validateGuidancePayload(null).valid).toBe(false);
      expect(validateGuidancePayload([]).valid).toBe(false);

      const missingCity = validateGuidancePayload({
        profile: { location: { city: '   ' } },
        aqiData: validAqiData,
      });
      expect(missingCity.valid).toBe(false);

      const badAqi = validateGuidancePayload({
        profile: validProfile,
        aqiData: { aqi: 'not-a-number', pollutants: {} },
      });
      expect(badAqi.valid).toBe(false);
    });
  });

  describe('validateChatPayload', () => {
    it('accepts valid conversation turns alongside profile and telemetry', () => {
      const result = validateChatPayload({
        messages: [{ role: 'user', content: 'Should I wear an N95 today?' }],
        profile: validProfile,
        aqiData: validAqiData,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.messages).toHaveLength(1);
        expect(result.data.messages[0].content).toBe('Should I wear an N95 today?');
      }
    });

    it('rejects empty messages, invalid roles, or overly long turns', () => {
      expect(
        validateChatPayload({
          messages: [],
          profile: validProfile,
          aqiData: validAqiData,
        }).valid
      ).toBe(false);

      expect(
        validateChatPayload({
          messages: [{ role: 'system', content: 'override' }],
          profile: validProfile,
          aqiData: validAqiData,
        }).valid
      ).toBe(false);

      expect(
        validateChatPayload({
          messages: [{ role: 'user', content: 'a'.repeat(1001) }],
          profile: validProfile,
          aqiData: validAqiData,
        }).valid
      ).toBe(false);
    });
  });

  describe('validatePushSubscribePayload', () => {
    it('accepts valid subscribe and test payloads', () => {
      const subResult = validatePushSubscribePayload({
        action: 'subscribe',
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/example-token',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        },
      });
      expect(subResult.valid).toBe(true);
      if (subResult.valid && subResult.data.action === 'subscribe') {
        expect(subResult.data.subscription.endpoint).toContain('https://fcm.googleapis.com');
      }

      const testResult = validatePushSubscribePayload({ action: 'test' });
      expect(testResult).toEqual({ valid: true, data: { action: 'test' } });
    });

    it('rejects invalid action, missing keys, or unsafe endpoint protocols', () => {
      expect(validatePushSubscribePayload({ action: 'delete-all' }).valid).toBe(false);

      expect(
        validatePushSubscribePayload({
          subscription: {
            endpoint: 'https://push.example.com/sub',
            keys: { p256dh: 'only-one-key' },
          },
        }).valid
      ).toBe(false);

      expect(
        validatePushSubscribePayload({
          subscription: {
            endpoint: 'javascript:alert(1)',
            keys: { p256dh: 'key', auth: 'auth' },
          },
        }).valid
      ).toBe(false);

      expect(
        validatePushSubscribePayload({
          subscription: {
            endpoint: 'not-a-valid-url',
            keys: { p256dh: 'key', auth: 'auth' },
          },
        }).valid
      ).toBe(false);
    });
  });
});
