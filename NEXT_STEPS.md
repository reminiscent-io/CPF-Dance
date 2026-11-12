# Next steps

Temporary. What is left from the November 2026 cleanup. Tick items off as they land, and delete this file when the list is empty.

Every database change goes in a new numbered migration (next is 54), runs in the Supabase SQL editor, and goes into `supabase-schema.sql` too. Then run `scripts/schema-check/` and regenerate `lib/supabase/database.types.ts` (see `migrations/README.md`).

## 1. Ship migration 53 with this branch

- [ ] Run `migrations/53-private-signatures-and-tidy.sql` in the Supabase SQL editor when this branch deploys

It makes the `waiver-signatures` bucket private, drops the "Anyone can view waiver signatures" and "Instructors can upload assets 1bqp9qb_0" storage policies, empties the realtime publication, and drops the duplicate `idx_enrollments_class_id` index. `supabase-schema.sql` already describes the result, so until the migration runs the file is one step ahead of production. Locally, the old schema plus migration 53 gives the same fingerprint as the new schema file.

Order doesn't matter for safety: the bucket has no files, and the new code never reads a public signature URL. `SUPABASE_SERVICE_ROLE_KEY` has to be set in production, or the instructor page shows a signed waiver with no signature image.

Then check by hand:

- [ ] Sign a test waiver as a dancer, then open it as Courtney and see the signature
- [ ] Upload an asset as Courtney
- [ ] Run `scripts/schema-check/fingerprint.sql` in the SQL editor and compare with `scripts/schema-check/run.sh`

## 2. Click through the classes page

- [ ] Create a class, a recurring class and a multi-day workshop; edit one; add days to a series; delete one

`app/(portal)/instructor/classes/page.tsx` went from 2,836 lines to 635. The modals, the agenda row and the shared form fields now live in `components/instructor/classes/`. Lint, `tsc`, the tests and the build pass, and every string, label and request URL from the old page is still there, but nobody has opened it in a browser. One timing change: the edit modal loads instructors and students in parallel with enrollments and series, where the old code ran them one after another.

## 3. Bugs the typed Supabase clients turned up

Fixed on this branch, worth a look in production: admin stats (revenue and lesson totals were always 0), the admin instructors page (always failed to load), editing or deleting a waiver template as a non-admin instructor (always 403), and recording a manual payment as a non-admin instructor (always "Student not found").

Still open, each a product call:

- [ ] Guardian linking at signup. `app/api/auth/signup/route.ts` tried to insert a `profiles` row for an under-13 dancer's guardian with no `id` and a null `full_name`; both are required, so it never worked. The dead insert is gone. A guardian is linked only when they already have an account.
- [ ] Payment requests to a studio. `payments.student_id` is `NOT NULL`, so `app/api/instructor/payment-requests/route.ts` could never store one. It now answers 400 with a clear message where it used to 500. It still creates the studio row first. Either make `student_id` nullable or take the studio option out of the form.
- [ ] `/instructor/classes/attendance` and `/instructor/classes/choreography`. Nothing links to them and their buttons do nothing. They queried `classes.name` and `classes.date`, which don't exist; they now load. Build them out or delete them.
- [ ] Payment reminders. The Remind button and its route are gone because they sent nothing and said "Reminder sent". A real version needs a per-student balance, and the earnings math is per class: only `per_person` pricing gives each dancer an amount, and Stripe-link sales land in `class_purchases`, not `payments`.

## 4. Left alone on purpose

The `studio` and `studio_admin` values stay in `user_role`. Removing an enum value means swapping the column's type, and Postgres refuses that while policies and the `public_profiles` view reference `profiles.role`.
