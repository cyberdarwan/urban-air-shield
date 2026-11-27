import { isAirSafe } from '@/lib/aqi-utils';

export type AlertStatus = 'safe' | 'caution';

export type ThresholdTransitionReason =
  | 'safe-to-caution'
  | 'caution-to-safe'
  | 'initial-caution'
  | 'initial-safe'
  | 'unchanged';

export interface ThresholdEvaluation {
  nextStatus: AlertStatus;
  shouldNotify: boolean;
  reason: ThresholdTransitionReason;
}

/**
 * Evaluates whether a Care Space crossed its safe AQI ceiling since the previous check.
 * Notifications fire on `safe -> caution`, `caution -> safe`, or an initial `caution` baseline.
 * Repeated checks within the same status (`safe -> safe`, `caution -> caution`) are suppressed.
 */
export function evaluateThresholdFlip(
  previousStatus: string | null | undefined,
  liveAqi: number,
  safeLimit: number
): ThresholdEvaluation {
  const nextStatus: AlertStatus = isAirSafe(liveAqi, safeLimit)
    ? 'safe'
    : 'caution';

  const normalizedPrev =
    previousStatus === 'safe' || previousStatus === 'caution'
      ? previousStatus
      : null;

  if (normalizedPrev === null) {
    return nextStatus === 'caution'
      ? { nextStatus, shouldNotify: true, reason: 'initial-caution' }
      : { nextStatus, shouldNotify: false, reason: 'initial-safe' };
  }

  if (normalizedPrev === nextStatus) {
    return { nextStatus, shouldNotify: false, reason: 'unchanged' };
  }

  return nextStatus === 'caution'
    ? { nextStatus, shouldNotify: true, reason: 'safe-to-caution' }
    : { nextStatus, shouldNotify: true, reason: 'caution-to-safe' };
}

/**
 * Deduplicates city names across Care Spaces case-insensitively so live telemetry
 * is fetched at most once per unique city.
 */
export function deduplicateCities(
  careSpaces: ReadonlyArray<{ city?: string | null }>
): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const space of careSpaces) {
    const trimmed = (space.city || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}
