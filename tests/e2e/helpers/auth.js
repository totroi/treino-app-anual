export const SHEET_ID = '1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0';
export const USERS_GID = '416797079';
export const TABLE_1_GID = '190965404';
export const SOURCE_REFS_GID = '201829341';

let cachedMalePass = null;

export function sheetCsvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

export async function getMaleCredentials() {
  const username = process.env.E2E_MALE_USER || 'convidado';
  if (process.env.E2E_MALE_PASS) {
    return { username, password: process.env.E2E_MALE_PASS };
  }
  if (!cachedMalePass) {
    const res = await fetch(sheetCsvUrl(USERS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`Failed to resolve guest credentials from sheet: HTTP ${res.status}`);
    }
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const userIdx = headers.indexOf('usuario');
    const passIdx = headers.indexOf('senha');
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      if ((cols[userIdx] || '').trim().toLowerCase() === username.toLowerCase()) {
        cachedMalePass = (cols[passIdx] || '').trim();
        break;
      }
    }
    if (!cachedMalePass) {
      throw new Error(`Guest user '${username}' not found in Usuarios sheet`);
    }
  }
  return { username, password: cachedMalePass };
}

export function getFemaleCredentials() {
  return {
    username: process.env.E2E_FEMALE_USER || 'convidada',
    password: process.env.E2E_FEMALE_PASS || 'treino2026',
  };
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const [payloadB64] = token.split('.');
  if (!payloadB64) return null;
  const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

export async function loginViaUI(page, { username, password, rememberMe = true }) {
  const userInput = page.getByLabel('Usuário');
  await userInput.waitFor({ state: 'visible', timeout: 15_000 });
  await userInput.fill(username);
  await page.getByLabel('Senha', { exact: true }).fill(password);

  const rememberCheckbox = page.getByLabel('Manter conectado neste aparelho');
  const isChecked = await rememberCheckbox.isChecked();
  if (isChecked !== rememberMe) {
    await rememberCheckbox.click();
  }

  await page.getByRole('button', { name: /Acessar Treinos/i }).click();
  await page.getByRole('button', { name: 'Abrir menu do perfil' }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
}

export async function logoutViaUI(page) {
  await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
  const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
  await drawer.waitFor({ state: 'visible', timeout: 10_000 });
  await drawer.getByRole('button', { name: 'Sair da Conta' }).click();
  await page.getByLabel('Usuário').waitFor({ state: 'visible', timeout: 10_000 });
}

export async function selectMonth(page, monthName) {
  await page.getByLabel('Selecionar mês da periodização').selectOption(monthName);
}

export async function selectWorkoutTab(page, tabLetter) {
  const tablist = page.getByRole('tablist', { name: 'Divisão de treino' });
  await tablist
    .getByRole('tab', { name: new RegExp(`Treino\\s+${tabLetter}\\b`, 'i') })
    .click();
}

export function getLocalIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function buildLegacyPreM2Session({
  username = 'dan',
  name = 'Dan Castro',
  role = 'admin',
  expOffsetMs = 86_400_000,
  sexo,
} = {}) {
  const payloadObj = {
    username,
    name,
    role,
    exp: Date.now() + expOffsetMs,
  };
  if (sexo !== undefined) {
    payloadObj.sexo = sexo;
  }
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const userObj = { username, name, role };
  if (sexo !== undefined) {
    userObj.sexo = sexo;
  }
  return {
    user: userObj,
    token: `${payloadB64}.legacy_sig`,
    loggedInAt: new Date().toISOString(),
  };
}

export function buildLegacyMaleLogs({ nowIso = new Date().toISOString() } = {}) {
  return {
    supino_reto_barra: [
      {
        id: 'legacy-1',
        date: nowIso,
        weight: '82.5',
        reps: '8',
        exerciseLabel: 'Supino Reto (Barra)',
        month: 'Novembro',
        workout: 'A',
        setNumber: 1,
      },
    ],
    'Bench Press (Supino Reto)': [
      {
        id: 'legacy-2',
        date: '2026-10-15T12:00:00.000Z',
        weight: '80',
        reps: '10',
      },
    ],
  };
}

export function buildLegacySessionV3({
  activeWeekKey = getLocalIsoWeekKey(),
  month = 'Novembro',
  workout = 'A',
  completedKeys = ['supino_reto_barra'],
  sessionHistory = {
    '2026-11-22::Novembro::A': {
      completedAt: new Date().toISOString(),
      exercisesCount: 1,
    },
  },
} = {}) {
  return {
    version: 3,
    activeWeekKey,
    completedByScope: { [`${month}::${workout}`]: completedKeys },
    sessionStartedAtByScope: {},
    sessionHistory,
  };
}

export function buildLegacyCsvCache(
  csvText = 'Mês,Grupo muscular,Especificação do grupo muscular,Treino,Exercício,Séries/Reps,Cadência,Técnica Avançada,Modo de execução,Observação,Descanso,Ordem,Conexão\nNovembro,Peitoral,Geral,A,Supino Reto (Barra),4 x 8-10,2-0-2-0,,Execução teste,Obs teste,90s,1,'
) {
  return {
    csv: csvText,
    syncedAt: new Date().toISOString(),
  };
}
