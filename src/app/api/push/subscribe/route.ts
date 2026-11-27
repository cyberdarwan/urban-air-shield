import { NextRequest, NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { safeJsonBody, sanitizeShortText } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { validatePushSubscribePayload } from '@/lib/validators';

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:alerts@smogsense.app';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyResult = await safeJsonBody<unknown>(request, 16_000);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const validated = validatePushSubscribePayload(bodyResult.data);
  if (!validated.valid) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  if (validated.data.action === 'test') {
    if (!configureWebPush()) {
      return NextResponse.json(
        { error: 'VAPID keys not configured on server' },
        { status: 503 }
      );
    }

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user.id);

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { error: 'No browser push subscription saved yet' },
        { status: 404 }
      );
    }

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'SmogSense Test Alert',
            body: 'Threshold push alerts are active on this device.',
            url: '/',
          })
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === 'object' && err !== null && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  }

  const { endpoint, keys } = validated.data.subscription;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bodyResult = await safeJsonBody<{ endpoint?: string }>(request, 8_000);
  const endpoint = bodyResult.ok
    ? sanitizeShortText(bodyResult.data.endpoint, 1000)
    : '';

  if (endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
  }

  return NextResponse.json({ ok: true });
}
