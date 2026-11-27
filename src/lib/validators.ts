import {
  sanitizeAqiData,
  sanitizeChatMessages,
  sanitizeProfile,
  sanitizeShortText,
} from '@/lib/security';
import type {
  AqiResponse,
  ChatMessage,
  UserProfile,
} from '@/types/air-quality';

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

export interface ValidatedGuidancePayload {
  profile: UserProfile;
  aqiData: AqiResponse;
}

export interface ValidatedChatPayload {
  messages: ChatMessage[];
  profile: UserProfile;
  aqiData: AqiResponse;
}

export type ValidatedPushSubscribePayload =
  | { action: 'test' }
  | {
      action: 'subscribe';
      subscription: {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
    };

/**
 * Validates and sanitizes the request payload for AI guidance (`/api/recommend`).
 */
export function validateGuidancePayload(
  raw: unknown
): ValidationResult<ValidatedGuidancePayload> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const candidate = raw as { profile?: unknown; aqiData?: unknown };
  const profile = sanitizeProfile(candidate.profile);
  if (!profile) {
    return {
      valid: false,
      error: 'A valid user profile with location.city is required.',
    };
  }

  const aqiData = sanitizeAqiData(candidate.aqiData);
  if (!aqiData) {
    return {
      valid: false,
      error: 'Valid live AQI telemetry with numeric aqi and pollutants is required.',
    };
  }

  return { valid: true, data: { profile, aqiData } };
}

/**
 * Validates and sanitizes the request payload for the AI Air Expert chat (`/api/chat`).
 */
export function validateChatPayload(
  raw: unknown
): ValidationResult<ValidatedChatPayload> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const candidate = raw as {
    messages?: unknown;
    profile?: unknown;
    aqiData?: unknown;
  };

  const msgResult = sanitizeChatMessages(candidate.messages, 20, 1000);
  if (!msgResult.ok) {
    return {
      valid: false,
      error:
        'Messages must be a non-empty array of valid user/assistant turns within length limits.',
    };
  }

  const profile = sanitizeProfile(candidate.profile);
  if (!profile) {
    return {
      valid: false,
      error: 'A valid user profile with location.city is required.',
    };
  }

  const aqiData = sanitizeAqiData(candidate.aqiData);
  if (!aqiData) {
    return {
      valid: false,
      error: 'Valid live AQI telemetry with numeric aqi and pollutants is required.',
    };
  }

  return {
    valid: true,
    data: {
      messages: msgResult.messages,
      profile,
      aqiData,
    },
  };
}

/**
 * Validates and sanitizes Web Push subscription requests (`/api/push/subscribe`).
 */
export function validatePushSubscribePayload(
  raw: unknown
): ValidationResult<ValidatedPushSubscribePayload> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const candidate = raw as {
    action?: unknown;
    subscription?: {
      endpoint?: unknown;
      keys?: {
        p256dh?: unknown;
        auth?: unknown;
      };
    };
  };

  const action = candidate.action === undefined ? 'subscribe' : candidate.action;
  if (action !== 'subscribe' && action !== 'test') {
    return {
      valid: false,
      error: 'Action must be either "subscribe" or "test".',
    };
  }

  if (action === 'test') {
    return { valid: true, data: { action: 'test' } };
  }

  const endpoint = sanitizeShortText(candidate.subscription?.endpoint, 1000);
  const p256dh = sanitizeShortText(candidate.subscription?.keys?.p256dh, 500);
  const auth = sanitizeShortText(candidate.subscription?.keys?.auth, 500);

  if (!endpoint || !p256dh || !auth) {
    return {
      valid: false,
      error: 'Push subscription requires endpoint, keys.p256dh, and keys.auth.',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpoint);
  } catch {
    return { valid: false, error: 'Push subscription endpoint must be a valid URL.' };
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Push subscription endpoint must use http or https protocol.',
    };
  }

  return {
    valid: true,
    data: {
      action: 'subscribe',
      subscription: {
        endpoint,
        keys: { p256dh, auth },
      },
    },
  };
}
