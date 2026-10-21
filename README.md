# CPF Dance

A closed, invite-only platform that holds the coaching relationship between Courtney and her dancers. It isn't a studio-management SaaS or a marketplace. Courtney teaches a lesson, leaves a note (rich text or voice-transcribed), and the dancer reads it on her phone before the next one. Schedules, payments, waivers and lesson packs are there so that loop runs without friction.

Product context lives in [PRODUCT.md](./PRODUCT.md), the design system in [DESIGN.md](./DESIGN.md), and the engineering guide in [CLAUDE.md](./CLAUDE.md).

## Portals

**Instructor** (`/instructor`): dashboard, students and their notes, schedule and classes (attendance, choreography, recurring series, workshops), private-lesson requests, inquiries, payments and invoices, lesson packs, waivers, studios, assets, and Promo Studio for building promotional graphics.

**Dancer** (`/dancer`): dashboard, notes from Courtney plus a private journal, progress timeline, schedule and enrolled classes, available classes with enrollment (directly, or through a Stripe Payment Link or external sign-up link), lesson requests and lesson-pack purchases through Stripe Checkout, payments and lesson balance, waiver signing, profile.

**Admin** (`/admin`): users, instructor-access requests, studio inquiries, and Promo Studio brand kits, templates and AI usage. Admins can switch into any portal from the sidebar and bypass most RLS, but never see private notes.

**Public**: the landing page, legal pages, and `/classes/[slug]`, a shareable preview of a class marked public. Its buttons route through login or signup into enrollment.

`guardian` is a valid signup role for dancers under 18 (waivers, consent), but it has no portal of its own.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Data and auth | Supabase (PostgreSQL, Auth, Storage, row-level security) |
| Styling | Tailwind CSS v4 with a remapped spacing scale, Cormorant Garamond and Manrope |
| Payments | Stripe Checkout, Payment Links and webhooks |
| Rich text | TipTap, sanitized with DOMPurify |
| AI | OpenAI for voice-to-notes transcription, note formatting and Promo Studio copy |
| Google | Places (studio search); Gmail and Calendar/Meet through Replit connectors |
| Tests | Vitest with jsdom |

## Getting started

Requires Node 24 (the version CI uses) and a Supabase project.

```bash
git clone https://github.com/reminiscent-io/CPF-Dance.git
cd CPF-Dance
npm install
cp .env.example .env.local
npm run dev
```

The dev server runs on **http://localhost:3434**. Port 5000 is reserved for `npm start` in production on Replit, and macOS AirPlay holds it locally.

### Environment variables

| Variable | Needed for |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe webhook, public class pages, class routes |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments |
| `NEXT_PUBLIC_BASE_URL` | Stripe redirect base (falls back to the request origin) |
| `OPENAI_API_KEY` | Voice-to-notes and AI note formatting |
| `GOOGLE_PLACES_API_KEY` | Studio address search |
| `PROMO_*`, `NEXT_PUBLIC_PROMO_*` | Promo Studio tuning; see [docs/promo-studio-setup.md](./docs/promo-studio-setup.md) |

Gmail and Google Calendar need no keys locally. They go through Replit connectors (see [docs/google-integrations.md](./docs/google-integrations.md)).

### Database

There is no migration runner. Changes are applied by hand in the Supabase SQL editor.

1. Run `supabase-schema.sql` for the base schema.
2. Run every file in `migrations/` in numerical order. This folder is the source of truth; `supabase-schema.sql` lags the recent migrations.

Before adding a migration, run `ls migrations`. Numbers have collided before. More detail in [docs/database-setup.md](./docs/database-setup.md) and [migrations/README.md](./migrations/README.md).

## Commands

```bash
npm run dev            # Dev server on :3434
npm run build          # Production build (does not typecheck)
npm start              # Production server on :5000
npm run lint           # ESLint
npx tsc --noEmit       # Typecheck; on a fresh checkout run `node scripts/generate-version.mjs` first
npm run test:run       # Vitest, once
npm test               # Vitest, watch mode
```

CI (`.github/workflows/lint.yml`) runs `eslint . --max-warnings=0`, `tsc --noEmit`, the tests and the build. Any lint warning fails the PR.

## Project layout

```
app/
  (portal)/           Instructor, dancer and admin portals, plus login and signup
  api/                API routes, one folder per resource
  classes/[slug]/     Public class preview
  auth/               Supabase auth callback
components/
  ui/                 Design-system kit (import from @/components/ui)
  admin/ dancer/ instructor/ notes/ promo/
lib/
  auth/               Role guards (requireInstructor, requireDancer, requireRole)
  supabase/           Browser, server, middleware and service-role clients
  utils/              Pricing, money in integer cents, sanitizing, dates, calendar export
  promo/              Promo Studio document model, layout engine, templates, AI
  gmail/ google/      Replit connector integrations
migrations/           Numbered SQL migrations
proxy.ts              Next.js 16 middleware: routing and session refresh
tests/                Vitest setup and Supabase mocks
```

## Security model

Every request passes three layers: `proxy.ts` routes by role, each API route calls a guard from `lib/auth/server-auth.ts`, and Postgres RLS policies enforce access on every table. Dancer routes scope every query to the caller's own student record. User HTML is always rendered through `createSanitizedHtml()`. See [docs/security-audit-2026-03-13.md](./docs/security-audit-2026-03-13.md).

## Documentation

- [CLAUDE.md](./CLAUDE.md): architecture, critical rules, conventions
- [PRODUCT.md](./PRODUCT.md) and [DESIGN.md](./DESIGN.md): product strategy and the *Ballet Noir Program* design system
- [docs/database-setup.md](./docs/database-setup.md): Supabase setup
- [docs/class-pricing.md](./docs/class-pricing.md): the four pricing models
- [docs/google-integrations.md](./docs/google-integrations.md): Gmail and Calendar through Replit connectors
- [docs/promo-studio-setup.md](./docs/promo-studio-setup.md): Promo Studio migrations and first run
- [docs/supabase-storage-setup.md](./docs/supabase-storage-setup.md): storage buckets
- [docs/profile-linking.md](./docs/profile-linking.md): signing in with two emails through linked profiles
- [docs/performance-optimization-notes.md](./docs/performance-optimization-notes.md): RLS performance

## Deployment

Production runs on Replit. Its deployment cache can keep serving old code. If a change doesn't show up, delete the deployment and create a fresh one; republishing isn't enough.

## License

Proprietary. All rights reserved.
