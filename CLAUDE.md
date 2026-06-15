# CLAUDE.md

## Project Overview

Dance teaching schedule management platform. Roles: Instructor, Dancer, Guardian, Admin — each with their own portal.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

**Key Integrations:** Stripe (payments/webhooks), TipTap (rich text editor), OpenAI (voice-to-notes, note formatting), Google Places API, Gmail (via Replit connectors), Recharts (dashboard charts)

## Design Context

Two files at the project root carry the design system. Read them before any UI work.

- **[PRODUCT.md](PRODUCT.md)** — strategic. Register, users (Courtney as sole instructor; dancers 15-25 as the volume audience), product purpose, brand personality (sophisticated, warm, precise), anti-references (no SaaS dashboard, no heavy promo site, no low-end studio cliché), design principles.
- **[DESIGN.md](DESIGN.md)** + **[DESIGN.json](DESIGN.json)** — visual. North Star is *The Ballet Noir Program*. Palette: Stage Rose accent, Curtain Gilt premium, four-tone Champagne paper, Charcoal ink. Typography: Cormorant Garamond display + Manrope body. Named rules (One Ribbon, No-White, No-Black, No Side-Stripe, Serif-For-Headings, Tight-Tracking, Flat-By-Default) are binding.

When picking colors, fonts, spacing, or component patterns, source from DESIGN.md. When making product or copy decisions, source from PRODUCT.md. Do not introduce off-system colors or fonts without naming a new role.

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
components/           # Shared UI components (flat, no nesting except ui/ and notes/)
lib/
  auth/               # server-auth.ts — role guards
  supabase/           # client.ts, server.ts, middleware.ts
  utils/              # pricing, sanitize, date helpers, calendar export
  gmail/              # Gmail via Replit connectors
proxy.ts              # Middleware — routing, auth session refresh
migrations/           # Numbered SQL migrations (01–34)
tests/                # Vitest setup and test utils
```

## Commands

```bash
npm run dev          # Dev server on port 5000 (not 3000)
npm run build        # Production build
npm start            # Production server on port 5000
npm run lint         # Linting
npm run test:run     # Run tests once
npm test             # Tests in watch mode
npm run test:coverage
npm run test:ui       # Vitest UI
npm run test:watch    # Watch mode (alias for npm test)
```

Port 5000 maps to external port 80 on Replit. Dev server binds to `0.0.0.0`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe webhook | Admin-level Supabase access (webhook route only) |
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

Using the wrong client causes auth failures in production.

### RLS vs API Filtering
Trust RLS policies for authorization. Don't add redundant `.eq('author_id', user.id)` filters in API routes when RLS already handles it — causes "0 rows" / PGRST116 errors.

### RLS Policy Recursion
RLS policies that check the `profiles` table can cause infinite recursion. Use security definer functions instead (see migrations 29-31).

### HTML Sanitization
All user HTML MUST be sanitized before rendering. Use `createSanitizedHtml()` from `@/lib/utils/sanitize` — never raw `dangerouslySetInnerHTML`.

### Google Integrations (Gmail + Calendar/Meet)
Both go through **Replit Connectors** via `@replit/connectors-sdk` (`connectors.proxy()`) — connector names `google-mail` and `google-calendar`, single account `courtney@cpfdance.com`. The proxy base is generic Google, so paths MUST include the full version segment: **`/calendar/v3/...`** and **`/gmail/v1/...`**. Omitting it = silent 404. Never hand-fetch OAuth tokens; the SDK handles refresh. Full reference + scaling limits: [GOOGLE_INTEGRATIONS_GUIDE.md](GOOGLE_INTEGRATIONS_GUIDE.md).

## Auth & Security

Three-layer security: proxy routing → API route guards → database RLS.

**API route guards** (`lib/auth/server-auth.ts`):
- `requireInstructor()` / `requireDancer()` / `requireAdmin()` — call at top of every API route
- `getCurrentDancerStudent()` — gets dancer's student record (includes auth check)
- `requireRole(role)` — generic, with admin override

**Dancer API routes** must filter all queries by `student.id` from `getCurrentDancerStudent()`.

**Admin** bypasses most RLS restrictions (except private notes) and can access all portals via sidebar switcher.

## Key Patterns

### Note Visibility
Notes have `visibility`: `private`, `shared_with_student`, `shared_with_guardian`, `shared_with_instructor`. Dancer queries filter by `.in('visibility', ['shared_with_student', 'shared_with_guardian', 'shared_with_instructor'])` (instructor-visibility is included so dancers can read their own instructor-directed notes).

### Students Without Profiles
Students can exist without linked user profiles — instructors can manage non-portal students directly. When `role='dancer'` signs up, a `students` record is auto-created with `profile_id`.

### Pricing Models
Four models in `lib/utils/pricing.ts`: `per_person`, `per_class`, `per_hour`, `tiered`. Use `calculateClassCost()` and `validatePricingData()`.

### Waiver Template Variables
`{{issue_date}}`, `{{issuer_name}}`, `{{recipient_name}}`, `{{signature_date}}` — replaced at issuance time.

## New Feature Checklist

1. Add API route guard (`requireInstructor()`, `requireDancer()`, or `requireAdmin()`)
2. Filter queries by appropriate scope (student_id for dancers)
3. Add RLS policy in migration if new table
4. Update `proxy.ts` if new portal routes
5. Sanitize any user HTML with `createSanitizedHtml()`
6. Consider admin access — admins should generally see the data

## Testing

Vitest with jsdom environment. `@` path alias resolves to project root. Setup file at `tests/setup.ts`. Tests co-located with source in `__tests__/` folders or alongside files as `*.test.ts`.

## Database Migrations

Numbered SQL files in `migrations/` (01–34). Applied manually via Supabase SQL editor — no automated migration runner. Schema reference: `supabase-schema.sql`.

## Deployment Gotcha

Replit deployment cache: code changes may not reflect in production. Delete the deployment and create a fresh one (don't just republish).
