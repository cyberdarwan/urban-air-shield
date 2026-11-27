import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockCreateClient,
  mockSetVapidDetails,
  mockSendNotification,
  mockGeminiConstructor,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockSetVapidDetails: vi.fn(),
  mockSendNotification: vi.fn(),
  mockGeminiConstructor: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

vi.mock('web-push', () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGeminiConstructor,
}));

import { GET, POST } from '@/app/api/cron/check-air/route';
import { clearAqiCache } from '@/lib/live-aqi';

interface MockCareSpaceRow {
  id: string;
  user_id: string;
  label: string;
  city: string;
  safe_aqi_limit: number;
  notify_enabled: boolean;
  last_alert_status: string | null;
}

interface MockPushSubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function buildMockSupabase(
  spaces: MockCareSpaceRow[],
  subs: MockPushSubRow[]
) {
  const updatedStatuses: Array<{ id: string; last_alert_status: string }> = [];
  const deletedSubIds: string[] = [];

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'care_spaces') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({ data: spaces, error: null })),
          })),
          update: vi.fn((patch: { last_alert_status: string }) => ({
            eq: vi.fn(async (_col: string, id: string) => {
              updatedStatuses.push({
                id,
                last_alert_status: patch.last_alert_status,
              });
              return { error: null };
            }),
          })),
        };
      }
      if (table === 'push_subscriptions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({ data: subs, error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(async (_col: string, id: string) => {
              deletedSubIds.push(id);
              return { error: null };
            }),
          })),
        };
      }
      throw new Error(`Unexpected table queried: ${table}`);
    }),
  };

  return { client, updatedStatuses, deletedSubIds };
}

function makeCronRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader);
  }
  return new NextRequest('http://localhost/api/cron/check-air', {
    method: 'GET',
    headers,
  });
}

describe('/api/cron/check-air', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAqiCache();
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-vapid-private-key';
    process.env.OPENAQ_API_KEY = 'test-openaq-key';
    delete process.env.DATA_GOV_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it('returns 401 Unauthorized when Authorization header is missing or wrong', async () => {
    const missingRes = await GET(makeCronRequest());
    expect(missingRes.status).toBe(401);

    const wrongRes = await POST(makeCronRequest('Bearer wrong-secret'));
    expect(wrongRes.status).toBe(401);

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('fetches OpenAQ only once per unique city, notifies only on threshold flips, and makes zero Gemini calls', async () => {
    // Two Care Spaces in Hyderabad (different casing) + one unchanged Care Space in Hyderabad
    // OpenAQ PM2.5 = 90 ug/m3 => CPCB AQI = 200
    const spaces: MockCareSpaceRow[] = [
      {
        id: 'space-flip-caution',
        user_id: 'user-1',
        label: 'My Home',
        city: 'Hyderabad',
        safe_aqi_limit: 100, // 200 > 100 => caution (flip from safe -> caution => NOTIFY)
        notify_enabled: true,
        last_alert_status: 'safe',
      },
      {
        id: 'space-unchanged-caution',
        user_id: 'user-1',
        label: 'Office',
        city: '  hyderabad ',
        safe_aqi_limit: 150, // 200 > 150 => caution (unchanged caution -> caution => SUPPRESS)
        notify_enabled: true,
        last_alert_status: 'caution',
      },
      {
        id: 'space-flip-safe',
        user_id: 'user-2',
        label: "Parents' Place",
        city: 'HYDERABAD',
        safe_aqi_limit: 250, // 200 <= 250 => safe (flip from caution -> safe => NOTIFY)
        notify_enabled: true,
        last_alert_status: 'caution',
      },
    ];

    const subs: MockPushSubRow[] = [
      {
        id: 'sub-1',
        user_id: 'user-1',
        endpoint: 'https://push.example.com/u1',
        p256dh: 'test-p256dh-1',
        auth: 'test-auth-1',
      },
      {
        id: 'sub-2',
        user_id: 'user-2',
        endpoint: 'https://push.example.com/u2',
        p256dh: 'test-p256dh-2',
        auth: 'test-auth-2',
      },
    ];

    const { client, updatedStatuses } = buildMockSupabase(spaces, subs);
    mockCreateClient.mockReturnValue(client);
    mockSendNotification.mockResolvedValue({ statusCode: 201 });

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('api.openaq.org/v3/locations?')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 5001,
                name: 'Hyderabad Central Monitor',
                isMonitor: true,
                sensors: [
                  {
                    id: 101,
                    parameter: { name: 'pm25', units: 'µg/m³' },
                  },
                ],
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes('api.openaq.org/v3/locations/5001/latest')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                sensorsId: 101,
                value: 90,
                datetime: { utc: '2026-01-01T08:00:00Z' },
              },
            ],
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    global.fetch = fetchMock as typeof fetch;

    const response = await GET(makeCronRequest('Bearer test-cron-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      checkedCities: 1,
      checkedSpaces: 3,
      statusesUpdated: 2,
      notificationsSent: 2,
    });

    // OpenAQ location search called strictly ONCE for all 3 spaces in Hyderabad
    const locationCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('api.openaq.org/v3/locations?')
    );
    expect(locationCalls).toHaveLength(1);

    // Push notifications dispatched strictly for the 2 flipped spaces
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(updatedStatuses).toEqual([
      { id: 'space-flip-caution', last_alert_status: 'caution' },
      { id: 'space-flip-safe', last_alert_status: 'safe' },
    ]);

    // Zero Gemini calls in the Phase 4 cron architecture
    expect(mockGeminiConstructor).not.toHaveBeenCalled();
  });

  it('removes expired push subscriptions when web-push responds with HTTP 410', async () => {
    const spaces: MockCareSpaceRow[] = [
      {
        id: 'space-expired',
        user_id: 'user-3',
        label: 'College',
        city: 'Pune',
        safe_aqi_limit: 100,
        notify_enabled: true,
        last_alert_status: 'safe',
      },
    ];
    const subs: MockPushSubRow[] = [
      {
        id: 'sub-gone',
        user_id: 'user-3',
        endpoint: 'https://push.example.com/expired',
        p256dh: 'test-p256dh',
        auth: 'test-auth',
      },
    ];

    const { client, deletedSubIds } = buildMockSupabase(spaces, subs);
    mockCreateClient.mockReturnValue(client);
    mockSendNotification.mockRejectedValue({ statusCode: 410 });

    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/v3/locations?')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 7001,
                name: 'Pune Station',
                sensors: [{ id: 201, parameter: { name: 'pm25', units: 'µg/m³' } }],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          results: [{ sensorsId: 201, value: 110, datetime: { utc: '2026-01-01T08:00:00Z' } }],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    const response = await POST(makeCronRequest('Bearer test-cron-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notificationsSent).toBe(0);
    expect(deletedSubIds).toEqual(['sub-gone']);
  });
});
