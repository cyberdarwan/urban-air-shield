import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';
import {
  deduplicateCities,
  evaluateThresholdFlip,
} from '@/lib/alert-evaluator';
import { fetchLiveCityAqi } from '@/lib/live-aqi';
import { timingSafeBearerMatch } from '@/lib/security';

interface CareSpaceAlertRow {
  id: string;
  user_id: string;
  label: string;
  city: string;
  safe_aqi_limit: number;
  notify_enabled: boolean;
  last_alert_status: string | null;
}

interface PushSubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function handleCheckAir(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!timingSafeBearerMatch(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:alerts@smogsense.app';

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Supabase service credentials not configured' },
      { status: 503 }
    );
  }

  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 503 }
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: spaces, error: spacesError } = await admin
    .from('care_spaces')
    .select('id, user_id, label, city, safe_aqi_limit, notify_enabled, last_alert_status')
    .eq('notify_enabled', true);

  if (spacesError) {
    return NextResponse.json(
      { error: 'Failed to query care spaces' },
      { status: 500 }
    );
  }

  const activeSpaces = (spaces || []) as CareSpaceAlertRow[];
  if (activeSpaces.length === 0) {
    return NextResponse.json({
      ok: true,
      checkedCities: 0,
      checkedSpaces: 0,
      notificationsSent: 0,
    });
  }

  // Deduplicate unique cities case-insensitively so we fetch live AQI once per city (zero Gemini calls)
  const uniqueCities = deduplicateCities(activeSpaces);

  const cityAqiEntries = await Promise.all(
    uniqueCities.map(async (city) => {
      const data = await fetchLiveCityAqi({ city });
      return [city.toLowerCase(), data] as const;
    })
  );
  const cityAqiMap = Object.fromEntries(cityAqiEntries);

  // Fetch push subscriptions for all users with active alerts
  const userIds = Array.from(new Set(activeSpaces.map((s) => s.user_id)));
  const { data: subsData } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  const subsByUser = new Map<string, PushSubRow[]>();
  for (const sub of (subsData || []) as PushSubRow[]) {
    const list = subsByUser.get(sub.user_id) || [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  let notificationsSent = 0;
  let statusesUpdated = 0;

  for (const space of activeSpaces) {
    const aqiInfo = cityAqiMap[space.city.trim().toLowerCase()];
    if (!aqiInfo) continue;

    const evaluation = evaluateThresholdFlip(
      space.last_alert_status,
      aqiInfo.aqi,
      space.safe_aqi_limit
    );

    if (evaluation.shouldNotify) {
      const userSubs = subsByUser.get(space.user_id) || [];
      const title =
        evaluation.nextStatus === 'caution'
          ? `Caution in ${space.label} (${space.city})`
          : `Okay to Move Out in ${space.label} (${space.city})`;
      const body =
        evaluation.nextStatus === 'caution'
          ? `Live AQI is ${aqiInfo.aqi} (${aqiInfo.category}), above your ${space.safe_aqi_limit} limit. Delay outdoor activity or wear a snug mask.`
          : `Live AQI dropped to ${aqiInfo.aqi} (${aqiInfo.category}), back within your ${space.safe_aqi_limit} limit.`;

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ title, body, url: '/' })
          );
          notificationsSent += 1;
        } catch (err: unknown) {
          const statusCode =
            typeof err === 'object' && err !== null && 'statusCode' in err
              ? Number((err as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 410 || statusCode === 404) {
            await admin.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
    }

    if (space.last_alert_status !== evaluation.nextStatus) {
      await admin
        .from('care_spaces')
        .update({ last_alert_status: evaluation.nextStatus })
        .eq('id', space.id);
      statusesUpdated += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    checkedCities: uniqueCities.length,
    checkedSpaces: activeSpaces.length,
    statusesUpdated,
    notificationsSent,
  });
}

export async function GET(request: NextRequest) {
  return handleCheckAir(request);
}

export async function POST(request: NextRequest) {
  return handleCheckAir(request);
}
