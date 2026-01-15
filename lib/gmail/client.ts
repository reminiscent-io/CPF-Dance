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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}

export async function sendEmail(message: EmailMessage): Promise<{ threadId: string; messageId: string }> {
  const gmail = await getGmailClient();
  
  const headers = [
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    'Content-Type: text/html; charset=utf-8',
  ];
  
  if (message.inReplyTo) {
    headers.push(`In-Reply-To: ${message.inReplyTo}`);
  }
  if (message.references) {
    headers.push(`References: ${message.references}`);
  }
  
  const emailContent = [...headers, '', message.body].join('\r\n');
  const encodedMessage = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
      threadId: message.threadId,
    },
  });
  
  return {
    threadId: response.data.threadId || '',
    messageId: response.data.id || '',
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
  const gmail = await getGmailClient();
  
  const thread = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });
  
  const messages: ThreadMessage[] = [];
  
  for (const msg of thread.data.messages || []) {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    
    let body = '';
    if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
    } else if (msg.payload?.parts) {
      const textPart = msg.payload.parts.find((p) => p.mimeType === 'text/plain' || p.mimeType === 'text/html');
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
      }
    }
    
    const from = getHeader('From');
    const isFromMe = from.includes('cpfdance.com') || msg.labelIds?.includes('SENT') || false;
    
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

export async function searchEmails(query: string): Promise<Array<{ threadId: string; messageId: string; snippet: string; subject: string; from: string; date: string }>> {
  const gmail = await getGmailClient();
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  });
  
  const results: Array<{ threadId: string; messageId: string; snippet: string; subject: string; from: string; date: string }> = [];
  
  for (const msg of response.data.messages || []) {
    if (!msg.id) continue;
    
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });
    
    const headers = fullMessage.data.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
    
    results.push({
      threadId: fullMessage.data.threadId || '',
      messageId: msg.id,
      snippet: fullMessage.data.snippet || '',
      subject: getHeader('Subject'),
      from: getHeader('From'),
      date: getHeader('Date'),
    });
  }
  
  return results;
}
