import { describe, expect, it } from 'vitest';
import {
  deduplicateCities,
  evaluateThresholdFlip,
} from '@/lib/alert-evaluator';

describe('alert-evaluator', () => {
  describe('evaluateThresholdFlip', () => {
    it('notifies on safe -> caution transition', () => {
      expect(evaluateThresholdFlip('safe', 145, 100)).toEqual({
        nextStatus: 'caution',
        shouldNotify: true,
        reason: 'safe-to-caution',
      });
    });

    it('notifies on caution -> safe transition', () => {
      expect(evaluateThresholdFlip('caution', 88, 100)).toEqual({
        nextStatus: 'safe',
        shouldNotify: true,
        reason: 'caution-to-safe',
      });
    });

    it('suppresses notification on safe -> safe unchanged state', () => {
      expect(evaluateThresholdFlip('safe', 100, 100)).toEqual({
        nextStatus: 'safe',
        shouldNotify: false,
        reason: 'unchanged',
      });
    });

    it('suppresses notification on caution -> caution unchanged state', () => {
      expect(evaluateThresholdFlip('caution', 101, 100)).toEqual({
        nextStatus: 'caution',
        shouldNotify: false,
        reason: 'unchanged',
      });
    });

    it('handles initial null/undefined state cleanly', () => {
      expect(evaluateThresholdFlip(null, 80, 100)).toEqual({
        nextStatus: 'safe',
        shouldNotify: false,
        reason: 'initial-safe',
      });

      expect(evaluateThresholdFlip(undefined, 180, 100)).toEqual({
        nextStatus: 'caution',
        shouldNotify: true,
        reason: 'initial-caution',
      });
    });
  });

  describe('deduplicateCities', () => {
    it('deduplicates cities case-insensitively and trims whitespace', () => {
      const result = deduplicateCities([
        { city: 'New Delhi' },
        { city: 'new delhi' },
        { city: '  NEW DELHI  ' },
        { city: 'Hyderabad' },
        { city: 'hyderabad ' },
        { city: '' },
        { city: '   ' },
        { city: null },
      ]);

      expect(result).toEqual(['New Delhi', 'Hyderabad']);
    });

    it('returns an empty list for empty input', () => {
      expect(deduplicateCities([])).toEqual([]);
    });
  });
});
