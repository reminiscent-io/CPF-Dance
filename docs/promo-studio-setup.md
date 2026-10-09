# Promo Studio: setup and first run

Promo Studio is built and on branch `claude/exciting-carson-33kkgm`. Nothing has touched the production database yet. Design and reasoning live in [the spec](superpowers/specs/2026-10-09-promo-studio-design.md).

## 1. Apply the migrations

In the Supabase SQL editor for the Dance project, run these files in order. All three are safe to re-run.

1. `migrations/48-lock-profile-role-and-link.sql`, first and now, whatever happens with Promo Studio. In production today, the only UPDATE rule on `profiles` lets a signed-in user update her own row with no column limits, and `authenticated` holds UPDATE on `role` and `linked_profile_id` (checked against the live database on October 9). Any dancer can make herself an admin, or point `linked_profile_id` at Courtney's profile and be treated as Courtney by every API route. This migration refuses those two changes from API users; the dashboard and SQL editor can still make them. No app screen writes either column, so nothing else changes.
2. `migrations/46-promo-studio-foundation.sql`: the owner and role helpers, `promo_assets`, the AI cost log, budgets, the monthly view, and the private `promo-private` bucket with its storage policies.
3. `migrations/47-promo-studio-designs.sql`: brand kits, templates and frozen versions, designs, revisions and publications.

`scripts/promo-studio-rls/run.sh` applies all three to a throwaway local Postgres and checks the policies as Courtney's linked login, another instructor, a dancer and anon.

Check afterwards that Storage lists a private `promo-private` bucket with a 50 MB limit and JPEG and PNG only. If the SQL editor couldn't create it, create it by hand with those settings; the policies in 46 apply to it by name.

The built-in Precision Workshop template (version 1) and the studio brand kit are inserted by the app the first time anyone opens Promo Studio, so their definitions stay in type-checked code.

## 2. Environment

Already set for other features and required here:

| Variable | Used for |
|---|---|
| `OPENAI_API_KEY` | Photo tagging, generation, revisions |
| `SUPABASE_SERVICE_ROLE_KEY` | AI cost log, first-use seeding, publishing to the public `assets` bucket |

Optional, with defaults:

| Variable | Default | Purpose |
|---|---|---|
| `PROMO_TEXT_MODEL` | `gpt-6-luna` | Model for tagging, copy and revisions |
| `PROMO_TEXT_FALLBACK_MODEL` | `gpt-4.1-mini` | Used automatically if the API rejects the main model |
| `PROMO_AI_DEFAULT_CAP_USD` | `10` | Monthly AI cap for anyone without a cap set on the AI usage page |
| `NEXT_PUBLIC_PROMO_POSE_WASM_URL` | jsDelivr, `@mediapipe/tasks-vision@1.1.0/wasm` | On-device pose detection runtime |
| `NEXT_PUBLIC_PROMO_POSE_MODEL_URL` | Google's `pose_landmarker_lite` model | Pose model file (about 5.5 MB, cached by the browser) |

Pose detection is optional. If either URL is blocked, uploads carry on and the vision call does the tagging.

Replit deploys can serve stale code (see CLAUDE.md): after merging, delete the deployment and create a fresh one.

## 3. Where things are

- Instructor: Promo Studio in the sidebar's Schedule group (`/instructor/promo`), "New Promo" in the phone plus menu, "New promo" on the dashboard. Photo library at `/instructor/promo/library`.
- Admin: the sidebar's Promo Studio group has Templates (`/admin/promo/templates`), Brand kit (`/admin/promo/brand`) and AI usage (`/admin/promo/usage`). Courtney's profile is `admin`, so she sees both.

## 4. Acceptance run

On Courtney's iPhone unless noted.

1. AC1, AC2: upload 10 photos from the camera roll on cellular. Lock the phone halfway; reopen the library and the queue resumes. Copy a photo's request URL from the laptop's network tab and open it in a private window: it fails without her session.
2. AC3: New promo, pick a three-day workshop's three class rows and four photos, then "Write three versions". Time it; at least two versions should appear within about 15 seconds.
3. AC4: in the editor, change the tagline, swap a strip photo into the hero, and fix a time in the dates. On the AI usage page, the call count doesn't move.
4. AC5: type in the tagline, then ask "make it more dramatic". The color switches to Noir and her tagline stays exactly as typed.
5. AC6: Export the post and the story; "Save to Photos" puts each in Photos at 1080 × 1350 and 1080 × 1920.
6. AC7 (laptop): Templates, Precision Workshop, Post tab. Drag the date circles, set the feature list's Default to 5 in Slots, Publish. Reopen a promo made before: it still exports the same, and offers "Update".
7. AC8: export the poster PDF and print it at 11 × 17 in.

## 5. Not built yet

- Phase 6, AI photo prep (extending backgrounds with the face-safe composite) and Phase 7 (site and print extras), as planned.
- Instructor-created templates, video, posting to Instagram, realtime collaboration: out of scope for v1.
- HEIC files picked in a browser that can't decode them get a clear error; Safari on iPhone converts them on pick.

## 6. Developer harnesses

`npm run dev`, then:

- `/dev/promo`: renders Template #1 in every format with stand-in photos, and exports.
- `/dev/promo/editor?format=ig_post|ig_story|poster`: the real editor against a fake API.
- `/dev/promo/new`: the brief page with a fake generation stream.
- `/dev/promo/admin?page=template|brand`: the template editor and brand kit.

These routes refuse to render outside `next dev`.
