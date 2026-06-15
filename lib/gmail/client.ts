import { ReplitConnectors } from '@replit/connectors-sdk';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]/g, '').trim();
}

export async function sendEmail(message: EmailMessage): Promise<{ threadId: string; messageId: string }> {
  const connectors = new ReplitConnectors();

  const headers = [
    `To: ${sanitizeHeaderValue(message.to)}`,
    `Subject: ${sanitizeHeaderValue(message.subject)}`,
    'Content-Type: text/html; charset=utf-8',
  ];

  if (message.inReplyTo) {
    headers.push(`In-Reply-To: ${sanitizeHeaderValue(message.inReplyTo)}`);
  }
  if (message.references) {
    headers.push(`References: ${sanitizeHeaderValue(message.references)}`);
  }

  const emailContent = [...headers, '', message.body].join('\r\n');
  const encodedMessage = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await connectors.proxy('google-mail', '/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify({
      raw: encodedMessage,
      threadId: message.threadId,
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Gmail API error: ${data?.error?.message || response.status}`);
  }

  return {
    threadId: data.threadId || '',
    messageId: data.id || '',
  };
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  isFromMe: boolean;
}

export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  const connectors = new ReplitConnectors();

  const response = await connectors.proxy(
    'google-mail',
    `/gmail/v1/users/me/threads/${threadId}?format=full`,
    { method: 'GET' }
  );

  const thread = await response.json() as any;

  if (!response.ok) {
    throw new Error(`Gmail API error: ${thread?.error?.message || response.status}`);
  }

  const messages: ThreadMessage[] = [];

  for (const msg of thread.messages || []) {
    const msgHeaders: Array<{ name: string; value: string }> = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      msgHeaders.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    let body = '';
    if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
    } else if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find(
        (p: any) => p.mimeType === 'text/plain' || p.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
      }
    }

    const from = getHeader('From');
    const isFromMe =
      from.toLowerCase().includes('cpfdance.com') ||
      msg.labelIds?.includes('SENT') ||
      false;

    messages.push({
      id: msg.id || '',
      from,
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      snippet: msg.snippet || '',
      body,
      isFromMe,
    });
  }

  return messages;
}

export async function searchEmails(
  query: string
): Promise<Array<{ threadId: string; messageId: string; snippet: string; subject: string; from: string; date: string }>> {
  const connectors = new ReplitConnectors();

  const listResponse = await connectors.proxy(
    'google-mail',
    `/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    { method: 'GET' }
  );

  const listData = await listResponse.json() as any;

  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listData?.error?.message || listResponse.status}`);
  }

  const results: Array<{ threadId: string; messageId: string; snippet: string; subject: string; from: string; date: string }> = [];

  for (const msg of listData.messages || []) {
    if (!msg.id) continue;

    const msgResponse = await connectors.proxy(
      'google-mail',
      `/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { method: 'GET' }
    );

    const msgData = await msgResponse.json() as any;
    if (!msgResponse.ok) continue;

    const msgHeaders: Array<{ name: string; value: string }> = msgData.payload?.headers || [];
    const getHeader = (name: string) =>
      msgHeaders.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    results.push({
      threadId: msgData.threadId || '',
      messageId: msg.id,
      snippet: msgData.snippet || '',
      subject: getHeader('Subject'),
      from: getHeader('From'),
      date: getHeader('Date'),
    });
  }

  return results;
}
