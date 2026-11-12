# Next steps

Temporary. Follow-ups from the November 2026 cleanup (commits `12bf758` and `437fcc0`). Tick items off as they land, and delete this file when the list is empty.

Every database change goes in a new numbered migration (next is 53), runs in the Supabase SQL editor, and goes into `supabase-schema.sql` too. Then run `scripts/schema-check/` (see `migrations/README.md`).

## 1. Broken features

### 1.1 Waiver signing can't succeed

- [ ] Fix the upload path and make signatures private

`app/api/waivers/[id]/sign/route.ts` uploads `waiver-<id>-<timestamp>.png` to the root of the `waiver-signatures` bucket with the signed-in user's client. The only upload policy a dancer matches ("Users can upload waiver signatures") requires the first folder to be `waiver-<auth.uid()>`, so storage refuses every upload and the route returns 500. Production has 0 signature files and 0 signed waivers.

The bucket is also public, with an "Anyone can view waiver signatures" policy, so a signature would be readable by anyone holding its URL, minors' included. Nothing is stored yet, so both fixes ship together with no data to migrate:

1. Upload to `` `waiver-${user.id}/${id}-${Date.now()}.png` ``.
2. Store that path in `signature_image_url` instead of the `getPublicUrl()` result. Have the instructor waiver page (`app/(portal)/instructor/waivers/[id]/page.tsx`) show it through a short-lived signed URL created server-side after the access check.
3. Migration:
   ```sql
   UPDATE storage.buckets SET public = false WHERE id = 'waiver-signatures';
   DROP POLICY IF EXISTS "Anyone can view waiver signatures" ON storage.objects;
   ```
   Creating the signed URL with the service-role client means no new SELECT policy is needed.
4. Check: sign a test waiver as a dancer, then open it as Courtney.

### 1.2 The dancer dashboard never shows a dancer's own notes

- [ ] Read personal notes from `notes`

`app/api/dancer/stats/route.ts` reads personal notes from `dancer_notes`, a table production doesn't have. The query errors, the error is ignored, and Recent Notes only ever lists Courtney's notes. Personal notes live in `notes` with `author_id` set to the dancer's profile id (see `app/api/dancer/notes/route.ts`).

1. Query `notes` where `author_id = profile.id`. Select `visibility` and `updated_at` in both note queries.
2. Add `visibility` and `updated_at` to `RecentNote` in `app/(portal)/dancer/page.tsx` and drop the two `as any` casts on `NoteFeedItem` and `NoteViewContent`. The "Private" / "Shared with Courtney" label then shows on the dashboard too.

### 1.3 The payments "Remind" button sends nothing

- [ ] Wire it to Gmail, or remove it

`app/api/instructor/send-payment-reminder/route.ts` reads `class_earnings`, which doesn't exist, so it always answers "No unpaid payments" and the page shows "Reminder sent". With data it would only `console.log` each student's email. It also skips `requireInstructor()`.

- Wire it up: guard with `requireInstructor()`, work out each enrolled student's balance from the enrollment and payment data `app/api/instructor/class-earnings/route.ts` already uses, send through `lib/gmail` (`courtney@cpfdance.com`), and report how many went out.
- Or remove it: delete the route, then `remindingClassId`, `remindMessage`, `handleRemindClick` and the Remind button in `app/(portal)/instructor/payments/page.tsx` (lines 189-190, 428-446, the message at 680, and the outstanding-classes list from 716).

## 2. Security (production)

### 2.1 Over-broad storage upload policy

- [ ] Drop "Instructors can upload assets 1bqp9qb_0"

It has no `bucket_id` check, so an instructor can write into any bucket (headshots, waiver-signatures, promo-private) under a folder named for their own user id. Every bucket the app uploads to has its own policy, and inside `assets` "Allow instructors to upload assets" has the identical condition, so dropping it removes nothing the app uses. Promo publishing uses the service-role client.

```sql
DROP POLICY IF EXISTS "Instructors can upload assets 1bqp9qb_0" ON storage.objects;
```

Check: upload an asset as Courtney.

Waiver-signature privacy is covered in 1.1.

## 3. Code

### 3.1 jsdom runs in production but is a dev dependency

- [ ] Move `jsdom` from `devDependencies` to `dependencies`

`lib/utils/sanitize.ts` requires `jsdom` on the server, and the instructor notes route and the studio-inquiry email route call it. A deploy that skips dev dependencies would break saving notes and sending inquiry emails.

### 3.2 Generate Supabase types

- [ ] Type the Supabase clients and delete the last 18 `as any` casts

Without generated types, postgrest types a joined relation such as `class:classes(title)` as an array, while a many-to-one join returns one object, so the API routes cast to `any`: `app/api/dashboard/route.ts` (10), `app/api/instructor/payments/route.ts` (4), `app/api/instructor/class-earnings/route.ts` (2), `app/api/dancer/classes/route.ts` (1), `app/api/classes/[id]/cancel/route.ts` (1). Typed clients would also have caught `dancer_notes` and `class_earnings` at compile time.

1. `npx supabase gen types typescript --project-id nuuuzezbglgtsuorhinw > lib/supabase/database.types.ts` (needs `supabase login`).
2. Pass `Database` to `createServerClient`, `createBrowserClient` and the admin `createClient`.
3. Fix what `tsc` reports, then delete the casts.
4. Add "regenerate the types" to the steps in `migrations/README.md`.

### 3.3 Split the classes page

- [ ] Break up `app/(portal)/instructor/classes/page.tsx` (2,836 lines)

`EditClassModal` (lines 891-2057) and `CreateClassModal` (2064-2825) make up most of it and repeat the same studio, pricing, asset and instructor fields. Move them to `components/instructor/` with one shared class form, and take `ClassAgendaRow` and `WorkshopPricingFields` along.

## 4. Database tidy (production)

These three fit in one migration.

- [ ] Take the 20 tables out of the realtime publication. Nothing in the app subscribes.
  ```sql
  ALTER PUBLICATION supabase_realtime DROP TABLE
    public.assets, public.classes, public.enrollments, public.instructor_access_requests,
    public.instructor_student_relationships, public.lesson_pack_purchases, public.lesson_pack_usage,
    public.lesson_packs, public.notes, public.payment_events, public.payments, public.personal_classes,
    public.private_lesson_requests, public.profiles, public.students, public.studio_inquiries,
    public.studios, public.waiver_signatures, public.waiver_templates, public.waivers;
  ```
- [ ] Drop the duplicate index. `idx_enrollments_class` and `idx_enrollments_class_id` are both `btree (class_id)`.
  ```sql
  DROP INDEX IF EXISTS public.idx_enrollments_class_id;
  ```
- [ ] Leave the `studio` and `studio_admin` values in `user_role` unless they cause trouble. Removing an enum value means swapping the column's type, and Postgres refuses that while policies and the `public_profiles` view reference `profiles.role`. That is probably why migration 16 failed.

## 5. Repo leftovers

- [ ] Delete `public/images/studio-logos/` and the two `public/images/CPF Dance Logo_*.png` files (about 1.4MB). Nothing references them; the landing page loads its images from the `Public_Images` storage bucket.
- [ ] Trim `replit.md` to what Replit's agent needs and point it at CLAUDE.md. Its January changelog is stale, and it describes `studio` / `studio_admin` roles and a `hasStudioPrivileges` helper that don't exist.
- [ ] Delete `docs/superpowers/plans/` (three finished plans). Keep `docs/superpowers/specs/`.
- [ ] Delete `docs/supabase-storage-setup.md`. It walks through creating the assets bucket and its policies by hand, which `supabase-schema.sql` now does.

## 6. Keep the schema file honest

- [ ] Optional: a CI job that runs `scripts/schema-check/run.sh` against a Postgres service container. It catches a schema file that no longer applies; catching drift from production still needs `fingerprint.sql` run in the SQL editor.
