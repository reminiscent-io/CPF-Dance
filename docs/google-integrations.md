# Google Integrations Guide (Gmail + Calendar/Meet)

How this app talks to Google for **sending and reading email** (Gmail) and **creating calendar events with Google Meet links** (Calendar). Read this before touching `lib/google/api.ts`, `lib/gmail/client.ts` or `lib/google/calendar.ts`.

## TL;DR

- Both integrations call Google directly through **`googleFetch()`** in `lib/google/api.ts`. It trades a stored refresh token for an access token, caches that until a minute before expiry (concurrent callers share one refresh), retries once on a `401`, and calls `https://www.googleapis.com` + your path.
- Everything acts as **one Google account: `courtney@cpfdance.com`**.
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. Set them in the Vercel project (Production) and in `.env.local` only if you mean to send real email and invites from your machine.
- **Golden rule:** pass the full versioned API path.
  - Calendar → `/calendar/v3/...`
  - Gmail → `/gmail/v1/...`
  - Without the version segment Google returns **404**. See [History](#history).

## Credentials setup (one time, signed in as courtney@cpfdance.com)

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Gmail API** and **Google Calendar API**.
2. OAuth consent screen: choose **Internal**. That needs cpfdance.com to be a Google Workspace domain, and it skips Google's app verification. An **External** app left in testing mode has its refresh tokens expire after 7 days, and publishing one with `gmail.readonly` (a restricted scope) needs a paid security assessment.
3. Credentials → Create OAuth client ID → **Web application**. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
4. In the [OAuth Playground](https://developers.google.com/oauthplayground), open the gear, tick "Use your own OAuth credentials", and paste the client ID and secret. Authorize the three scopes below as Courtney, then "Exchange authorization code for tokens".
5. Copy the refresh token. Put the client ID, client secret and refresh token in Vercel → Settings → Environment Variables, then redeploy: Vercel applies env changes to new deployments only.

| Scope | Used by |
|-------|---------|
| `https://www.googleapis.com/auth/gmail.send` | `sendEmail` |
| `https://www.googleapis.com/auth/gmail.readonly` | `getThreadMessages`, `searchEmails` (studio inquiry inbox) |
| `https://www.googleapis.com/auth/calendar.events` | `createMeetEvent`, `updateMeetEventTime`, `deleteMeetEvent` |

**When the refresh token dies.** Google revokes it if Courtney removes the app at myaccount.google.com/permissions, changes her password (Gmail scopes are revoked on password change), or it sits unused for six months. Every Google call then throws `Google OAuth error: ...` (usually `invalid_grant`). Repeat steps 4 and 5; the client ID and secret stay the same.

## The correct pattern

```ts
import { googleFetch } from '@/lib/google/api';

const response = await googleFetch(
  '/calendar/v3/calendars/primary/events?...',         // FULL versioned path
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...}) }
);
const data = await response.json();
if (!response.ok) throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
```

Don't fetch tokens anywhere else. A new Google endpoint needs only a path, plus a scope in step 4 if it isn't covered above (which means minting a new refresh token).

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

Always sanitize header values (strip `\r\n`) — see `sanitizeHeaderValue()`.

## How to verify the credentials

Read-only. Run with the three `GOOGLE_*` vars exported in your shell:

```bash
ACCESS=$(curl -s https://oauth2.googleapis.com/token \
  -d client_id="$GOOGLE_CLIENT_ID" -d client_secret="$GOOGLE_CLIENT_SECRET" \
  -d refresh_token="$GOOGLE_REFRESH_TOKEN" -d grant_type=refresh_token \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
curl -s -H "Authorization: Bearer $ACCESS" https://www.googleapis.com/gmail/v1/users/me/profile
curl -s -H "Authorization: Bearer $ACCESS" "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1"
```

The Gmail call should return `"emailAddress": "courtney@cpfdance.com"` and the Calendar call an `items` list. If the first command prints `undefined`, run it without the `| node ...` part to see Google's error.

## History

- **June 2026:** creating a virtual private lesson failed. The `google-calendar` Replit connector had never been bound to the project, and once it was, the calendar paths lacked the `/calendar/v3` prefix, so every call 404'd. Gmail worked throughout because its paths already carried `/gmail/v1`. **Lesson:** copy paths from Google's REST reference *including the version segment*.
- **November 2026:** the app moved from Replit to Vercel. Replit Connectors only authenticate on Replit's servers, so both integrations moved to `googleFetch()` with a refresh token of Courtney's own. Same paths, same single account.

## Scaling limitations & future considerations

The current design is correct for **Courtney as the sole instructor** (per PRODUCT.md). These are the constraints to revisit as the product grows:

1. **Single Google account.** All Meet events land on Courtney's primary calendar; all email sends from Courtney's Gmail. Adding multiple instructors means either they share Courtney's calendar/inbox or you build **per-user OAuth** (each instructor connects their own Google account and the app stores a refresh token per user).

2. **One refresh token, no alerting.** If it's revoked, every Gmail and Calendar call fails, and Meet creation swallows the error (item 6). Search Vercel logs for `Google OAuth error` when Meet links stop appearing.

3. **Meet links require user-context OAuth.** A Google **service account cannot create Meet conferences** without Workspace domain-wide delegation. Keep a **user refresh token**, not a service account, unless you set up delegation.

4. **Gmail send limits.** Consumer Gmail caps ~500 sends/day; Google Workspace ~2,000/day. As the dancer audience scales, transactional volume (lesson notifications, invites, reminders) can hit these caps. Beyond that — and for deliverability/spam safety — move transactional email to a dedicated provider (Resend / SendGrid / Postmark) with a verified sending domain. Sending high volumes from a personal Gmail also risks the account.

5. **Calendar/Meet API quotas.** Google Calendar API has per-project rate quotas (queries/min, queries/day). Generous, but a bulk operation (e.g. mass-rescheduling) could trip them. Batch and back off if you add such features.

6. **Best-effort, no retry/queue.** Meet creation in the class API routes is intentionally best-effort — a Calendar failure is logged and swallowed so it doesn't fail class creation (`app/api/classes/route.ts`, `app/api/classes/[id]/route.ts`, `.../cancel/route.ts`). At scale this means a transient outage silently leaves classes without Meet links. Consider a retry queue and/or an admin "regenerate Meet link" action.

7. **No conflict detection.** One shared calendar with no double-booking checks. Multi-instructor or room/resource scheduling would need real availability logic.

### Migration trigger points
- **Add a second instructor** → per-user OAuth (or accept shared account).
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

- `lib/google/api.ts` — `googleFetch` (token exchange, cache, retry)
- `lib/google/calendar.ts` — `createMeetEvent`, `updateMeetEventTime`, `deleteMeetEvent`
- `lib/gmail/client.ts` — `sendEmail`, `getThreadMessages`, `searchEmails`
- Calendar call sites: `app/api/classes/route.ts`, `app/api/classes/[id]/route.ts`, `app/api/classes/[id]/cancel/route.ts`
