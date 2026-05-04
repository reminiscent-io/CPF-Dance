# Private Lesson Credits — End-to-End Design

**Date:** 2026-05-02
**Owner:** Kevin (with Courtney as the sole instructor)
**Branch:** `claude/ballet-noir-system-fixes`

## Problem

The instructor's "Create Class" button on a private lesson request currently asks for a pricing model and price. That contradicts the new dancer-side flow, where dancers must hold a paid lesson pack to send a request and credits are debited per lesson. The portal also has a vestigial "Approve" button that doesn't schedule anything, and there is no in-app cancel/reschedule flow for private lessons.

## Goals

1. Replace the manual pricing prompt with automatic credit consumption when the instructor schedules a private lesson from a request.
2. Let dancers submit a request even with a zero balance; surface the day-of price and a path to refill.
3. Add a private-lesson cancel flow with credit-refund rules (>24h auto-refund, <24h instructor discretion).
4. Add a lightweight dancer-initiated reschedule request that emails Courtney and surfaces on her dashboard.
5. Email `courtney@cpfdance.com` and update the instructor activity feed on every state change (new request, cancellation, reschedule request).

## Non-goals (v1)

- Self-service reschedule by the dancer (must still go through Courtney).
- Day-of payment reconciliation (Venmo/cash tracking inside the app).
- Multi-instructor credit routing (Courtney is the sole instructor today).
- Guardian-portal parity (deferred until guardian flows are revisited).

---

## Design

### 1. Schema changes

New migration `39-private-lesson-credits.sql`:

```sql
ALTER TABLE lesson_pack_usage
  ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  ADD COLUMN voided_at TIMESTAMPTZ,
  ADD COLUMN voided_reason TEXT;

CREATE INDEX idx_lesson_pack_usage_class_id
  ON lesson_pack_usage(class_id) WHERE class_id IS NOT NULL;

CREATE TABLE lesson_reschedule_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  proposed_dates TEXT[],
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'declined'
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

A "credit was used" is identified by `lesson_pack_usage` rows where `voided_at IS NULL`. Refunds set `voided_at` and `voided_reason`, and increment `remaining_lessons` on the source purchase.

### 2. Server helper: `lib/lesson-credits.ts`

```ts
spendCreditForClass({ studentId, classId, requestId }): Promise<SpendResult>
refundCreditForClass({ classId, reason }): Promise<RefundResult>
```

- `spend` picks the **earliest-purchased active pack** with `remaining_lessons > 0`, inserts a usage row, and decrements the pack. Returns `{ used: false }` if no balance — caller proceeds with day-of payment messaging.
- `refund` finds the non-voided usage row for the class, sets `voided_at`/`voided_reason`, and increments the pack.
- Race window between insert and decrement is accepted for v1 (single-instructor, low concurrency).

### 3. Day-of fallback price

Computed as `max(price / lesson_count)` across active `lesson_packs`. Exposed via:

- `GET /api/lesson-packs/day-of-price` — public, returns `{ price: number }`.

Used by the dancer composer copy and the instructor's Create Class confirm summary.

### 4. Dancer composer (`components/RequestComposer.tsx`)

- Drop the `hasBalance` send gate — submit is always enabled.
- Copy variants:
  - `balance > 0`: "1 credit will be used when Courtney confirms and schedules this lesson. (You have N credits left.)"
  - `balance === 0`: "You have no credits. [Add a pack →](/dancer/payments) — or pay **$X** the day of the lesson via Venmo or cash."
- Existing `[Add a pack]` CTA path (`onAddPack`) stays available.

### 5. Instructor request list (`app/(portal)/instructor/requests/page.tsx`)

- Remove the "Approve" button. Keep **Create Class** (primary) and **Decline**.
- `CreatePrivateLessonClassModal` changes:
  - Fetch dancer's current balance on open.
  - Replace pricing-model block with a banner:
    - balance > 0: "Will use 1 of N credits from {pack name} when you create the class."
    - balance === 0: "Dancer has no credits. They've been told to pay **$X** day-of via Venmo or cash."
  - On submit: `POST /api/classes` with `private_lesson_request_id` so the server can spend the credit atomically.

### 6. Class creation API change (`app/api/classes/route.ts`)

- Accept `private_lesson_request_id` in the body. After class insert + auto-enroll, call `spendCreditForClass` with the request id.
- Always set the request's `status='approved'` and `scheduled_class_id` in the same flow (the existing two-step "PUT requests / POST class" dance becomes one server-side action). This eliminates the client-side `updateStatusWithClass` round-trip.
- Email courtney@cpfdance.com via existing `sendEmail()` on submit (see §10).

### 7. Cancel flow (`POST /api/classes/[id]/cancel`)

Body: `{ reason?: string, reinstate_credit?: boolean }`.

Rules (server-side):
- Caller must be the enrolled dancer or an instructor/admin.
- Compute hours-to-start: `(start_time - now) / 3600000`.
- If hours > 24: always refund credit (ignore `reinstate_credit`).
- If hours <= 24:
  - Dancer-initiated: forfeit credit (do not refund), regardless of `reinstate_credit`.
  - Instructor-initiated: refund only when `reinstate_credit === true` (default `false`).
- Mark the class `is_cancelled = true`, set `cancellation_reason`.
- If a private-lesson request exists, set its status to `'cancelled'`.
- Email Courtney with who cancelled and credit outcome.

UI:
- Dancer schedule view (`app/(portal)/dancer/schedule/page.tsx`): "Cancel" button on each upcoming private lesson. <24h shows a confirmation explicitly noting that the credit will be forfeited.
- Instructor calendar/class detail: "Cancel Private Lesson" button (distinct from "Delete"). <24h dialog shows the reinstate-credit toggle.

### 8. Reschedule request (`POST /api/classes/[id]/reschedule-request`)

- Dancer-only endpoint; validates enrollment.
- Inserts a `lesson_reschedule_requests` row.
- Emails Courtney with proposed dates + reason.
- Surfaces on instructor dashboard.
- No automatic class change. Courtney edits the class manually; she can mark the request `resolved` or `declined` from the dashboard (a follow-up button will appear once a reschedule request exists for the class).

### 9. Class delete (`DELETE /api/classes/[id]`)

- If the class has a non-voided usage row, refund the credit (`reason='class_deleted'`) before deleting.

### 10. Notifications

Single helper `lib/notifications/private-lessons.ts` that wraps `sendEmail()` with consistent templates:

- `notifyRequestSubmitted({ request, dancer })`
- `notifyClassScheduled({ classRow, request, dancer, paymentMode })` (paymentMode = 'credit' | 'day_of')
- `notifyCancellation({ classRow, cancelledBy, creditOutcome })`
- `notifyRescheduleRequested({ classRow, dancer, proposedDates, reason })`

All emails go to `courtney@cpfdance.com`. Failures are logged but do not block the underlying API call (notification is best-effort; the source-of-truth lives in Supabase).

### 11. Instructor dashboard activity feed

Extend the existing recent-activity API to include:
- New private lesson requests in the last 30 days.
- Cancellations in the last 14 days.
- Pending reschedule requests (no time limit while pending).

Each entry links to either `/instructor/requests` or the class detail.

---

## Lifecycle examples

**Happy path with credits.** Dancer with 3 credits sends a request → Courtney clicks Create Class → class is created, 1 credit spent, balance = 2, dancer enrolled, request status = approved. Email sent.

**Happy path with no credits.** Dancer with 0 credits sends a request (composer says "$X day-of") → Courtney clicks Create Class → modal shows "Dancer has no credits, $X day-of" → class created with no usage row → Email sent noting day-of payment.

**Dancer cancels >24h.** Dancer hits Cancel on schedule view → class marked cancelled, usage row voided, balance restored to 3. Email sent.

**Dancer cancels <24h.** Dancer hits Cancel → confirmation says "credit will be forfeited" → confirms → class cancelled, usage row stays, balance still 2. Email sent.

**Instructor reinstates after dancer's <24h cancel.** Courtney opens the cancelled class → "Reinstate credit" action available because a non-voided usage row still exists *(actually: usage row was *not* voided on dancer cancel; instructor sees a "Restore credit" button on cancelled lessons that ran the dancer-forfeit path; clicking it voids the usage and refunds)*. Same email template, credit outcome = "restored after cancellation."

**Reschedule request.** Dancer hits Request Reschedule → form with dates + reason → row inserted, email sent, dashboard surfaces it. Courtney edits the class start_time; she clicks "mark resolved" on the request once handled.

---

## Testing

Vitest unit tests for:
- `spendCreditForClass` — picks earliest-purchased active pack; returns `used: false` on zero balance; atomic decrement on the right purchase.
- `refundCreditForClass` — voids the right usage, increments the right purchase, idempotent on already-voided rows.
- Cancel endpoint — >24h dancer, <24h dancer, >24h instructor, <24h instructor with/without reinstate flag.
- Day-of price endpoint returns `max(price/lesson_count)` across active packs.

Manual smoke pass:
- Submit request with 0 credits, with credits.
- Create class from each kind of request.
- Cancel >24h and <24h from both portals.
- Reschedule request flow end-to-end including dashboard surfacing.
- Email delivery (one happy-path send per event).

## Migration / rollout

- Single migration applied via Supabase SQL editor.
- Existing private lesson classes have no usage rows attached, so cancellation of legacy classes will follow the day-of-payment path naturally.
- No data backfill required.
