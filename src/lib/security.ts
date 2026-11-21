import { NextRequest } from 'next/server';
import type { AqiResponse, ChatMessage, UserProfile } from '@/types/air-quality';

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function checkRateLimit(
  request: NextRequest,
  routeKey: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const key = `${routeKey}:${getClientIp(request)}`;

  // Prune expired buckets occasionally to keep memory bounded
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export async function safeJsonBody<T>(
  request: NextRequest,
  maxBytes = 64_000
): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const rawText = await request.text();
    if (!rawText || rawText.length > maxBytes) {
      return { ok: false };
    }
    const parsed = JSON.parse(rawText) as T;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false };
    }
    return { ok: true, data: parsed };
  } catch {
    return { ok: false };
  }
}

export function sanitizeShortText(value: unknown, maxLen = 80): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function sanitizeStringArray(
  value: unknown,
  maxItems = 15,
  maxItemLen = 100
): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const item of value) {
    if (cleaned.length >= maxItems) break;
    const s = sanitizeShortText(item, maxItemLen);
    if (s) cleaned.push(s);
  }
  return cleaned;
}

export function sanitizeProfile(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<UserProfile>;
  const city = sanitizeShortText(p.location?.city, 80);
  if (!city) return null;

  const mode =
    p.mode === 'school' || p.mode === 'industry' ? p.mode : 'personal';

  return {
    mode,
    location: {
      city,
      town: sanitizeShortText(p.location?.town, 80) || undefined,
    },
    stepOutWindows: sanitizeStringArray(p.stepOutWindows),
    travelModes: sanitizeStringArray(p.travelModes),
    householdMembers: sanitizeStringArray(p.householdMembers),
    healthSensitivities: sanitizeStringArray(p.healthSensitivities),
    homeSurroundings: sanitizeStringArray(p.homeSurroundings),
    existingProtection: sanitizeStringArray(p.existingProtection),
    school: p.school,
    industry: p.industry,
    updatedAt: sanitizeShortText(p.updatedAt, 40) || new Date().toISOString(),
  };
}

export function sanitizeAqiData(raw: unknown): AqiResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Partial<AqiResponse>;
  if (typeof a.aqi !== 'number' || !Number.isFinite(a.aqi)) return null;
  if (!a.pollutants || typeof a.pollutants !== 'object') return null;

  return {
    stationName: sanitizeShortText(a.stationName, 120) || 'Monitoring Station',
    locationLabel: sanitizeShortText(a.locationLabel, 120) || 'Urban Area',
    aqi: Math.max(0, Math.min(999, Math.round(a.aqi))),
    category: a.category || 'Moderate',
    pollutants: {
      pm25: Number(a.pollutants.pm25) || 0,
      pm10: Number(a.pollutants.pm10) || 0,
      no2: Number(a.pollutants.no2) || 0,
      o3: Number(a.pollutants.o3) || 0,
      co: a.pollutants.co !== undefined ? Number(a.pollutants.co) || 0 : undefined,
    },
    source: sanitizeShortText(a.source, 60) || 'Telemetry',
    timestamp: sanitizeShortText(a.timestamp, 40) || new Date().toISOString(),
    advisories: Array.isArray(a.advisories) ? a.advisories.slice(0, 5) : [],
    simulated: Boolean(a.simulated),
  };
}

export function sanitizeChatMessages(
  raw: unknown,
  maxMessages = 20,
  maxCharsPerMessage = 1000
): { ok: true; messages: ChatMessage[] } | { ok: false } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > maxMessages) {
    return { ok: false };
  }
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return { ok: false };
    const m = item as Partial<ChatMessage>;
    if (m.role !== 'user' && m.role !== 'assistant') return { ok: false };
    if (typeof m.content !== 'string') return { ok: false };
    const trimmed = m.content.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();
    if (!trimmed || trimmed.length > maxCharsPerMessage) {
      return { ok: false };
    }
    messages.push({ role: m.role, content: trimmed });
  }
  return { ok: true, messages };
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
  /reveal\s+(your\s+)?(system\s+prompt|instructions|api\s*key|env|secrets?)/i,
  /print\s+(your\s+)?(system\s+prompt|process\.env|environment)/i,
  /what\s+(is|are)\s+your\s+(system\s+prompt|hidden\s+instructions|api\s*key)/i,
  /bypass\s+(safety|guardrails|rules)/i,
  /\b(GEMINI_API_KEY|OPENAQ_API_KEY|DATA_GOV_API_KEY|process\.env)\b/i,
];

export function isPromptInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
