import { ReplitConnectors } from '@replit/connectors-sdk';

export interface CreateMeetEventArgs {
  classId: string;
  summary: string;
  description?: string | null;
  startIso: string;
  endIso: string;
  attendeeEmails: string[];
}

export async function createMeetEvent(args: CreateMeetEventArgs): Promise<{ hangoutLink: string; eventId: string }> {
  const connectors = new ReplitConnectors();

  const response = await connectors.proxy(
    'google-calendar',
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

  const data = await response.json() as any;

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
  const connectors = new ReplitConnectors();

  const response = await connectors.proxy(
    'google-calendar',
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
    const data = await response.json() as any;
    throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
  }
}

export async function deleteMeetEvent(eventId: string): Promise<void> {
  const connectors = new ReplitConnectors();

  const response = await connectors.proxy(
    'google-calendar',
    `/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 404) {
    const data = await response.json() as any;
    throw new Error(`Google Calendar API error: ${data?.error?.message || response.status}`);
  }
}
