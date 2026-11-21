import crypto from 'node:crypto';

const DEFAULT_SHEET_ID = "1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0";
const DEFAULT_USERS_GID = "416797079";
const FALLBACK_USERS = [
  {
    usuario: "dan",
    senha: process.env.FALLBACK_ADMIN_HASH || "sha256:21f243ce675635d702409395876eee826f28b1795208ab88d0ac6822b106c244",
    nome: "Dan Castro",
    ativo: "SIM",
    perfil: "admin"
  }
];

function parseSimpleCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = [];
    if (line.includes('"')) {
      let inQuote = false;
      let buf = '';
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          if (inQuote && line[j + 1] === '"') {
            buf += '"';
            j++;
          } else {
            inQuote = !inQuote;
          }
          continue;
        }
        if (ch === ',' && !inQuote) {
          values.push(buf);
          buf = '';
        } else {
          buf += ch;
        }
      }
      values.push(buf);
    } else {
      values.push(...line.split(','));
    }

    const obj = {};
    headers.forEach((h, idx) => {
      let val = values[idx] ? values[idx].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      obj[h] = val;
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
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');

  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url');

  return `${payload}.${sig}`;
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

  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${usersGid}`;
  let users = [];

  try {
    const response = await fetch(csvUrl, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    users = parseSimpleCSV(csvText);
  } catch (err) {
    console.warn("Fallback local de usuários acionado:", err.message);
    users = FALLBACK_USERS;
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
    role: (found.perfil || 'user').trim().toLowerCase()
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
