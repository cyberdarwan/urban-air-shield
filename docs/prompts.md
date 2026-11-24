## Prompt Engineering & Development Log

**SmogSense** was built iteratively using AI-assisted software engineering (Antigravity + Gemini), progressing from core sensor integration to cloud synchronization, zero-quota background alerting, and a custom "Atmospheric Daylight" design system. Below are the key architectural prompts that shaped the application:

### 1. Passwordless Cloud Sync & Guest Migration (Phase 3)
> **Goal:** Allow zero-friction guest usage while seamlessly migrating local profiles to PostgreSQL upon sign-in.
>
> **Prompt:**
> *"Implement passwordless authentication (Google OAuth + Email Magic Link) via Supabase Auth and PostgreSQL cloud sync for Care Spaces. Keep Guest Mode working seamlessly via `localStorage` when signed out, and automatically merge/upsert any locally created Care Spaces into Supabase `care_spaces` with Row-Level Security (`auth.uid() = user_id`) the moment a guest signs in."*

### 2. Zero-Gemini Background Push Alert Engine (Phase 4)
> **Goal:** Deliver 24/7 hourly air-quality threshold alerts without consuming daily LLM API quotas.
>
> **Prompt:**
> *"Implement a zero-Gemini background push notification system using Web Push (`public/sw.js` + `web-push`) and a protected `/api/cron/check-air` endpoint. Fetch all active `care_spaces` with `notify_enabled = true`, deduplicate unique cities before querying OpenAQ v3 once per city, evaluate `liveAqi <= safe_aqi_limit` using deterministic threshold logic (zero Gemini calls), and dispatch push notifications only when a profile's status flips between `safe` and `caution`."*

### 3. Animated "Atmospheric Daylight" Landing & Smart Routing (Phase 5A)
> **Goal:** Create an inviting, modern first impression while keeping returning users one click away from live data.
>
> **Prompt:**
> *"Build an animated Landing & Onboarding flow (`LandingPage.tsx`) using an Atmospheric Daylight palette: Warm Alabaster (`#FAF9F6`) background with slow-drifting radial gradient orbs (`prefers-reduced-motion` safe), `bg-white/80 backdrop-blur-md` glassmorphic cards, Deep Slate (`#0F172A`) typography, and Vibrant Emerald (`#059669`) primary CTAs. Include an interactive SVG clean-air/PM2.5 wave hero with a pulsing safety ring, two entry paths ('Continue as Guest' -> Onboarding Wizard, and 'Sign In & Sync' -> Google/Magic Link auth), and Dashboard-first routing for returning users."*

### 4. Global Theme Unification, Decluttered Header & Stacked FABs (Phase 5B)
> **Goal:** Establish visual consistency across every view and optimize thumb-friendly mobile navigation.
>
> **Prompt:**
> *"Unify the entire application (`Dashboard`, `OnboardingWizard`, `MenuDrawer`, `ProfilesManager`, `AccountAuthView`, `HelpGuide`, and the AI Chat widget) under the Atmospheric Daylight glassmorphic design tokens. Declutter the top header by moving utility actions (`Refresh Live AQI`, `Simulate Severe Smog`) into the slide-out `MenuDrawer`, and stack two matching circular floating action buttons in the bottom-right corner—One-Click WhatsApp Morning Brief sharing directly above the AI Air Expert chat trigger."*

### 5. Fluid SVG Hourly Air Wave & Interactive Scrubber (Phase 5C)
> **Goal:** Replace dense, repetitive numeric grids with a glanceable visual timeline.
>
> **Prompt:**
> *"Redesign the Clock-Hour Windows section by replacing the 9 bordered hourly boxes with a compact, borderless SVG spline area curve (`06:00`–`22:00`) filled with a semantic gradient that dips during the afternoon clearing window. Plot interactive routine markers along the curve and connect hover/tap scrubbing to a slim inline inspector bar displaying the selected hour's AQI and actionable micro-verdict."*
