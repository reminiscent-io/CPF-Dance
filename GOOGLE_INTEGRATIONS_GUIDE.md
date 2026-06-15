# Google Integrations Guide (Gmail + Calendar/Meet)

How this app talks to Google for **sending email** (Gmail) and **creating calendar events with Google Meet links** (Calendar). Read this before touching `lib/gmail/client.ts` or `lib/google/calendar.ts`.

## TL;DR

- Both integrations run through **Replit Connectors** via the **`@replit/connectors-sdk`** package — not direct Google OAuth.
- Connector names: **`google-calendar`** and **`google-mail`**.
- Everything resolves to a **single connected Google account: `courtney@cpfdance.com`**.
- **Golden rule:** the proxy base is generic Google, so you MUST include the full versioned API path:
  - Calendar → `/calendar/v3/...`
  - Gmail → `/gmail/v1/...`
  - Omitting the version segment returns a silent **404**. This was the bug — see [What Happened](#what-happened).

## The correct pattern

Use the SDK proxy. It injects and refreshes the OAuth token automatically — never hand-fetch tokens.

```ts
import { ReplitConnectors } from '@replit/connectors-sdk';

const connectors = new ReplitConnectors();
const response = await connectors.proxy(
  'google-calendar',                                   // connector name
  '/calendar/v3/calendars/primary/events?...',         // FULL versioned path
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...}) }
);
const data = await response.json();
if (!response.ok) throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
```

### Calendar / Meet specifics (`lib/google/calendar.ts`)

| Operation | Path | Notes |
|-----------|------|-------|
| Create event + Meet | `POST /calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all` | `conferenceDataVersion=1` is **required** for a Meet link. Pass `conferenceData.createRequest` with `conferenceSolutionKey.type: 'hangoutsMeet'`. The Meet URL comes back as `data.hangoutLink`. |
| Reschedule | `PATCH /calendar/v3/calendars/primary/events/{eventId}?sendUpdates=all` | |
| Delete | `DELETE /calendar/v3/calendars/primary/events/{eventId}?sendUpdates=all` | Treat `404` as already-gone (not an error). |

- `sendUpdates=all` makes Google email each attendee a **native calendar invite**.
- `requestId` in `createRequest` provides idempotency for conference creation — reuse a stable id (the class id) so retries don't spawn duplicate conferences.

### Gmail specifics (`lib/gmail/client.ts`)

| Operation | Path |
|-----------|------|
| Send | `POST /gmail/v1/users/me/messages/send` (RFC-822 message, base64url-encoded in `raw`) |
| Read thread | `GET /gmail/v1/users/me/threads/{threadId}?format=full` |
| Search | `GET /gmail/v1/users/me/messages?q=...` then `GET /gmail/v1/users/me/messages/{id}` |

Gmail's standard paths already include `/gmail/v1`, which is why Gmail was unaffected by the calendar bug. Always sanitize header values (strip `\r\n`) — see `sanitizeHeaderValue()`.

## Auth contexts (dev vs deployment)

Connector auth uses different env vars depending on where the code runs. The connector must be authorized in **both** contexts:

| Context | Token env var |
|---------|---------------|
| Dev (Replit workspace) | `REPL_IDENTITY` |
| Deployment | `WEB_REPL_RENEWAL` |

A connection working in dev does **not** guarantee it works in the deployed app. After connecting a Google integration in Replit, verify in both. (Also relevant: the [deployment cache gotcha](CLAUDE.md) — delete and recreate the deployment, don't just republish.)

## How to verify a connection

Read-only checks — run from the Replit shell.

**SDK probe (proves the proxy + path prefix work):**
```bash
node -e "
const { ReplitConnectors } = require('@replit/connectors-sdk');
(async () => {
  const c = new ReplitConnectors();
  const cal = await c.proxy('google-calendar', '/calendar/v3/calendars/primary', { method: 'GET' });
  console.log('calendar:', cal.status, (await cal.json()).id);
  const gm = await c.proxy('google-mail', '/gmail/v1/users/me/profile', { method: 'GET' });
  console.log('gmail:', gm.status, (await gm.json()).emailAddress);
})();
"
```
Both should print `200` and `courtney@cpfdance.com`.

**Raw connector registration check (is the connector even bound?):**
```bash
curl -s "https://${REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names=google-calendar" \
  -H "X_REPLIT_TOKEN: repl ${REPL_IDENTITY}"
```
`{"items":[],"total":0}` means **not connected**. A non-empty `items` with a token means connected.

## What happened (June 2026 incident)

1. **Symptom:** Creating a virtual private lesson threw `TypeError: Cannot read properties of undefined (reading 'settings')` from the old hand-rolled token fetch in `calendar.ts` — a missing optional-chaining `?.` masked the real problem.
2. **Real cause #1:** The `google-calendar` connector wasn't bound to the project at all (`total: 0`). Gmail (`google-mail`) was bound, which is why email worked but calendar didn't.
3. **Fix:** Both integrations were migrated to `@replit/connectors-sdk` (`connectors.proxy()`), and both connectors were bound to the project.
4. **Real cause #2 (introduced by the migration):** The calendar paths were written without the `/calendar/v3` version prefix, so every call 404'd. Fixed by adding the prefix. Gmail was already correct because its paths include `/gmail/v1`.
5. **Verified end-to-end:** create event → `200` with a real `hangoutLink`; delete → `204`. Gmail profile → `200`.

**Lesson:** Don't revert to manual token fetching. When adding a new Google endpoint, copy the full path from Google's REST reference *including the version segment*.

## Scaling limitations & future considerations

The current design is correct for **Courtney as the sole instructor** (per PRODUCT.md). These are the constraints to revisit as the product grows:

1. **Single Google account.** All Meet events land on Courtney's primary calendar; all email sends from Courtney's Gmail. Adding multiple instructors means either they share Courtney's calendar/inbox or you build **per-user OAuth** (each instructor connects their own Google account). The connector model is one-account-per-connector.

2. **Replit lock-in.** Auth is tied to Replit infra (`REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`/`WEB_REPL_RENEWAL`). Migrating off Replit (e.g. to Vercel) **breaks both integrations** and requires implementing direct Google OAuth from scratch: GCP project, OAuth consent screen + verification (Calendar is a sensitive scope), and secure refresh-token storage. None of that scaffolding exists today.

3. **Meet links require user-context OAuth.** A Google **service account cannot create Meet conferences** without Workspace domain-wide delegation. So even a direct-OAuth migration must use a **user refresh token**, not a service account, to keep Meet links working.

4. **Gmail send limits.** Consumer Gmail caps ~500 sends/day; Google Workspace ~2,000/day. As the dancer audience scales, transactional volume (lesson notifications, invites, reminders) can hit these caps. Beyond that — and for deliverability/spam safety — move transactional email to a dedicated provider (Resend / SendGrid / Postmark) with a verified sending domain. Sending high volumes from a personal Gmail also risks the account.

5. **Calendar/Meet API quotas.** Google Calendar API has per-project rate quotas (queries/min, queries/day). Generous, but a bulk operation (e.g. mass-rescheduling) could trip them. Batch and back off if you add such features.

6. **Best-effort, no retry/queue.** Meet creation in the class API routes is intentionally best-effort — a Calendar failure is logged and swallowed so it doesn't fail class creation (`app/api/classes/route.ts`, `app/api/classes/[id]/route.ts`, `.../cancel/route.ts`). At scale this means a transient outage silently leaves classes without Meet links. Consider a retry queue and/or an admin "regenerate Meet link" action.

7. **No conflict detection.** One shared calendar with no double-booking checks. Multi-instructor or room/resource scheduling would need real availability logic.

### Migration trigger points
- **Add a second instructor** → per-user OAuth (or accept shared account).
- **Leave Replit** → direct Google OAuth with stored refresh token.
- **Email volume nears ~500/day** → dedicated transactional email provider.

## Edge cases

### Dancer has no email on file
A student added by the instructor who hasn't signed up has no profile and may have no email. When a virtual private lesson is created for such a dancer:

- The Meet event is still created (with **zero attendees**) and `google_meet_url` is saved on the class.
- **No** Google calendar invite is sent (no attendee) and **no** in-app email is sent (`notifyDancerVirtualLesson` is gated on `dancerEmail`).
- The dancer can't self-serve the link either: the dancer portal only shows it to students with an account.

Mitigations in place:
- **Instructor can copy the link.** The Edit-class modal (`app/(portal)/instructor/classes/page.tsx`, EditClassModal) shows the Meet link with a Copy button for virtual private lessons.
- **Instructor is warned.** The POST `/api/classes` and PATCH `/api/classes/[id]` responses include a `meet` summary `{ url, dancerHasEmail, dancerNotified }`. When `meet.url && !meet.dancerHasEmail`, the UI shows a warning toast telling the instructor to copy and share the link manually.

So the instructor must relay the link by hand for email-less dancers — by design, with UI support to make it easy.

## Key files

- `lib/google/calendar.ts` — `createMeetEvent`, `updateMeetEventTime`, `deleteMeetEvent`
- `lib/gmail/client.ts` — `sendEmail`, `getThreadMessages`, `searchEmails`
- Calendar call sites: `app/api/classes/route.ts`, `app/api/classes/[id]/route.ts`, `app/api/classes/[id]/cancel/route.ts`
