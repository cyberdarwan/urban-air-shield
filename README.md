# SmogSense — Urban Air Quality & Harm-Reduction Assistant

**SmogSense** is a weather-inspired, daylight-first web application built for Indian cities that turns raw air quality telemetry into practical, jargon-free daily harm-reduction guidance. Rather than giving generic *"stay indoors"* textbook advice, SmogSense cross-references live government reference station readings with each user's real routine—commute mode, step-out hours, household members, health sensitivities, home surroundings, and available gear—to deliver actionable, non-panic guidance.

> For a deep-dive technical and end-to-end user flow walkthrough, see [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md).

---

## Key Capabilities

- **Harm-Reduction Gemini 3 Engine:** Sequential multi-model waterfall (`gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-3.6-flash` → `gemini-3.8-flash` → deterministic offline fallback) with a 10-minute server TTL cache and in-flight promise deduplication.
- **Live OpenAQ v3 & Indian CPCB Pipeline:** Resolves 60+ mapped Indian cities (plus Open-Meteo geocoding for any manually typed Indian city/town) via OpenAQ v3 `coordinates=lat,lng&radius=25000`, normalizes units (`CO` → `mg/m³`; `NO₂`, `SO₂`, `O₃` → `µg/m³`), and computes official Indian CPCB linear sub-indices (`0–500`).
- **Regional Advisory Accuracy:** Displays **CAQM GRAP Protocol** advisories for `New Delhi` / NCR and **CPCB Citizen Guidance** for all other Indian cities.
- **Interactive Hourly Air Wave (`06:00` – `22:00`):** Smooth SVG spline curve with Rose → Amber → Emerald gradient fill, routine hour markers, and a slim inline inspector bar.
- **Multi-Profile Family Care Spaces:** Manage multiple locations (*My Home*, *Parents' Place*, *Son's College*) with custom Safe AQI Limits (`≤ 100`, `≤ 150`, etc.), live **Okay to Move Out / Caution** verdicts, multi-city family rollups, and one-click **WhatsApp Morning Briefs**.
- **Guest-First + Passwordless Supabase Cloud Sync:** Works immediately in `localStorage` with zero login; signing in via Google OAuth or Email Magic Link automatically migrates and syncs Care Spaces to Supabase Postgres with strict Row-Level Security.
- **Zero-Gemini Hourly Web Push Alerts:** Cron endpoint (`/api/cron/check-air`) checks active Care Spaces once per unique city using OpenAQ v3 (zero Gemini calls) and sends browser Web Push notifications via `public/sw.js` only on `'safe' ↔ 'caution'` transitions.

---

## System Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js `16.4.6` (App Router, Turbopack), React `19.3.0`, TypeScript `5` | Full-stack SSR/CSR UI and Route Handlers |
| **Styling** | Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`), Lucide Icons (`lucide-react`) | **Atmospheric Daylight** theme (`#FAF9F6` canvas, `bg-white/80` glass cards, `#0F172A` / `#475569` slate text, `#059669` emerald, `#D97706` amber, `#E11D48` rose) |
| **Live Air Telemetry** | OpenAQ v3 (`api.openaq.org/v3`), CPCB (`data.gov.in`), Open-Meteo Geocoding | Live station lookup, unit conversion, and Indian CPCB sub-index calculation |
| **Generative AI** | `@google/genai` (`^3.6.1`) | Structured JSON recommendations (`/api/recommend`) and contextual chat (`/api/chat`) |
| **Auth & Database** | `@supabase/supabase-js` (`^2.119.2`), `@supabase/ssr` (`^0.12.7`) | Passwordless Google OAuth / Email Magic Link and Postgres `care_spaces` + `push_subscriptions` with RLS |
| **Push Notifications** | `web-push`, Service Worker (`public/sw.js`) | VAPID-signed browser push alerts triggered by `/api/cron/check-air` |

---

## Project Directory

```text
├── public/
│   └── sw.js                          # Service Worker for Web Push & notificationclick
├── scripts/
│   └── test-apis.mjs                  # Local CLI diagnostic for OpenAQ v3 & Gemini waterfall
├── supabase/
│   ├── schema.sql                     # Phase 3: care_spaces table + user_id index + RLS
│   └── phase4_alerts.sql              # Phase 4: push_subscriptions table + alert columns
├── src/
│   ├── middleware.ts                  # Refreshes Supabase HTTP-only auth cookies
│   ├── types/
│   │   └── air-quality.ts             # CareSpaceProfile, UserProfile, AqiResponse, RecommendationPayload
│   ├── lib/
│   │   ├── aqi-utils.ts               # Indian CPCB breakpoints, unit conversion, regional advisories, diurnal curve
│   │   ├── care-spaces.ts             # localStorage store, legacy migration, WhatsApp briefs, Supabase sync
│   │   ├── city-coords.ts             # Coordinates for 60+ Indian cities
│   │   ├── gemini.ts                  # Gemini 3 waterfall client + 8s timeout wrapper
│   │   ├── live-aqi.ts                # Shared OpenAQ v3 -> CPCB -> baseline fetcher + debug metadata
│   │   ├── security.ts                # Per-IP rate limiter, safeJsonBody, sanitization, prompt-injection guard
│   │   └── supabase/
│   │       ├── client.ts              # Safe browser Supabase client (null when unconfigured)
│   │       └── server.ts              # SSR/Route Handler Supabase client using cookies()
│   ├── app/
│   │   ├── globals.css                # Atmospheric Daylight tokens + reduced-motion keyframes
│   │   ├── layout.tsx                 # Root layout & Geist fonts
│   │   ├── page.tsx                   # Smart routing (Landing / Onboarding / Multi-View Shell) + AbortController
│   │   ├── auth/callback/route.ts     # Exchanges OAuth/Magic Link code for persistent session
│   │   └── api/
│   │       ├── aqi/route.ts           # GET live AQI + CPCB sub-indices + debug metadata
│   │       ├── recommend/route.ts     # POST structured Gemini 3 harm-reduction plan (cached + rate-limited)
│   │       ├── chat/route.ts          # POST contextual Air Expert chat (rate-limited + anti-injection)
│   │       ├── push/subscribe/route.ts# POST/DELETE browser PushSubscription + test alert
│   │       └── cron/check-air/route.ts# GET/POST zero-Gemini hourly threshold alert runner
│   └── components/
│       ├── LandingPage.tsx            # Animated Atmospheric Daylight hero + Guest / Sign In entry
│       ├── OnboardingWizard.tsx       # 3-step multi-select + "+ Other / Custom" routine setup
│       ├── CitySelector.tsx           # 8 metro quick-taps + searchable 60+ city dropdown + manual entry
│       ├── Dashboard.tsx              # Hero AQI + pulsing safety ring, verdict, pollutants, moves, upgrades
│       ├── HourlyAirWave.tsx          # Compact 136px SVG spline curve + routine markers + inline inspector
│       ├── MenuDrawer.tsx             # Slide-out nav drawer + Quick Controls (Refresh, Simulate, Welcome)
│       ├── FamilyProfilesView.tsx     # Care Space CRUD, multi-city rollup, WhatsApp family check-in
│       ├── HelpGuideView.tsx          # Indian CPCB 0–500 scale, 6-pollutant guide, calculation explainer
│       ├── AccountAuthView.tsx        # Passwordless Google/Magic Link auth, Sync Now, Web Push controls
│       └── ExpertChatBox.tsx          # Stacked circular FABs (WhatsApp Share + AI Expert) & popover chat
└── next.config.ts                     # Turbopack CSS rule + HTTP security headers
```

---

## API Routes & Database Schema Summary

### API Endpoints
- `GET /api/aqi?city=&town=&stationId=&simulate=`: Returns `AqiResponse` with live OpenAQ v3 / CPCB / baseline readings, Indian CPCB category, `advisories`, and `debug` metadata (`source`, `upstreamStatus`, `stationId`, `mappedPollutants`, `fallbackReason`).
- `POST /api/recommend`: Accepts `{ profile, aqiData }`. Rate-limited (20 req/min/IP), 10-min TTL cached, and deduplicated. Returns structured `RecommendationPayload` (`heroVerdict`, `officialWarnings`, `clockWindows`, `todaysPracticalMoves`, `futureLifestyleUpgrades`) + `generatedBy` + `debug`.
- `POST /api/chat`: Accepts `{ messages, profile, aqiData }`. Rate-limited (20 req/min/IP), enforces ≤ 1,000 chars/message, blocks prompt-injection attempts, and returns `{ reply, generatedBy, debug }`.
- `POST / DELETE /api/push/subscribe`: Authenticated endpoint to save/remove browser `PushSubscription` in `push_subscriptions` or send a test alert (`action: "test"`).
- `GET / POST /api/cron/check-air`: Protected by `Authorization: Bearer ${CRON_SECRET}`. Evaluates `care_spaces` with `notify_enabled = true` (zero Gemini calls) and dispatches Web Push alerts on `'safe' ↔ 'caution'` transitions.

### Supabase Tables (RLS Enforced: `auth.uid() = user_id`)
- `public.care_spaces` ([`supabase/schema.sql`](supabase/schema.sql)): Stores `id`, `user_id`, `label`, `city`, `safe_aqi_limit`, `profile` (`jsonb`), `notify_enabled`, `last_alert_status`, `updated_at`.
- `public.push_subscriptions` ([`supabase/phase4_alerts.sql`](supabase/phase4_alerts.sql)): Stores `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `created_at`.

---

## Local Setup & Environment Variables

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure `.env.local`
Copy `.env.local.example` to `.env.local` and populate:

```env
# Required for live AI recommendations & chat (falls back offline if omitted)
GEMINI_API_KEY=

# Required for live OpenAQ v3 Indian station readings
OPENAQ_API_KEY=

# Optional CPCB (data.gov.in) fallback key
DATA_GOV_API_KEY=

# Optional: Supabase Auth & Cloud Sync (omit for Guest-only mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional: Phase 4 Web Push & Hourly Cron Alerts
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:alerts@smogsense.app
CRON_SECRET=
```

Generate VAPID keys if enabling Phase 4 push alerts:
```bash
npx web-push generate-vapid-keys
```

### 3. Run Supabase SQL Migrations
In **Supabase Dashboard → SQL Editor**, execute in order:
1. [`supabase/schema.sql`](supabase/schema.sql)
2. [`supabase/phase4_alerts.sql`](supabase/phase4_alerts.sql)

In **Supabase → Authentication → URL Configuration**, set your Site URL and add `/auth/callback` Redirect URLs (e.g., `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback`).

### 4. Run Locally & Verify Diagnostics
```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build & TypeScript verification
npm run test:apis    # Live diagnostic check against OpenAQ v3 & Gemini waterfall
```

### 5. Deploy to Vercel + External Hourly Cron
1. Push your branch to GitHub and import the repository in **Vercel**.
2. Add all environment variables from `.env.local` into **Vercel → Project Settings → Environment Variables**.
3. Configure an external cron runner (e.g., cron-job.org or GitHub Actions) to call `GET https://<your-vercel-domain>/api/cron/check-air` hourly with header `Authorization: Bearer <CRON_SECRET>`.
