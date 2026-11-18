# CLAUDE.md

## Project Overview

Dance teaching schedule management platform. Roles: Instructor, Dancer, Admin — each with their own portal. `guardian` is a valid signup role but has no portal and isn't handled by `proxy.ts` or `requireDancer()`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

**Key Integrations:** Stripe (payments/webhooks), TipTap (rich text editor), OpenAI (voice-to-notes, note formatting), Google Places API, Gmail + Calendar/Meet (direct Google OAuth), Recharts (dashboard charts)

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
components/           # Shared UI; ui/ = design-system kit (barrel `@/components/ui`); admin/ dancer/ instructor/ notes/ promo/ = portal-specific
lib/
  auth/               # server-auth.ts — role guards
  supabase/           # client.ts, server.ts, middleware.ts, admin.ts (service role), database.types.ts (generated)
  utils/              # pricing, money (integer cents), sanitize, date helpers, calendar export
  gmail/              # Gmail send/read/search
  google/             # api.ts (googleFetch: OAuth token + googleapis.com), Calendar/Meet
  lesson-credits.ts   # Lesson-pack credit spend/refund
  promo/              # Promo Studio: document model, layout engine, templates, AI, upload/export (docs/promo-studio-setup.md)
proxy.ts              # Middleware — routing, auth session refresh
migrations/           # Numbered SQL migrations (05–56)
tests/                # Vitest setup, test utils, Supabase mocks
```

## Commands

```bash
npm run dev          # Dev server on port 3434 (not 3000)
npm run build        # Production build
npm start            # Local production server on port 5000 (Vercel doesn't use it)
npm run lint         # Linting
npx tsc --noEmit     # Typecheck — `next build` does NOT (ignoreBuildErrors). Fresh checkout: run `node scripts/generate-version.mjs` first (lib/version.ts is generated)
npm run test:run     # Run tests once
npm test             # Tests in watch mode
npm run test:coverage
npm run test:ui       # Vitest UI
npm run test:watch    # Watch mode (alias for npm test)
```

Dev server runs on port 3434 and binds to `0.0.0.0`. Keep `dev` on 3434: 5000 is taken by macOS AirPlay locally.

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
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | Gmail, Calendar/Meet | OAuth client + Courtney's refresh token (`lib/google/api.ts`) |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | Analytics | PostHog project token (public). Unset = PostHog off |
| `NEXT_PUBLIC_POSTHOG_HOST` | Analytics | `https://us.i.posthog.com`, for server-side AI tracking and logs. The browser uses `/ingest` |

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
Both go through `googleFetch()` in `lib/google/api.ts`, which trades `GOOGLE_REFRESH_TOKEN` for an access token and calls `https://www.googleapis.com` + path, single account `courtney@cpfdance.com`. Paths MUST include the full version segment: **`/calendar/v3/...`** and **`/gmail/v1/...`**. Omitting it = 404. Don't fetch tokens anywhere else; `googleFetch()` caches and refreshes them. A user refresh token is required: a service account can't create Meet links. Full reference + scaling limits: [docs/google-integrations.md](docs/google-integrations.md).

## Auth & Security

Three-layer security: proxy routing → API route guards → database RLS.

**API route guards** (`lib/auth/server-auth.ts`):
- `requireInstructor()` / `requireDancer()` / `requireRole('admin')` — call at top of every API route (there is no `requireAdmin()`)
- `getCurrentDancerStudent()` — gets dancer's student record (includes auth check)
- `requireRole(role)` — generic; admins always pass
- `getDefaultInstructorId()` — dancer flows resolve the instructor server-side; never accept `instructor_id` from the client

**Dancer API routes** must filter all queries by `student.id` from `getCurrentDancerStudent()`.

**Return path:** the proxy sends signed-out visitors to `/login?next=<path>`, and login/signup land them back there. Validate any `next` with `getSafeNextPath()` / `getPostAuthPath()` (`lib/auth/portal-routing.ts`); never redirect to a raw query value.

**Shared class links:** `/classes/[slug]` is a public preview of a class marked `is_public` (service-role read, no auth). The slug (`precision-workshop-oct-18-2026`) is minted once by `POST /api/classes/[id]/share-link` and stored in `classes.share_slug` (migration 51); it never changes, a workshop's sits on its first day, and same-title same-day classes get `-2`, `-3` (`lib/class-share-slug.ts`). Old `/classes/<uuid>` links redirect to the slug. The page's buttons go through login/signup to `/dancer/classes?class=<id>` (old `/dancer/available-classes` links redirect there in `next.config.ts`), which scrolls to that class and opens enrollment. Instructors copy the link from the class edit dialog.

**Admin** bypasses most RLS restrictions (except private notes) and can access all portals via sidebar switcher.

## Key Patterns

### Note Visibility
Notes have `visibility`: `private`, `shared_with_student`, `shared_with_guardian`, `shared_with_instructor`. Dancer queries filter by `.in('visibility', ['shared_with_student', 'shared_with_guardian', 'shared_with_instructor'])` (instructor-visibility is included so dancers can read their own instructor-directed notes).

### Students Without Profiles
Students can exist without linked user profiles — instructors can manage non-portal students directly. When `role='dancer'` signs up, a `students` record is auto-created with `profile_id`.

### Pricing Models
Four models in `lib/utils/pricing.ts`: `per_person`, `per_class`, `per_hour`, `tiered`. Use `calculateClassCost()` and `validatePricingData()`.

Money columns are `DECIMAL(10,2)` — do arithmetic in integer cents via `dollarsToCents()` / `centsToDollars()` (`lib/utils/money.ts`).

### External Class Sign-Ups
"Sign up" on a class with `external_signup_url` (or `workshop_signup_url` for a full workshop) opens that link via `useExternalSignup` (`components/dancer/`). Stripe Payment Links (`buy.stripe.com`, `book.stripe.com`) get a `client_reference_id` from `lib/signup-link.ts`; the Stripe webhook enrolls the dancer once the paid link matches the class. Otherwise the dancer confirms by hand when they return to the tab. Every paid sale on a class link lands in `class_purchases` (migration 52, `lib/class-purchases.ts`): a sale with no ref enrolls the buyer when their email names one dancer, and anything else shows the instructor as "paid, not linked" in the class edit dialog, where she links it to a student. Both paths go through `enrollStudent()` in `lib/class-enrollment.ts`.

### Class Feedback
Dancers rate a class (1–5 stars) and answer five optional prompts (`lib/class-feedback.ts`, table `class_feedback`, migrations 54–55). An opt-out checkbox, ticked by default, sets `show_name`: whether her name may go with the feedback in website testimonials (false = anonymous; responses from before migration 55 are false). Two ways in, one form (`components/feedback/FeedbackForm.tsx`): `/feedback/<token>` needs no sign-in and adds a response per send under a typed name; `/dancer/feedback/<classId>` (schedule modal button, dashboard "How was it?") keeps one response per dancer and edits it on resend. The token is random, minted once by `POST /api/classes/[id]/feedback-link` into `classes.feedback_token`; the instructor copies or shares it, and reads responses, in the class edit dialog. A workshop is reviewed as one run, keyed by its first day like `share_slug`. Writes go through the API with the service role; RLS only grants reads (instructors all, a dancer her own).

### Loading Feedback
On a bad connection every tap has to visibly do something. `instrumentation-client.ts` feeds `lib/loading-activity.ts` from Next's `onRouterTransitionStart` (every `<Link>`, `router.push`, back/forward) and a `window.fetch` wrapper (same-origin `/api/*` only). `components/LoadingIndicator.tsx` in the root layout turns that into the top bar, "Still loading…" after 8s, and an offline notice; the sidebar and bottom navs highlight the tapped item at once. New pages and routes need no wiring. A button that starts a request takes `loading={flag}` (spinner, disabled, stays full strength). Spinners are SVG on purpose: the unlayered `* { border-color }` in `globals.css` beats Tailwind's border utilities, so a border-ring spinner renders as a static beige circle.

### File Uploads
Files never go through an API route body: Vercel rejects anything over 4.5MB before the route runs. The browser sends the file straight to Supabase Storage with a signed upload token, and the route only sees its path (`lib/storage/direct-upload.ts` explains the flow). Three steps: an `upload-url` route authorizes the caller, picks the path and returns `createUploadTarget()`; the client calls `uploadFile()` (`lib/storage/upload-file.ts`); the finishing route takes `{ path }`, refuses it unless `isPathUnder()` the prefix it would have issued, and reads size and type back from Storage (`info()` or `download()`) instead of trusting the browser. A signed token bypasses storage RLS, so the mint route is the authorization check. Used by assets (`/api/assets/upload-url`), voice notes (`/api/voice-to-notes/upload-url`, private `voice-notes` bucket from migration 56, recording deleted after transcription) and promo publishing (`/api/promo/designs/[id]/publish/upload-url`). Promo Studio's photo library uploads under RLS instead (`lib/promo/client/upload/queue.ts`).

### Analytics (PostHog)
`lib/analytics/posthog-client.ts` owns the browser SDK; import from it, not `posthog-js`, for anything beyond `posthog.capture()`. PostHog stays off until `CookieConsentBanner` grants consent, and `/ingest` is rewritten to PostHog in `next.config.ts` (excluded from `proxy.ts`). People are identified by Supabase user ID and role only: no names or emails, since many dancers are minors. Session replay never records instructor or admin sessions. Any element that renders notes, waivers or emails takes the `ph-no-capture` class, which blanks it in replay and keeps it out of click events; TipTap editors are blocked by `.ProseMirror`. Server-side OpenAI calls go through `createOpenAIClient()` (`lib/posthog-ai.ts`) with privacy mode on, so prompts and replies never leave the server. Don't call `posthog.reset()` directly: it wipes consent. Use `syncAnalyticsUser(null)`.

### Waiver Template Variables
`{{issue_date}}`, `{{issuer_name}}`, `{{recipient_name}}`, `{{signature_date}}` — replaced at issuance time.

## New Feature Checklist

1. Add API route guard (`requireInstructor()`, `requireDancer()`, or `requireRole('admin')`)
2. Filter queries by appropriate scope (student_id for dancers)
3. Add RLS policy in migration if new table
4. Update `proxy.ts` if new portal routes
5. Sanitize any user HTML with `createSanitizedHtml()`
6. Consider admin access — admins should generally see the data
7. Files go browser → Storage via a signed upload, never in a request body (see File Uploads)

## Testing

Vitest with jsdom environment. `@` path alias resolves to project root. Setup file at `tests/setup.ts`. Tests co-located with source in `__tests__/` folders or alongside files as `*.test.ts`.

Mocks: `tests/__mocks__/supabase.ts` (`createMockSupabaseClient`, role profile fixtures); `tests/utils.tsx` re-exports a wrapped `render`. Vitest skips `.claude/**`, so worktrees aren't tested twice.

## Database Migrations

Numbered SQL files in `migrations/` (05–56; next is 57). Numbers have collided before (08, 13, 14, 15, 38) — `ls migrations` first. Applied manually via Supabase SQL editor — no automated migration runner. `supabase-schema.sql` is the production schema after migration 53, verified object by object against the live database, plus migrations 54–56 written in by hand; read it for a table's current shape. `migrations/` can't rebuild the database (01–04 were deleted, and `personal_classes` plus several storage policies were made in the dashboard). Put each new migration's change in `supabase-schema.sql` too, and check the file with `scripts/schema-check/run.sh`. Then regenerate `lib/supabase/database.types.ts` (`migrations/README.md`): the Supabase clients are typed from it, so a query on a missing column fails `tsc`.

## Deployment

Vercel, built from GitHub: `main` deploys to production, every other branch gets a preview URL. Env vars live in the Vercel project settings; `NEXT_PUBLIC_*` values are baked in at build, so redeploy after changing one. The build skips type checks (`ignoreBuildErrors`), so CI is the only `tsc` gate. Vercel rejects request bodies over 4.5MB before route code runs, whatever cap the route sets, so files upload straight to Storage (see File Uploads). Routes that need longer than the default set `export const maxDuration`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
