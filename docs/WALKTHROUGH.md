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

### App Shell, Proxy & Hooks (`src/app/`, `src/proxy.ts`, `src/hooks/`)
- `src/app/layout.tsx`: Configures `Geist` / `Geist_Mono` fonts, page metadata, and an accessible skip-to-main-content link targeting `#main-content`.
- `src/app/error.tsx`: Atmospheric Daylight client Error Boundary (`role="alert"`) with a **Retry** button that preserves saved Care Spaces.
- `src/app/page.tsx`: Thin client routing shell connecting `useCareSpaces()` to `LandingPage`, `OnboardingWizard`, `Dashboard`, secondary views, `MenuDrawer`, and `ExpertChatBox`.
- `src/hooks/useCareSpaces.ts`: Manages `localStorage` hydration, Supabase auth & two-way cloud sync, `AbortController`-guarded telemetry/recommendation fetches (with `?refresh=1` cache bypass), and Care Space CRUD handlers.
- `src/app/auth/callback/route.ts`: Server Route Handler exchanging the Supabase `?code=` query parameter via `exchangeCodeForSession(code)` and redirecting to `/`.
- `src/proxy.ts`: Next.js 16 `proxy` refreshing Supabase HTTP-only session cookies on page and authenticated routes while excluding `/api/aqi`, `/api/cron`, `sw.js`, and static assets.

### UI Components (`src/components/`)
- `LandingPage.tsx`: Animated hero with floating SVG particulate waves, pulsing AQI safety ring, live-cycling preview card (*My Home*, *Parents' Place*, *Daily Commute*), 3 Bento feature cards, **Continue as Guest** CTA, and **Sign In & Sync** view powered by `AuthForm`.
- `AuthForm.tsx`: Shared accessible Google OAuth + Email Magic Link form used by both `LandingPage` and `AccountAuthView`.
- `OnboardingWizard.tsx` & `WizardModeDetails.tsx`: 3-step tap-chip setup using `MultiSelectChips`, `CitySelector`, and optional school/workplace detail selectors.
- `MultiSelectChips.tsx`: Shared accessible multi-select chip group with `aria-pressed` toggles and `+ Other / Custom` inline entry.
- `CitySelector.tsx`: Quick-tap pills for 8 top Indian metros, a searchable dropdown of 60+ Indian cities (`EXPANDED_INDIAN_CITIES`, zero state names), and a manual city/town input.
- `Dashboard.tsx` & `GuidanceSection.tsx`: Minimal header, Hero AQI card with pulsing safety ring and **Movement Verdict** (`isAirSafe`), 6 horizontal pollutant tiles (`PM2.5`, `PM10`, `NO₂`, `O₃`, `CO`, `SO₂`), **Clock-Hour Windows** (`HourlyAirWave`), **Today's Practical Moves**, **Regional Advisory** (`CAQM GRAP Protocol` vs. `CPCB Citizen Guidance`), and **Future Lifestyle Upgrades**.
- `HourlyAirWave.tsx`: Compact `136px` tall SVG cubic-Bézier spline (`06:00` – `22:00`) with Rose → Amber → Emerald gradient fill, keyboard-accessible nodes, routine hour dots, and an `aria-live="polite"` inspector bar defaulting to `findSafestHourlyWindow`.
- `MenuDrawer.tsx`: Accessible modal slide-out drawer (`aria-modal="true"`, focus management, `Escape`-to-close) with view navigation, **Quick Controls**, and `Guest Mode` / `Synced` status pill.
- `FamilyProfilesView.tsx` & `CareSpaceForm.tsx`: Multi-city Family Rollup card (**Refresh All Family Cities**, **Share Family Check-In**), saved Care Space cards, and an accessible inline Add/Edit form with Safe AQI Limit presets (`50`, `100`, `150`, `200`) + range slider.
- `HelpGuideView.tsx`: Reference view covering the 6 Indian CPCB AQI bands (`0–500`), a 6-pollutant source/impact guide, and an explanation of OpenAQ v3 + CPCB sub-index calculation.
- `AccountAuthView.tsx`: Uses `AuthForm` when signed out; renders account summary, **Sync Now**, **Sign Out**, **Enable Browser Push Alerts**, **Send Test Alert**, and per-Care-Space `notifyEnabled` switches when signed in.
- `ExpertChatBox.tsx`: Fixed bottom-right stacked circular FABs (`52px × 52px` WhatsApp Share above `52px × 52px` AI Air Expert) and an accessible modal popover chat (`aria-modal="true"`, focus management, `Escape`-to-close).

### Server Libraries, Testing & Service Worker (`src/lib/`, `vitest.config.mts`, `public/`)
- `src/lib/live-aqi.ts`: Orchestrates `openaq-client.ts` (OpenAQ v3 + Open-Meteo geocoding) → `cpcb-client.ts` (CPCB `data.gov.in`) → `aqi-fallback.ts` (deterministic regional baseline & severe simulator) with a 3-minute per-city server cache (`clearAqiCache()` + `bypassCache` on manual refresh).
- `src/lib/aqi-utils.ts` & `src/lib/regional-advisories.ts`: Indian CPCB linear interpolation breakpoints, `clampAqi`, `classifyAqiSeverity`, `isAirSafe`, `buildHourlyTimeline`, `findSafestHourlyWindow`, and GRAP vs. CPCB advisories.
- `src/lib/alert-evaluator.ts`: Pure Phase 4 transition logic (`evaluateThresholdFlip`) and case-insensitive city deduplication (`deduplicateCities`).
- `src/lib/whatsapp-formatter.ts`: Pure single-space and family rollup WhatsApp brief formatters with graceful defaults.
- `src/lib/validators.ts`: Zero-dependency payload validators for `/api/recommend`, `/api/chat`, and HTTPS-only `/api/push/subscribe`.
- `src/lib/recommendation-schema.ts` & `src/lib/recommendation-fallback.ts`: Shared Gemini structured JSON schema, custom profile entry collector, and deterministic harm-reduction / chat fallback builders.
- `src/lib/gemini.ts`: `GEMINI_MODEL_CHAIN` waterfall + timeout wrapper.
- `src/lib/care-spaces.ts`: `localStorage` persistence, legacy profile migration, WhatsApp launch/clipboard share, and Supabase two-way sync.
- `src/lib/security.ts`: Timing-safe Bearer secret matcher (`timingSafeBearerMatch`), per-IP rate limiter, bounded JSON body parser, input sanitizers, and prompt-injection guardrails.
- `vitest.config.mts` & `.github/workflows/ci.yml`: Offline mocked Vitest + React Testing Library test suites with v8 coverage thresholds (`>= 85%`) run automatically in CI (`typecheck` → `lint` → `test` → `build`).
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
2. `fetchLiveCityAqi` resolves city coordinates (`city-coords.ts` or Open-Meteo `countryCode=IN`), queries OpenAQ v3 Indian reference stations, maps `sensorsId → { name, units }`, converts units to Indian CPCB standards, and computes the max sub-index.
3. `Dashboard.tsx` compares `aqiData.aqi <= activeCareSpace.safeAqiLimit` to render **Okay to Move Out** (Emerald) or **Caution: Delay Outdoor Activity** (Rose), and passes `buildHourlyTimeline(aqiData.aqi)` to `HourlyAirWave.tsx`.
4. `page.tsx` then calls `POST /api/recommend` with `{ profile, aqiData }`. The server checks its short-lived in-memory cache and in-flight deduplication `Map`; on cache miss, `generateWithGeminiWaterfall` tries the Gemini 3 model chain sequentially before falling back to `buildFallbackRecommendations`.

### Flow C: Multi-City Care Spaces, WhatsApp Briefs & Cloud Sync
1. In `FamilyProfilesView.tsx`, users can add/edit Care Spaces with custom `safeAqiLimit` thresholds and click **Refresh All Family Cities** to fetch `/api/aqi` once per unique city.
2. Clicking the floating **WhatsApp Share** circular FAB (or **Share Brief** / **Share All Family Places on WhatsApp**) formats a plain-text brief via `formatWhatsAppBrief` / `formatFamilyRollupWhatsAppBrief` and opens `https://wa.me/?text=...` (with clipboard fallback).
3. When signed in, every Care Space save, edit, alert toggle, or delete writes immediately to `localStorage` and Supabase `care_spaces`. On first sign-in, guest Care Spaces are automatically migrated to Supabase (or non-duplicate local spaces are merged with existing cloud rows).

### Flow D: Phase 4 Zero-Gemini Hourly Threshold Alert Pipeline
1. In `AccountAuthView.tsx`, a signed-in user clicks **Enable Browser Push Alerts** → requests `Notification.requestPermission()`, registers `/sw.js`, subscribes via `pushManager.subscribe` with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and `POST`s the subscription to `/api/push/subscribe`.
2. An external hourly cron invokes `/api/cron/check-air` with a server-side Bearer secret.
3. `/api/cron/check-air` uses the Supabase Service Role client to fetch `care_spaces` with alerts enabled, deduplicates unique cities, fetches live AQI via `fetchLiveCityAqi` (**zero Gemini calls**), compares `aqi <= safe_aqi_limit` (`'safe'` vs `'caution'`), sends Web Push notifications only on status transitions, cleans up expired subscriptions, and updates `last_alert_status`.

---

## 4. API Routes & Database Schema Reference

### 4.1 API Endpoints

| Route | Method(s) | Auth / Protection | Request | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/aqi` | `GET` | Query param sanitization | `?city=&town=&simulate=` | `AqiResponse` (`aqi`, `category`, `pollutants`, `advisories`) |
| `/api/recommend` | `POST` | Per-IP rate limit, payload & schema validation | `{ profile, aqiData }` | `{ recommendations, generatedBy }` |
| `/api/chat` | `POST` | Per-IP rate limit, length & scope guardrails | `{ messages, profile, aqiData }` | `{ reply, generatedBy }` |
| `/api/push/subscribe` | `POST`, `DELETE` | Authenticated Supabase user (`401` if guest) | `{ action?, subscription }` | `{ ok: true, sent? }` |
| `/api/cron/check-air` | `GET`, `POST` | Server-side Bearer `CRON_SECRET` (`401` if invalid) | — | `{ ok, checkedCities, checkedSpaces, notificationsSent }` |

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
