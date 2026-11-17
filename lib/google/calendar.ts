// Google Calendar/Meet on Courtney's calendar, through googleFetch() (lib/google/api.ts).
// IMPORTANT: every path MUST keep the `/calendar/v3` version prefix or the
// call 404s. See docs/google-integrations.md.
import { googleFetch } from '@/lib/google/api';

export interface CreateMeetEventArgs {
  classId: string;
  summary: string;
  description?: string | null;
  startIso: string;
  endIso: string;
  attendeeEmails: string[];
}

export async function createMeetEvent(args: CreateMeetEventArgs): Promise<{ hangoutLink: string; eventId: string }> {
  const response = await googleFetch(
    '/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      body: JSON.stringify({
        summary: args.summary,
        description: args.description || undefined,
        start: { dateTime: args.startIso },
        end: { dateTime: args.endIso },
        attendees: args.attendeeEmails.filter(Boolean).map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: args.classId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
  }

  return {
    hangoutLink: data.hangoutLink || '',
    eventId: data.id || '',
  };
}

export interface UpdateMeetEventArgs {
  eventId: string;
  startIso: string;
  endIso: string;
}

export async function updateMeetEventTime(args: UpdateMeetEventArgs): Promise<void> {
  const response = await googleFetch(
    `/calendar/v3/calendars/primary/events/${args.eventId}?sendUpdates=all`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        start: { dateTime: args.startIso },
        end: { dateTime: args.endIso },
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
  }
}

export async function deleteMeetEvent(eventId: string): Promise<void> {
  const response = await googleFetch(
    `/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 404) {
    const data = await response.json();
    throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
  }
}
