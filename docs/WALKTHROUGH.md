# SmogSense — Technical Architecture & End-to-End Walkthrough

This document provides a complete engineering walkthrough of **SmogSense** (`urban-air-shield`), tracing every screen, data model, API route, security guardrail, and database policy in the codebase.

---

## 1. System Architecture & Data Models

### 1.1 Core TypeScript Models (`src/types/air-quality.ts`)
- **`UserProfile`**: Captures `mode` (`'personal' | 'school' | 'industry'`), `location` (`{ city, town? }`), and six multi-select arrays (`stepOutWindows`, `travelModes`, `householdMembers`, `healthSensitivities`, `homeSurroundings`, `existingProtection`) that accept both preset chips and user-entered custom strings.
- **`CareSpaceProfile` & `CareSpacesStore`**: Wraps a `UserProfile` with `id` (UUID), `label` (e.g. `"My Home"`, `"Parents' Place"`), `city`, `safeAqiLimit` (`50 | 100 | 150 | 200` or custom slider `40–250`), `notifyEnabled`, and `lastAlertStatus` (`'safe' | 'caution' | null`).
- **`AqiResponse`**: Holds `stationName`, `locationLabel`, `aqi`, `category` (`Good` through `Severe`), `pollutants` (`pm25`, `pm10`, `no2`, `o3`, `co`, `so2`), `advisories` (`RegionalAdvisory[]`), `simulated`, and `debug` (`AqiDebugInfo` with `source`, `upstreamStatus`, `stationId`, `mappedPollutants`, `fallbackReason`).
- **`RecommendationPayload`**: Structured Gemini JSON output containing `heroVerdict`, `officialWarnings` (`isGrapRegion`, `advisoryTitle`, `stageOrLevel`, `headline`, `bullets`), `clockWindows` (`bestWindowToStepOut`, `peakSmokeHours`), `todaysPracticalMoves` (`onTheMove`, `atHome`, `forYourHousehold`, `quickChecklist`), and `futureLifestyleUpgrades`.

### 1.2 Atmospheric Daylight Design System (`src/app/globals.css`)
- **Canvas & Surfaces**: Warm Alabaster `#FAF9F6` background with non-interactive drifting radial gradient orbs (`driftSlow`, `driftReverse`) in soft emerald (`#10B981/10`), warm amber (`#F59E0B/10`), and sky mist (`#0EA5E9/10`). Elevated cards use `bg-white/80 backdrop-blur-md border border-[#E7E5E0] shadow-sm`.
- **Typography & Accents**: Deep Slate (`#0F172A`) headings and AQI scores (`tabular-nums`), Muted Slate (`#475569`) secondary copy, Vibrant Emerald (`#059669` / `#ECFDF5`) for primary actions and safe states, Warm Amber (`#D97706` / `#FFFBEB`) for moderate/caution states, and Soft Rose (`#E11D48` / `#FFF1F2`) for unhealthy/severe states.
- **Accessibility**: All custom keyframe animations (`driftSlow`, `driftReverse`, `pulseRing`, `waveFloat`) are disabled under `@media (prefers-reduced-motion: reduce)`.

---

## 2. Annotated File-by-File Walkthrough

### App Shell & Routing (`src/app/`)
- `src/app/layout.tsx`: Configures `Geist` / `Geist_Mono` fonts and page metadata.
- `src/app/page.tsx`: Client orchestrator managing `hydrated`, `showLanding`, `store` (`CareSpacesStore`), `user` (Supabase `User`), `activeView` (`'dashboard' | 'profiles' | 'help' | 'account'`), `drawerOpen`, and live telemetry/recommendation fetches with `AbortController` cancellation.
- `src/app/auth/callback/route.ts`: Server Route Handler exchanging the Supabase `?code=` query parameter via `exchangeCodeForSession(code)` and redirecting to `/`.
- `src/middleware.ts`: Refreshes Supabase HTTP-only session cookies on page requests when env vars are set, without blocking guest access.

### UI Components (`src/components/`)
- `LandingPage.tsx`: Animated hero with floating SVG particulate waves, pulsing AQI safety ring, live-cycling preview card (*My Home*, *Parents' Place*, *Daily Commute*), 3 Bento feature cards, **Continue as Guest** CTA, and **Sign In & Sync** view (Google OAuth + Email Magic Link).
- `OnboardingWizard.tsx`: 3-step tap-chip setup (`CitySelector` + Support Mode + Step-Out Windows → Travel + Household + Health → Home Surroundings + Existing Protection). Every multi-select section includes a **`+ Other / Custom`** inline input that renders removable custom pills.
- `CitySelector.tsx`: Quick-tap pills for 8 top Indian metros, a searchable dropdown of 60+ Indian cities (`EXPANDED_INDIAN_CITIES`, zero state names), and a manual city/town input.
- `Dashboard.tsx`: Minimal header (`☰`, `SmogSense`, active Care Space pill, `CitySelector`, station + IST timestamp, Care Space quick-switch pills), Hero AQI card with pulsing safety ring and **Movement Verdict**, 6 horizontal pollutant tiles (`PM2.5`, `PM10`, `NO₂`, `O₃`, `CO`, `SO₂`), **Clock-Hour Windows** (`HourlyAirWave`), **Today's Practical Moves**, **Regional Advisory** (`CAQM GRAP Protocol` vs. `CPCB Citizen Guidance`), and **Future Lifestyle Upgrades**.
- `HourlyAirWave.tsx`: Compact `136px` tall SVG cubic-Bézier spline (`06:00` – `22:00`) with Rose → Amber → Emerald gradient fill, interactive nodes, routine hour dots, and a slim inline inspector bar defaulting to the lowest-AQI afternoon window.
- `MenuDrawer.tsx`: Slide-out left drawer (`bg-[#FAF9F6]/95 backdrop-blur-xl z-50`) with view navigation (**Dashboard**, **Family Profiles** count badge, **AQI Scale & Help**, **Account & Alerts**), **Quick Controls** (**Refresh Live AQI**, **Simulate Severe Smog**, **About / Welcome Screen**), and a `Guest Mode` / `Synced` status pill.
- `FamilyProfilesView.tsx`: Multi-city Family Rollup card (**Refresh All Family Cities**, **Share All Family Places on WhatsApp**), saved Care Space cards with **Switch to Dashboard / Edit / Share Brief / Delete**, and an inline Add/Edit form with Safe AQI Limit presets (`50`, `100`, `150`, `200`) + slider.
- `HelpGuideView.tsx`: Reference view covering the 6 Indian CPCB AQI bands (`0–500`), a 6-pollutant source/impact guide, and an explanation of OpenAQ v3 + CPCB sub-index calculation.
- `AccountAuthView.tsx`: Passwordless Google/Magic Link login when signed out; account summary, **Sync Now**, **Sign Out**, **Enable Browser Push Alerts** (`Notification.requestPermission()` + `/sw.js` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), **Send Test Alert**, and per-Care-Space `notifyEnabled` switches when signed in.
- `ExpertChatBox.tsx`: Fixed bottom-right stacked circular FABs (`52px × 52px` WhatsApp Share above `52px × 52px` AI Air Expert) and an expandable `bg-white/90 backdrop-blur-xl` popover chat window with starter chips and `Escape`-to-close support.

### Server Libraries & Service Worker (`src/lib/` & `public/`)
- `src/lib/live-aqi.ts`: Shared live AQI pipeline (OpenAQ v3 `coordinates=lat,lng&radius=25000` + Open-Meteo geocoding for unmapped Indian cities → CPCB `data.gov.in` fallback → deterministic regional baseline fallback).
- `src/lib/aqi-utils.ts`: Indian CPCB linear interpolation breakpoints (`PM2.5`, `PM10`, `NO₂`, `O₃`, `SO₂`, `CO`), `convertToCpcbUnit`, `isGrapCity`, `getRegionalAdvisories`, and `buildHourlyTimeline`.
- `src/lib/gemini.ts`: `GEMINI_MODEL_CHAIN` waterfall + `withTimeout` (8s per model).
- `src/lib/care-spaces.ts`: `localStorage` persistence (`smogsense_care_spaces_v1`), automatic legacy `smogsense_profile_v1` migration, WhatsApp brief formatting, and Supabase two-way sync (`syncCareSpacesOnSignIn`, `upsertCareSpaceInCloud`, `deleteCareSpaceInCloud`).
- `src/lib/security.ts`: In-memory per-IP rate limiter (20 req/min/IP), 64 KB `safeJsonBody`, input sanitizers, and `isPromptInjectionAttempt`.
- `public/sw.js`: Service Worker handling `push` events (`showNotification`) and `notificationclick` events.

---

## 3. End-to-End User & Data Flows

### Flow A: First-Time Visitor vs. Returning User Routing
1. On mount, `src/app/page.tsx` reads `localStorage` (`loadCareSpaces()`) and checks Supabase `supabase.auth.getUser()`.
2. **First-time visitor** (no local Care Space and not signed in): `showLanding` is `true` → renders `LandingPage.tsx`.
   - Clicking **Continue as Guest** opens `OnboardingWizard.tsx` to create the initial `"My Home"` Care Space.
   - Clicking **Sign In & Sync** opens the passwordless Google / Magic Link panel; after `/auth/callback`, `syncCareSpacesOnSignIn` loads cloud Care Spaces and routes straight to the Dashboard.
3. **Returning user** (local Care Space exists or active Supabase session): `showLanding` is `false` → loads directly into `Dashboard.tsx`. Any user can revisit `LandingPage.tsx` via **Menu → About / Welcome Screen**.

### Flow B: Live AQI, Threshold Verdict, Hourly Wave & Gemini Waterfall
1. Whenever `activeCareSpace.profile` or `simulateSevere` changes, `page.tsx` creates an `AbortController` and calls `GET /api/aqi?city=...` (`cache: 'no-store'`).
2. `fetchLiveCityAqi` resolves city coordinates (`city-coords.ts` or Open-Meteo `countryCode=IN`), queries OpenAQ v3 `/v3/locations?iso=IN&coordinates=lat,lng&radius=25000`, tries up to 6 candidate stations, maps `sensorsId → { name, units }`, converts units to Indian CPCB standards, and computes the max sub-index.
3. `Dashboard.tsx` compares `aqiData.aqi <= activeCareSpace.safeAqiLimit` to render **Okay to Move Out** (Emerald) or **Caution: Delay Outdoor Activity** (Rose), and passes `buildHourlyTimeline(aqiData.aqi)` to `HourlyAirWave.tsx`.
4. `page.tsx` then calls `POST /api/recommend` with `{ profile, aqiData }`. The server checks its 10-minute TTL cache and in-flight deduplication `Map`; on cache miss, `generateWithGeminiWaterfall` tries `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-3.6-flash` → `gemini-3.8-flash` (8s timeout each) before falling back to `buildFallbackRecommendations`.

### Flow C: Multi-City Care Spaces, WhatsApp Briefs & Cloud Sync
1. In `FamilyProfilesView.tsx`, users can add/edit Care Spaces with custom `safeAqiLimit` thresholds and click **Refresh All Family Cities** to fetch `/api/aqi` once per unique city.
2. Clicking the floating **WhatsApp Share** circular FAB (or **Share Brief** / **Share All Family Places on WhatsApp**) formats a plain-text brief via `formatWhatsAppBrief` / `formatFamilyRollupWhatsAppBrief` and opens `https://wa.me/?text=...` (with clipboard fallback).
3. When signed in, every Care Space save, edit, alert toggle, or delete writes immediately to `localStorage` and Supabase `care_spaces`. On first sign-in, guest Care Spaces are automatically migrated to Supabase (or non-duplicate local spaces are merged with existing cloud rows).

### Flow D: Phase 4 Zero-Gemini Hourly Threshold Alert Pipeline
1. In `AccountAuthView.tsx`, a signed-in user clicks **Enable Browser Push Alerts** → requests `Notification.requestPermission()`, registers `/sw.js`, subscribes via `pushManager.subscribe` with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and `POST`s the subscription to `/api/push/subscribe`.
2. An external hourly cron hits `GET /api/cron/check-air` with `Authorization: Bearer ${CRON_SECRET}`.
3. `/api/cron/check-air` uses `SUPABASE_SERVICE_ROLE_KEY` to fetch `care_spaces` where `notify_enabled = true`, deduplicates unique cities, fetches live AQI via `fetchLiveCityAqi` (**zero Gemini calls**), compares `aqi <= safe_aqi_limit` (`'safe'` vs `'caution'`), sends Web Push notifications only when `nextStatus !== last_alert_status`, deletes `410` / `404` expired subscriptions, and updates `last_alert_status`.

---

## 4. API Routes & Database Schema Reference

### 4.1 API Endpoints

| Route | Method(s) | Auth / Protection | Request | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/aqi` | `GET` | Query param sanitization (`max 80 chars`) | `?city=&town=&state=&stationId=&simulate=` | `AqiResponse` (`aqi`, `category`, `pollutants`, `advisories`, `debug`) |
| `/api/recommend` | `POST` | 20 req/min/IP rate limit, 64 KB JSON cap | `{ profile, aqiData }` | `{ recommendations, generatedBy, debug }` |
| `/api/chat` | `POST` | 20 req/min/IP, ≤ 1,000 chars/msg, anti-injection | `{ messages, profile, aqiData }` | `{ reply, generatedBy, debug }` |
| `/api/push/subscribe` | `POST`, `DELETE` | Authenticated Supabase user (`401` if guest) | `{ action?: 'subscribe'\|'test', subscription }` | `{ ok: true, sent? }` |
| `/api/cron/check-air` | `GET`, `POST` | `Authorization: Bearer ${CRON_SECRET}` (`401` if invalid) | — | `{ ok, checkedCities, checkedSpaces, statusesUpdated, notificationsSent }` |

### 4.2 Database Schema & RLS (`supabase/schema.sql` & `supabase/phase4_alerts.sql`)

#### `public.care_spaces`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary key (`gen_random_uuid()`) |
| `user_id` | `uuid` | References `auth.users(id) on delete cascade` (indexed) |
| `label` | `text` | Care Space name (e.g., `"My Home"`) |
| `city` | `text` | Indian city name |
| `safe_aqi_limit` | `integer` | Default `100` |
| `profile` | `jsonb` | Serialized `UserProfile` |
| `notify_enabled` | `boolean` | Default `false` |
| `last_alert_status` | `text` | `'safe' \| 'caution' \| null` |
| `updated_at` | `timestamptz` | Default `now()` |

**RLS Policies**: `SELECT`, `INSERT`, `UPDATE`, `DELETE` all enforce `auth.uid() = user_id`.

#### `public.push_subscriptions`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary key (`gen_random_uuid()`) |
| `user_id` | `uuid` | References `auth.users(id) on delete cascade` (indexed) |
| `endpoint` | `text` | Unique browser push endpoint |
| `p256dh` | `text` | Client public key |
| `auth` | `text` | Auth secret |
| `created_at` | `timestamptz` | Default `now()` |

**RLS Policies**: `SELECT`, `INSERT`, `UPDATE`, `DELETE` all enforce `auth.uid() = user_id`.

---

## 5. HTTP Security Headers & Diagnostics

- **Security Headers (`next.config.ts`)**: Applied on `/(.*)` — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Diagnostic CLI (`scripts/test-apis.mjs`)**: Run `npm run test:apis` (after `npm run build`) to test live OpenAQ v3 station `227386` (Lucknow), `Hyderabad`, and `New Delhi`, plus two contrasting profiles against `/api/recommend`.
