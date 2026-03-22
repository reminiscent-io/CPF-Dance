# CLAUDE.md

## Project Overview

Dance teaching schedule management platform. Roles: Instructor, Dancer, Guardian, Admin — each with their own portal.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Auth), Tailwind CSS v4

## Commands

```bash
npm run dev          # Dev server on port 5000 (not 3000)
npm run build        # Production build
npm start            # Production server on port 5000
npm run lint         # Linting
npm run test:run     # Run tests once
npm test             # Tests in watch mode
npm run test:coverage
```

Port 5000 maps to external port 80 on Replit. Dev server binds to `0.0.0.0`.

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
Notes have `visibility`: `private`, `shared_with_student`, `shared_with_guardian`, `shared_with_studio`. Dancer queries filter by `.in('visibility', ['shared_with_student', 'shared_with_guardian'])`.

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

## Deployment Gotcha

Replit deployment cache: code changes may not reflect in production. Delete the deployment and create a fresh one (don't just republish).
