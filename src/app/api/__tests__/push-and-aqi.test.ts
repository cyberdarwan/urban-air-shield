import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateServerClient, mockSetVapidDetails, mockSendNotification } =
  vi.hoisted(() => ({
    mockCreateServerClient: vi.fn(),
    mockSetVapidDetails: vi.fn(),
    mockSendNotification: vi.fn(),
  }));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateServerClient,
}));

vi.mock('web-push', () => ({
  setVapidDetails: mockSetVapidDetails,
  sendNotification: mockSendNotification,
}));

import { GET as aqiGet } from '@/app/api/aqi/route';
import {
  DELETE as pushDelete,
  POST as pushPost,
} from '@/app/api/push/subscribe/route';
import { clearAqiCache } from '@/lib/live-aqi';
import { clearRateLimitBuckets } from '@/lib/security';

describe('/api/push/subscribe and /api/aqi', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    clearAqiCache();
    clearRateLimitBuckets();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public';
    process.env.VAPID_PRIVATE_KEY = 'test-vapid-private';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('GET /api/aqi returns deterministic severe simulation and enforces per-IP rate limiting', async () => {
    const req = new NextRequest(
      'http://localhost/api/aqi?city=New%20Delhi&simulate=severe',
      { headers: { 'x-forwarded-for': '203.0.113.5' } }
    );
    const res = await aqiGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.aqi).toBe(432);
    expect(body.category).toBe('Severe');
    expect(body.simulated).toBe(true);
    expect(body.advisories[0].isGrapRegion).toBe(true);

    // Exhaust 60 req/min limit for this IP -> 61st returns 429
    let lastStatus = 200;
    for (let i = 0; i < 60; i++) {
      const nextRes = await aqiGet(
        new NextRequest(
          'http://localhost/api/aqi?city=New%20Delhi&simulate=severe',
          { headers: { 'x-forwarded-for': '203.0.113.5' } }
        )
      );
      lastStatus = nextRes.status;
    }
    expect(lastStatus).toBe(429);
  });

  it('POST and DELETE /api/push/subscribe return 503 when Supabase is unconfigured and 401 when unauthenticated', async () => {
    mockCreateServerClient.mockResolvedValue(null);
    const unconfiguredPost = await pushPost(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      })
    );
    expect(unconfiguredPost.status).toBe(503);

    const unconfiguredDel = await pushDelete(
      new NextRequest('http://localhost/api/push/subscribe', { method: 'DELETE' })
    );
    expect(unconfiguredDel.status).toBe(503);

    mockCreateServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });
    const unauthPost = await pushPost(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      })
    );
    expect(unauthPost.status).toBe(401);

    const unauthDel = await pushDelete(
      new NextRequest('http://localhost/api/push/subscribe', { method: 'DELETE' })
    );
    expect(unauthDel.status).toBe(401);
  });

  it('POST /api/push/subscribe rejects invalid subscription payloads with 400', async () => {
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-123' } },
        })),
      },
    });

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: {
          endpoint: 'http://insecure.example.com/sub',
          keys: { p256dh: 'a', auth: 'b' },
        },
      }),
    });

    const res = await pushPost(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/push/subscribe handles test alerts, 404 empty subs, 503 missing VAPID, and 410 cleanup', async () => {
    const deletedIds: string[] = [];

    // 503 when VAPID keys are missing
    delete process.env.VAPID_PRIVATE_KEY;
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } } })),
      },
    });
    const missingVapid = await pushPost(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      })
    );
    expect(missingVapid.status).toBe(503);

    // 404 when no subscriptions saved
    process.env.VAPID_PRIVATE_KEY = 'test-vapid-private';
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } } })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    });
    const noSubs = await pushPost(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      })
    );
    expect(noSubs.status).toBe(404);

    // 200 test dispatch + 410 expired subscription pruning
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-123' } } })),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(async () => ({
            data: [
              {
                id: 'sub-ok',
                endpoint: 'https://push.example.com/ok',
                p256dh: 'k1',
                auth: 'a1',
              },
              {
                id: 'sub-expired',
                endpoint: 'https://push.example.com/gone',
                p256dh: 'k2',
                auth: 'a2',
              },
            ],
            error: null,
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(async (_col: string, id: string) => {
            deletedIds.push(id);
            return { error: null };
          }),
        })),
      })),
    });

    mockSendNotification
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockRejectedValueOnce({ statusCode: 410 });

    const testRes = await pushPost(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ action: 'test' }),
      })
    );
    const testBody = await testRes.json();
    expect(testRes.status).toBe(200);
    expect(testBody).toEqual({ ok: true, sent: 1 });
    expect(deletedIds).toEqual(['sub-expired']);
  });

  it('POST and DELETE /api/push/subscribe persist and remove subscriptions for authenticated users', async () => {
    const upsertMock = vi.fn(async () => ({ error: null }));
    const deleteEqMock = vi.fn(async () => ({ error: null }));
    const deleteFirstEq = vi.fn(() => ({ eq: deleteEqMock }));

    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'user-123' } },
        })),
      },
      from: vi.fn(() => ({
        upsert: upsertMock,
        delete: vi.fn(() => ({ eq: deleteFirstEq })),
      })),
    });

    const postReq = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: {
          endpoint: 'https://push.example.com/sub/1',
          keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
        },
      }),
    });

    const postRes = await pushPost(postReq);
    expect(postRes.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);

    const delReq = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'https://push.example.com/sub/1' }),
    });

    const delRes = await pushDelete(delReq);
    expect(delRes.status).toBe(200);
    expect(deleteEqMock).toHaveBeenCalledWith(
      'endpoint',
      'https://push.example.com/sub/1'
    );

    // Delete all subscriptions when no endpoint is supplied
    const delAllRes = await pushDelete(
      new NextRequest('http://localhost/api/push/subscribe', {
        method: 'DELETE',
      })
    );
    expect(delAllRes.status).toBe(200);
    expect(deleteFirstEq).toHaveBeenCalledWith('user_id', 'user-123');
  });
});
