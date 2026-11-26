import crypto from 'node:crypto';

const DEFAULT_SHEET_ID = "1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0";
const DEFAULT_USERS_GID = "416797079";
const FALLBACK_USERS = [
  {
    usuario: "dan",
    senha: process.env.FALLBACK_ADMIN_HASH || "sha256:21f243ce675635d702409395876eee826f28b1795208ab88d0ac6822b106c244",
    nome: "Dan Castro",
    ativo: "SIM",
    perfil: "admin",
    sexo: "M"
  }
];

const FEMALE_SEXO_VALUES = new Set(["f", "fem", "feminino", "feminina", "female", "mulher"]);
const USERS_CACHE_TTL_MS = 60 * 1000;
let usersMemoryCache = { key: "", fetchedAt: 0, users: null };

export function clearUsersCache() {
  usersMemoryCache = { key: "", fetchedAt: 0, users: null };
}

export function normalizeSexo(raw) {
  if (typeof raw !== "string") return "M";
  const cleaned = raw.trim().toLowerCase();
  return FEMALE_SEXO_VALUES.has(cleaned) ? "F" : "M";
}

function parseSimpleCSV(csvText) {
  const text = String(csvText || '').replace(/^\uFEFF/, '');
  const matrix = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i += 1;
      currentRow.push(currentField);
      matrix.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      matrix.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    matrix.push(currentRow);
  }

  const nonEmpty = matrix.filter((row) => row.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = nonEmpty[i];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ? values[idx].trim() : '';
    });
    if (obj.usuario) rows.push(obj);
  }
  return rows;
}

function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (storedPassword.toLowerCase().startsWith('sha256:')) {
    const expectedHash = storedPassword.slice(7).trim().toLowerCase();
    const inputHash = crypto.createHash('sha256').update(inputPassword).digest('hex').toLowerCase();
    return inputHash === expectedHash;
  }
  return inputPassword === storedPassword;
}

function createSignedToken(user, secret) {
  const payload = Buffer.from(
    JSON.stringify({
      username: user.username,
      name: user.name,
      role: user.role,
      sexo: normalizeSexo(user.sexo),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${sig}`;
}

export function verifySignedToken(authHeader, secret = process.env.AUTH_SECRET || "irontracker-secret-key-2026") {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const raw = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!raw) return null;

  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0 || dotIdx === raw.length - 1) return null;

  const payloadB64 = raw.slice(0, dotIdx);
  const sigB64 = raw.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded !== 'object') return null;
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) return null;

    return {
      username: String(decoded.username || '').trim().toLowerCase(),
      name: String(decoded.name || decoded.username || '').trim(),
      role: String(decoded.role || 'user').trim().toLowerCase(),
      sexo: normalizeSexo(decoded.sexo),
      exp: decoded.exp
    };
  } catch {
    return null;
  }
}

export async function authenticateUser(username, password) {
  const cleanUser = String(username || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { status: 400, body: { ok: false, error: "Informe usuário e senha." } };
  }

  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const usersGid = process.env.USERS_SHEET_GID || DEFAULT_USERS_GID;
  const secret = process.env.AUTH_SECRET || "irontracker-secret-key-2026";

  const cacheKey = `${sheetId}:${usersGid}`;
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${usersGid}`;
  let users = [];

  const isCacheValid =
    usersMemoryCache.users &&
    usersMemoryCache.key === cacheKey &&
    Date.now() - usersMemoryCache.fetchedAt < USERS_CACHE_TTL_MS;

  if (isCacheValid) {
    users = usersMemoryCache.users;
  } else {
    try {
      const response = await fetch(csvUrl, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const csvText = await response.text();
      users = parseSimpleCSV(csvText);
      if (users.length > 0) {
        usersMemoryCache = { key: cacheKey, fetchedAt: Date.now(), users };
      }
    } catch (err) {
      console.warn("Fallback local de usuários acionado:", err.message);
      users = usersMemoryCache.users || FALLBACK_USERS;
    }
  }

  const found = users.find(u => (u.usuario || '').trim().toLowerCase() === cleanUser);
  if (!found || !verifyPassword(cleanPass, (found.senha || '').trim())) {
    return { status: 401, body: { ok: false, error: "Usuário ou senha inválidos." } };
  }

  const statusVal = (found.ativo || 'SIM').trim().toUpperCase();
  const isActive = ["SIM", "S", "TRUE", "1", "ATIVO", "YES"].includes(statusVal);
  if (!isActive) {
    return { status: 403, body: { ok: false, error: "Seu acesso está desativado. Contate o administrador." } };
  }

  const userProfile = {
    username: found.usuario.trim().toLowerCase(),
    name: (found.nome || found.usuario).trim(),
    role: (found.perfil || 'user').trim().toLowerCase(),
    sexo: normalizeSexo(found.sexo)
  };

  const token = createSignedToken(userProfile, secret);
  return {
    status: 200,
    body: {
      ok: true,
      user: userProfile,
      token
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = await authenticateUser(body.username, body.password);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Erro na autenticação:", err);
    return res.status(500).json({ ok: false, error: "Erro interno ao validar acesso." });
  }
}
