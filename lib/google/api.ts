// Direct Google API access for Courtney's account (courtney@cpfdance.com).
// Gmail and Calendar both go through googleFetch(): it trades the stored
// refresh token for an access token, caches it until a minute before expiry,
// and calls https://www.googleapis.com + path. Paths MUST carry the full API
// version segment (/gmail/v1/..., /calendar/v3/...) or Google returns 404.
// Setup, scopes and how to mint the refresh token: docs/google-integrations.md.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://www.googleapis.com';
// Refresh a minute early so a token can't expire between check and use.
const EXPIRY_MARGIN_MS = 60_000;

let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<string> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Google integrations need GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN.`);
  }
  return value;
}

async function refreshAccessToken(): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== 'string') {
    // invalid_grant means the refresh token was revoked or expired: mint a new one.
    throw new Error(`Google OAuth error: ${data.error_description || data.error || response.status}`);
  }

  const lifetimeMs = (typeof data.expires_in === 'number' ? data.expires_in : 3600) * 1000;
  cached = { token: data.access_token, expiresAt: Date.now() + lifetimeMs - EXPIRY_MARGIN_MS };
  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  // Concurrent callers share one refresh instead of each hitting the token endpoint.
  if (!inFlight) {
    inFlight = refreshAccessToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

// The token can only reach these APIs, whatever a path holds.
const ALLOWED_API_PREFIXES = ['/gmail/v1/', '/calendar/v3/'];

/**
 * Builds the request URL. The host is a literal ending in "/", so no path can
 * move the request off googleapis.com, and the check runs on the normalized
 * pathname, so a `..` hidden in an ID can't walk out of Gmail or Calendar.
 */
function googleUrl(path: string): URL {
  if (!path.startsWith('/')) {
    throw new Error(`googleFetch path must start with "/" (got "${path}")`);
  }
  const url = new URL(`https://www.googleapis.com/${path.slice(1)}`);
  if (url.origin !== API_BASE || !ALLOWED_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new Error(`googleFetch only calls the Gmail and Calendar APIs (got "${url.pathname}")`);
  }
  return url;
}

/**
 * Returns `value` when it looks like a Gmail message/thread ID or a Calendar
 * event ID, and throws otherwise. Wrap every ID that goes into a path with it.
 */
export function googleId(value: string, what = 'ID'): string {
  if (!/^[A-Za-z0-9_-]{1,1024}$/.test(value)) {
    throw new Error(`Not a valid Google ${what}`);
  }
  return value;
}

export async function googleFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = googleUrl(path);

  const send = async () => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${await getAccessToken()}`);
    return fetch(url.href, { ...init, headers });
  };

  const response = await send();
  if (response.status !== 401) return response;

  // Google can revoke an access token before its stated expiry. Drop it and try once more.
  cached = null;
  return send();
}
