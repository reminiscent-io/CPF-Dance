# CLAUDE.md

## Project Overview

Dance teaching schedule management platform. Roles: Instructor, Dancer, Admin — each with their own portal. `guardian` is a valid signup role but has no portal and isn't handled by `proxy.ts` or `requireDancer()`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

**Key Integrations:** Stripe (payments/webhooks), TipTap (rich text editor), OpenAI (voice-to-notes, note formatting), Google Places API, Gmail (via Replit connectors), Recharts (dashboard charts)

## Design Context

Two files at the project root carry the design system. Read them before any UI work.

- **[PRODUCT.md](PRODUCT.md)** — strategic. Register, users (Courtney as sole instructor; dancers 15-25 as the volume audience), product purpose, brand personality (sophisticated, warm, precise), anti-references (no SaaS dashboard, no heavy promo site, no low-end studio cliché), design principles.
- **[DESIGN.md](DESIGN.md)** + **[DESIGN.json](DESIGN.json)** — visual. North Star is *The Ballet Noir Program*. Palette: Stage Rose accent, Curtain Gilt premium, four-tone Champagne paper, Charcoal ink. Typography: Cormorant Garamond display + Manrope body. Named rules (One Ribbon, No-White, No-Black, No Side-Stripe, Serif-For-Headings, Tight-Tracking, Flat-By-Default) are binding.

When picking colors, fonts, spacing, or component patterns, source from DESIGN.md. When making product or copy decisions, source from PRODUCT.md. Do not introduce off-system colors or fonts without naming a new role.

**Tailwind spacing is remapped** in `app/globals.css` (`p-6`=32px, `p-8`=48px, `h-16`=128px). For page chrome use the semantic tokens (`pt-page-top`, `px-page-x`, `mt-header-gap`, `mt-toolbar-gap`, `h-control`, `h-row`), not numeric utilities. Reference page: `app/(portal)/instructor/students/page.tsx`.

## Architecture

```
app/
  (portal)/           # Route group — no URL segment
    instructor/       # Instructor dashboard & management
    dancer/           # Dancer portal (schedule, notes, waivers)
    admin/            # Admin portal (all-access)
    login/ signup/    # Auth pages
  api/                # API routes (one folder per resource)
  auth/               # Auth callback handler
components/           # Shared UI; ui/ = design-system kit (barrel `@/components/ui`); admin/ dancer/ instructor/ notes/ = portal-specific
lib/
  auth/               # server-auth.ts — role guards
  supabase/           # client.ts, server.ts, middleware.ts, admin.ts (service role)
  utils/              # pricing, money (integer cents), sanitize, date helpers, calendar export
  gmail/              # Gmail via Replit connectors
  google/             # Calendar/Meet via Replit connectors
  lesson-credits.ts   # Lesson-pack credit spend/refund
proxy.ts              # Middleware — routing, auth session refresh
migrations/           # Numbered SQL migrations (05–45)
tests/                # Vitest setup, test utils, Supabase mocks
```

## Commands

```bash
npm run dev          # Dev server on port 3434 (not 3000)
npm run build        # Production build
npm start            # Production server on port 5000
npm run lint         # Linting
npx tsc --noEmit     # Typecheck — `next build` does NOT (ignoreBuildErrors). Fresh checkout: run `node scripts/generate-version.mjs` first (lib/version.ts is generated)
npm run test:run     # Run tests once
npm test             # Tests in watch mode
npm run test:coverage
npm run test:ui       # Vitest UI
npm run test:watch    # Watch mode (alias for npm test)
```

Production port 5000 maps to external port 80 on Replit. Dev server runs on port 3434 and binds to `0.0.0.0`. Keep `dev` on 3434: `.replit` waits on it, and 5000 is taken by macOS AirPlay locally.

CI (`.github/workflows/lint.yml`) runs `eslint . --max-warnings=0`, `tsc --noEmit`, `test:run`, and `build` — any lint warning fails the PR.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | `createAdminClient()` — Stripe webhook, class routes |
| `STRIPE_SECRET_KEY` | Payments | Stripe server-side key |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signature verification |
| `NEXT_PUBLIC_BASE_URL` | Optional | Base URL for Stripe redirects (falls back to request origin) |
| `OPENAI_API_KEY` | Voice/AI notes | Voice-to-notes transcription and note formatting |
| `GOOGLE_PLACES_API_KEY` | Studio search | Google Places autocomplete and details |

## Critical Rules

### Proxy Export (Next.js 16)
`proxy.ts` MUST use `export default async function proxy()` — not named export. Wrong export = middleware silently breaks.

### Supabase Client Selection
- **Server components / API routes:** `@/lib/supabase/server`
- **Client components:** `@/lib/supabase/client`
- **Middleware only:** `@/lib/supabase/middleware`
- **Service role (bypasses RLS):** `createAdminClient()` from `@/lib/supabase/admin` — server-only, after the route has authorized the caller

Using the wrong client causes auth failures in production.

### RLS vs API Filtering
Trust RLS policies for authorization. Don't add redundant `.eq('author_id', user.id)` filters in API routes when RLS already handles it — causes "0 rows" / PGRST116 errors.

### RLS Policy Recursion
RLS policies that check the `profiles` table can cause infinite recursion. Use security definer functions instead (see migrations 29-31).

### `SECURITY DEFINER` Functions Keep `SET search_path`
Always include `SET search_path = public, pg_temp` and schema-qualify types. GoTrue runs `handle_new_user()` as `supabase_auth_admin` (no `public` on its path) — omitting it broke every signup (migration 40 → fixed in 41). The SQL editor won't reproduce it; run `set_config('search_path','',true)` first.

### HTML Sanitization
All user HTML MUST be sanitized before rendering. Use `createSanitizedHtml()` from `@/lib/utils/sanitize` — never raw `dangerouslySetInnerHTML`.

### Google Integrations (Gmail + Calendar/Meet)
Both go through **Replit Connectors** via `@replit/connectors-sdk` (`connectors.proxy()`) — connector names `google-mail` and `google-calendar`, single account `courtney@cpfdance.com`. The proxy base is generic Google, so paths MUST include the full version segment: **`/calendar/v3/...`** and **`/gmail/v1/...`**. Omitting it = silent 404. Never hand-fetch OAuth tokens; the SDK handles refresh. Full reference + scaling limits: [GOOGLE_INTEGRATIONS_GUIDE.md](GOOGLE_INTEGRATIONS_GUIDE.md).

## Auth & Security

Three-layer security: proxy routing → API route guards → database RLS.

**API route guards** (`lib/auth/server-auth.ts`):
- `requireInstructor()` / `requireDancer()` / `requireRole('admin')` — call at top of every API route (there is no `requireAdmin()`)
- `getCurrentDancerStudent()` — gets dancer's student record (includes auth check)
- `requireRole(role)` — generic; admins always pass
- `getDefaultInstructorId()` — dancer flows resolve the instructor server-side; never accept `instructor_id` from the client

**Dancer API routes** must filter all queries by `student.id` from `getCurrentDancerStudent()`.

**Admin** bypasses most RLS restrictions (except private notes) and can access all portals via sidebar switcher.

## Key Patterns

### Note Visibility
Notes have `visibility`: `private`, `shared_with_student`, `shared_with_guardian`, `shared_with_instructor`. Dancer queries filter by `.in('visibility', ['shared_with_student', 'shared_with_guardian', 'shared_with_instructor'])` (instructor-visibility is included so dancers can read their own instructor-directed notes).

### Students Without Profiles
Students can exist without linked user profiles — instructors can manage non-portal students directly. When `role='dancer'` signs up, a `students` record is auto-created with `profile_id`.

### Pricing Models
Four models in `lib/utils/pricing.ts`: `per_person`, `per_class`, `per_hour`, `tiered`. Use `calculateClassCost()` and `validatePricingData()`.

Money columns are `DECIMAL(10,2)` — do arithmetic in integer cents via `dollarsToCents()` / `centsToDollars()` (`lib/utils/money.ts`).

### Waiver Template Variables
`{{issue_date}}`, `{{issuer_name}}`, `{{recipient_name}}`, `{{signature_date}}` — replaced at issuance time.

## New Feature Checklist

1. Add API route guard (`requireInstructor()`, `requireDancer()`, or `requireRole('admin')`)
2. Filter queries by appropriate scope (student_id for dancers)
3. Add RLS policy in migration if new table
4. Update `proxy.ts` if new portal routes
5. Sanitize any user HTML with `createSanitizedHtml()`
6. Consider admin access — admins should generally see the data

## Testing

Vitest with jsdom environment. `@` path alias resolves to project root. Setup file at `tests/setup.ts`. Tests co-located with source in `__tests__/` folders or alongside files as `*.test.ts`.

Mocks: `tests/__mocks__/supabase.ts` (`createMockSupabaseClient`, role profile fixtures); `tests/utils.tsx` re-exports a wrapped `render`. Vitest skips `.claude/**`, so worktrees aren't tested twice.

## Database Migrations

Numbered SQL files in `migrations/` (05–45; next is 46). Numbers have collided before (08, 13, 14, 15, 38) — `ls migrations` first. Applied manually via Supabase SQL editor — no automated migration runner. `supabase-schema.sql` lags recent migrations (no `shared_with_instructor`, `public_profiles`), so treat `migrations/` as the source of truth.

## Deployment Gotcha

Replit deployment cache: code changes may not reflect in production. Delete the deployment and create a fresh one (don't just republish).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
