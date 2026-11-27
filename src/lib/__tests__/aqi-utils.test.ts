import { describe, expect, it } from 'vitest';
import {
  buildHourlyTimeline,
  calculateAqi,
  clampAqi,
  classifyAqiSeverity,
  convertToCpcbUnit,
  findSafestHourlyWindow,
  getAqiCategory,
  getRegionalAdvisories,
  isAirSafe,
  isGrapCity,
} from '@/lib/aqi-utils';

describe('aqi-utils', () => {
  describe('clampAqi', () => {
    it('keeps valid integers within 0..500 and rounds floats', () => {
      expect(clampAqi(0)).toBe(0);
      expect(clampAqi(149.6)).toBe(150);
      expect(clampAqi(500)).toBe(500);
    });

    it('clamps extreme, negative, and non-finite inputs safely', () => {
      expect(clampAqi(-42)).toBe(0);
      expect(clampAqi(999)).toBe(500);
      expect(clampAqi(Number.NaN)).toBe(0);
      expect(clampAqi(Number.POSITIVE_INFINITY)).toBe(0);
      expect(clampAqi(Number.NEGATIVE_INFINITY)).toBe(0);
    });
  });

  describe('classifyAqiSeverity', () => {
    it('classifies exact severity boundaries correctly', () => {
      expect(classifyAqiSeverity(0)).toBe('safe');
      expect(classifyAqiSeverity(100)).toBe('safe');
      expect(classifyAqiSeverity(101)).toBe('moderate');
      expect(classifyAqiSeverity(200)).toBe('moderate');
      expect(classifyAqiSeverity(201)).toBe('caution');
      expect(classifyAqiSeverity(300)).toBe('caution');
      expect(classifyAqiSeverity(301)).toBe('severe');
      expect(classifyAqiSeverity(500)).toBe('severe');
    });

    it('handles negative and NaN values gracefully as safe (clamped to 0)', () => {
      expect(classifyAqiSeverity(-10)).toBe('safe');
      expect(classifyAqiSeverity(Number.NaN)).toBe('safe');
    });
  });

  describe('isAirSafe', () => {
    it('treats exact threshold boundary aqi === safeLimit as safe and safeLimit + 1 as caution', () => {
      expect(isAirSafe(100, 100)).toBe(true);
      expect(isAirSafe(101, 100)).toBe(false);
      expect(isAirSafe(150, 150)).toBe(true);
      expect(isAirSafe(151, 150)).toBe(false);
    });

    it('handles extreme values (0, 500, negative) and fails closed on NaN/Infinity', () => {
      expect(isAirSafe(0, 50)).toBe(true);
      expect(isAirSafe(-15, 50)).toBe(true);
      expect(isAirSafe(500, 200)).toBe(false);
      expect(isAirSafe(500, 500)).toBe(true);
      expect(isAirSafe(Number.NaN, 100)).toBe(false);
      expect(isAirSafe(100, Number.NaN)).toBe(false);
      expect(isAirSafe(Number.POSITIVE_INFINITY, 200)).toBe(false);
    });
  });

  describe('getAqiCategory & Indian CPCB calculations', () => {
    it('maps AQI bands to official CPCB categories', () => {
      expect(getAqiCategory(35)).toBe('Good');
      expect(getAqiCategory(100)).toBe('Satisfactory');
      expect(getAqiCategory(180)).toBe('Moderate');
      expect(getAqiCategory(250)).toBe('Poor');
      expect(getAqiCategory(380)).toBe('Very Poor');
      expect(getAqiCategory(450)).toBe('Severe');
    });

    it('converts gas units to CPCB standards and calculates max sub-index AQI', () => {
      expect(convertToCpcbUnit('co', 1200, 'µg/m³')).toEqual({
        value: 1.2,
        cpcbUnit: 'mg/m³',
      });
      expect(convertToCpcbUnit('no2', 20, 'ppb')).toEqual({
        value: 38,
        cpcbUnit: 'µg/m³',
      });
      const aqi = calculateAqi({
        pm25: 90,
        pm10: 120,
        no2: 40,
        o3: 50,
        co: 1.0,
        so2: 15,
      });
      expect(aqi).toBe(200);
    });

    it('distinguishes GRAP (New Delhi / NCR) from non-NCR CPCB advisories', () => {
      expect(isGrapCity('New Delhi')).toBe(true);
      expect(isGrapCity('Delhi NCR')).toBe(true);
      expect(isGrapCity('Hyderabad')).toBe(false);

      const delhiAdv = getRegionalAdvisories(420, 'New Delhi');
      expect(delhiAdv[0].isGrapRegion).toBe(true);
      expect(delhiAdv[0].stage).toContain('GRAP Stage IV');

      const hydAdv = getRegionalAdvisories(160, 'Hyderabad');
      expect(hydAdv[0].isGrapRegion).toBe(false);
      expect(hydAdv[0].stage).toContain('CPCB');
    });
  });

  describe('buildHourlyTimeline & findSafestHourlyWindow', () => {
    it('builds 9 diurnal slots and identifies 14:00 as the safest window', () => {
      const timeline = buildHourlyTimeline(200);
      expect(timeline).toHaveLength(9);
      expect(timeline[0].hourLabel).toBe('06:00');
      expect(timeline[timeline.length - 1].hourLabel).toBe('22:00');

      const safest = findSafestHourlyWindow(timeline);
      expect(safest.index).toBe(4);
      expect(safest.window?.hourLabel).toBe('14:00');
      expect(safest.window?.status).toBe('Safe Window');
    });

    it('handles empty timelines and invalid baseline AQI inputs cleanly', () => {
      expect(findSafestHourlyWindow([])).toEqual({ index: -1, window: null });

      const nanTimeline = buildHourlyTimeline(Number.NaN);
      expect(nanTimeline).toHaveLength(9);
      expect(nanTimeline.every((slot) => Number.isFinite(slot.estimatedAqi))).toBe(true);
    });
  });
});
