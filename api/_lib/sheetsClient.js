import crypto from 'node:crypto';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

function base64UrlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

export function isSheetsWriteConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  );
}

function normalizePrivateKey(rawKey) {
  return String(rawKey || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n');
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const clientEmail = String(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  if (!clientEmail || !privateKey) {
    throw new Error('Google Sheets service account credentials not configured.');
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: SHEETS_SCOPE,
      aud: OAUTH_TOKEN_URL,
      iat,
      exp
    })
  );

  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${signingInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(6000)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`OAuth2 token exchange failed (${resp.status}): ${errText.slice(0, 160)}`);
  }

  const json = await resp.json();
  if (!json?.access_token) {
    throw new Error('OAuth2 response missing access_token');
  }

  const ttlMs = Math.max(300, Math.min(3000, Number(json.expires_in || 3000) - 300)) * 1000;
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + ttlMs
  };
  return tokenCache.accessToken;
}

export async function getValues(spreadsheetId, range) {
  const token = await getAccessToken();
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Sheets getValues failed (${resp.status}): ${errText.slice(0, 160)}`);
  }
  const data = await resp.json();
  return Array.isArray(data?.values) ? data.values : [];
}

export async function updateValues(spreadsheetId, range, values) {
  const token = await getAccessToken();
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    signal: AbortSignal.timeout(6000)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Sheets updateValues failed (${resp.status}): ${errText.slice(0, 160)}`);
  }
  return resp.json();
}

export async function appendValues(spreadsheetId, range, values) {
  const token = await getAccessToken();
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    signal: AbortSignal.timeout(6000)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Sheets appendValues failed (${resp.status}): ${errText.slice(0, 160)}`);
  }
  return resp.json();
}

export async function clearValues(spreadsheetId, range) {
  const token = await getAccessToken();
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}',
    signal: AbortSignal.timeout(6000)
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Sheets clearValues failed (${resp.status}): ${errText.slice(0, 160)}`);
  }
  return resp.json();
}
