import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateServerClient } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mockCreateServerClient,
}));

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

import { GET as aqiGet } from '@/app/api/aqi/route';
import {
  DELETE as pushDelete,
  POST as pushPost,
} from '@/app/api/push/subscribe/route';

describe('/api/push/subscribe and /api/aqi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/aqi returns deterministic severe simulation with GRAP advisory for New Delhi', async () => {
    const req = new NextRequest(
      'http://localhost/api/aqi?city=New%20Delhi&simulate=severe'
    );
    const res = await aqiGet(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.aqi).toBe(432);
    expect(body.category).toBe('Severe');
    expect(body.simulated).toBe(true);
    expect(body.advisories[0].isGrapRegion).toBe(true);
  });

  it('POST /api/push/subscribe rejects unauthenticated requests with 401', async () => {
    mockCreateServerClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });

    const req = new NextRequest('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'test' }),
    });

    const res = await pushPost(req);
    expect(res.status).toBe(401);
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
        subscription: { endpoint: 'javascript:alert(1)', keys: { p256dh: 'a', auth: 'b' } },
      }),
    });

    const res = await pushPost(req);
    expect(res.status).toBe(400);
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
  });
});
