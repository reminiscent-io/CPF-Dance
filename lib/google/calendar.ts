import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CreateMeetEventArgs {
  /** Used both as the event title and the conferenceData requestId. */
  classId: string;
  summary: string;
  description?: string | null;
  startIso: string;
  endIso: string;
  attendeeEmails: string[];
}

/**
 * Creates a Google Calendar event on the connected account's primary calendar
 * with an auto-generated Google Meet link. `sendUpdates: 'all'` makes Google
 * email each attendee a native calendar invite.
 */
export async function createMeetEvent(args: CreateMeetEventArgs): Promise<{ hangoutLink: string; eventId: string }> {
  const calendar = await getCalendarClient();

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
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
    },
  });

  return {
    hangoutLink: response.data.hangoutLink || '',
    eventId: response.data.id || '',
  };
}

export interface UpdateMeetEventArgs {
  eventId: string;
  startIso: string;
  endIso: string;
}

/** Patches the time of an existing calendar event (e.g. when a lesson is rescheduled). */
export async function updateMeetEventTime(args: UpdateMeetEventArgs): Promise<void> {
  const calendar = await getCalendarClient();

  await calendar.events.patch({
    calendarId: 'primary',
    eventId: args.eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: args.startIso },
      end: { dateTime: args.endIso },
    },
  });
}

/** Deletes a calendar event (e.g. when a virtual lesson is cancelled). */
export async function deleteMeetEvent(eventId: string): Promise<void> {
  const calendar = await getCalendarClient();

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  });
}
