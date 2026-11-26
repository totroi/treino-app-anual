import { verifySignedToken, normalizeSexo } from './auth.js';
import {
  isSheetsWriteConfigured,
  getValues,
  updateValues,
  appendValues,
  clearValues
} from './_lib/sheetsClient.js';

const DEFAULT_SHEET_ID = '1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0';
const TAB_HISTORY = 'Tracking_Historico';
const TAB_SESSIONS = 'Tracking_Sessoes_Ativas';
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ACTIVE_ROWS = 200;

const HISTORY_HEADER = [
  'data',
  'acessos_dia',
  'sessoes_unicas',
  'pico_simultaneo',
  'regioes_json',
  'exercicios_concluidos',
  'series_registradas',
  'media_ex_por_usuario',
  'sexo_json',
  'treinos_json',
  'atualizado_em'
];

const SESSIONS_HEADER = [
  'session_id',
  'dia',
  'regiao',
  'sexo',
  'ultimo_sinal',
  'treino_atual',
  'ex_concluidos',
  'series_dia'
];

function getSaoPauloDateKey(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch {
    const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
  }
}

function safeJsonParse(raw, fallback = {}) {
  try {
    const parsed = JSON.parse(raw || '');
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function extractRegionFromHeaders(headers = {}) {
  const getH = (name) => {
    const val = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  };
  const country = String(getH('x-vercel-ip-country') || '').trim().toUpperCase();
  const region = String(getH('x-vercel-ip-country-region') || '').trim().toUpperCase();
  let city = String(getH('x-vercel-ip-city') || '').trim();
  if (city) {
    try {
      city = decodeURIComponent(city);
    } catch {
      // keep raw
    }
  }
  if (!country && !region && !city) return 'Local / Indefinida';
  const prefix = [country, region].filter(Boolean).join('-');
  if (prefix && city) return `${prefix}/${city}`;
  return prefix || city || 'Indefinida';
}

function deduplicateSessionRows(rows, targetDay) {
  const byId = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r) || !r[0]) continue;
    const sessionId = String(r[0]).trim();
    const dia = String(r[1] || '').trim();
    if (targetDay && dia !== targetDay) continue;
    const ultimoSinal = String(r[4] || '').trim();
    const ultimoTs = Date.parse(ultimoSinal) || 0;
    const parsed = {
      rowIndex: i + 1,
      sessionId,
      dia,
      regiao: String(r[2] || 'Indefinida').trim(),
      sexo: normalizeSexo(r[3]),
      ultimoSinal,
      ultimoTs,
      treinoAtual: String(r[5] || '').trim(),
      exConcluidos: Math.max(0, Number.parseInt(r[6], 10) || 0),
      seriesDia: Math.max(0, Number.parseInt(r[7], 10) || 0)
    };
    const prev = byId.get(sessionId);
    if (!prev || parsed.ultimoTs >= prev.ultimoTs) {
      byId.set(sessionId, parsed);
    }
  }
  return Array.from(byId.values());
}

function parseHistoryRows(rows) {
  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!Array.isArray(r) || !r[0]) continue;
    result.push({
      rowIndex: i + 1,
      data: String(r[0]).trim(),
      acessosDia: Math.max(0, Number.parseInt(r[1], 10) || 0),
      sessoesUnicas: Math.max(0, Number.parseInt(r[2], 10) || 0),
      picoSimultaneo: Math.max(0, Number.parseInt(r[3], 10) || 0),
      regioes: safeJsonParse(r[4], {}),
      exerciciosConcluidos: Math.max(0, Number.parseInt(r[5], 10) || 0),
      seriesRegistradas: Math.max(0, Number.parseInt(r[6], 10) || 0),
      mediaExPorUsuario: Number.parseFloat(r[7]) || 0,
      sexo: safeJsonParse(r[8], {}),
      treinos: safeJsonParse(r[9], {}),
      atualizadoEm: String(r[10] || '').trim()
    });
  }
  return result.sort((a, b) => b.data.localeCompare(a.data));
}

function sanitizeSessionId(raw) {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
}

function buildEmptyAdminPayload(configured) {
  return {
    ok: true,
    configured,
    generatedAt: new Date().toISOString(),
    todayKey: getSaoPauloDateKey(),
    summary: {
      todayAccesses: 0,
      todayUniqueSessions: 0,
      simultaneousNow: 0,
      todayPeakSimultaneous: 0,
      todayCompletedExercises: 0,
      todaySetsLogged: 0,
      todayAvgExPerUser: 0,
      periodAccesses: 0,
      periodUniqueSessions: 0,
      periodAvgExPerUser: 0,
      periodPeakSimultaneous: 0
    },
    regions: [],
    genderBreakdown: { M: 0, F: 0 },
    topWorkouts: [],
    history: []
  };
}

export async function handleTrackingRequest({ method, headers = {}, body = {} }) {
  const authHeader = headers.authorization || headers.Authorization || '';
  const user = verifySignedToken(authHeader);

  if (!user) {
    return { status: 401, body: { ok: false, error: 'Não autenticado.' } };
  }

  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;

  if (method === 'GET') {
    if (user.role !== 'admin') {
      return { status: 403, body: { ok: false, error: 'Acesso restrito ao administrador.' } };
    }

    if (!isSheetsWriteConfigured()) {
      return { status: 200, body: buildEmptyAdminPayload(false) };
    }

    try {
      const todayKey = getSaoPauloDateKey();
      const [historyRaw, sessionsRaw] = await Promise.all([
        getValues(sheetId, `${TAB_HISTORY}!A1:K400`),
        getValues(sheetId, `${TAB_SESSIONS}!A1:H${MAX_ACTIVE_ROWS + 20}`)
      ]);

      const history = parseHistoryRows(historyRaw).slice(0, 30);
      const todaySessions = deduplicateSessionRows(sessionsRaw, todayKey);
      const nowMs = Date.now();
      const simultaneousNow = todaySessions.filter(
        (s) => s.ultimoTs > 0 && nowMs - s.ultimoTs <= ACTIVE_WINDOW_MS
      ).length;

      const todayRow = history.find((h) => h.data === todayKey) || null;
      const todayUniqueSessions = Math.max(todayRow?.sessoesUnicas || 0, todaySessions.length);
      const todayCompletedExercises = Math.max(
        todayRow?.exerciciosConcluidos || 0,
        todaySessions.reduce((acc, s) => acc + s.exConcluidos, 0)
      );
      const todaySetsLogged = Math.max(
        todayRow?.seriesRegistradas || 0,
        todaySessions.reduce((acc, s) => acc + s.seriesDia, 0)
      );
      const todayAvgExPerUser =
        todayUniqueSessions > 0
          ? Number((todayCompletedExercises / todayUniqueSessions).toFixed(2))
          : 0;
      const todayPeakSimultaneous = Math.max(todayRow?.picoSimultaneo || 0, simultaneousNow);

      const regionTotals = {};
      const genderTotals = { M: 0, F: 0 };
      const workoutTotals = {};
      let periodAccesses = 0;
      let periodUniqueSessions = 0;
      let periodCompletedExercises = 0;
      let periodPeakSimultaneous = simultaneousNow;

      for (const h of history) {
        periodAccesses += h.acessosDia;
        periodUniqueSessions += h.sessoesUnicas;
        periodCompletedExercises += h.exerciciosConcluidos;
        if (h.picoSimultaneo > periodPeakSimultaneous) {
          periodPeakSimultaneous = h.picoSimultaneo;
        }
        for (const [reg, count] of Object.entries(h.regioes || {})) {
          regionTotals[reg] = (regionTotals[reg] || 0) + (Number(count) || 0);
        }
        genderTotals.M += Number(h.sexo?.M || 0);
        genderTotals.F += Number(h.sexo?.F || 0);
        for (const [wk, count] of Object.entries(h.treinos || {})) {
          workoutTotals[wk] = (workoutTotals[wk] || 0) + (Number(count) || 0);
        }
      }

      const regions = Object.entries(regionTotals)
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topWorkouts = Object.entries(workoutTotals)
        .map(([workout, count]) => ({ workout, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return {
        status: 200,
        body: {
          ok: true,
          configured: true,
          generatedAt: new Date().toISOString(),
          todayKey,
          summary: {
            todayAccesses: todayRow?.acessosDia || todayUniqueSessions,
            todayUniqueSessions,
            simultaneousNow,
            todayPeakSimultaneous,
            todayCompletedExercises,
            todaySetsLogged,
            todayAvgExPerUser,
            periodAccesses,
            periodUniqueSessions,
            periodAvgExPerUser:
              periodUniqueSessions > 0
                ? Number((periodCompletedExercises / periodUniqueSessions).toFixed(2))
                : 0,
            periodPeakSimultaneous
          },
          regions,
          genderBreakdown: genderTotals,
          topWorkouts,
          history
        }
      };
    } catch (err) {
      console.warn('[tracking GET] fallback fail-open:', err?.message);
      return {
        status: 200,
        body: {
          ...buildEmptyAdminPayload(true),
          error: 'Não foi possível ler as abas de tracking no momento.'
        }
      };
    }
  }

  if (method === 'POST') {
    if (!isSheetsWriteConfigured()) {
      return { status: 200, body: { ok: false, skipped: true } };
    }

    const sessionId = sanitizeSessionId(body.sessionId);
    if (!sessionId) {
      return { status: 400, body: { ok: false, error: 'sessionId inválido.' } };
    }

    const eventType = body.eventType === 'session_start' ? 'session_start' : 'progress_heartbeat';
    const sexo = normalizeSexo(body.sexo || user.sexo);
    const month = String(body.month || '').trim().slice(0, 24);
    const workoutKey = String(body.workoutKey || '').trim().slice(0, 8);
    const treinoAtual = month && workoutKey ? `${month}|${workoutKey}` : (workoutKey || '');
    const exConcluidos = Math.max(0, Math.min(200, Number.parseInt(body.completedExercisesCount, 10) || 0));
    const seriesDia = Math.max(0, Math.min(500, Number.parseInt(body.setsLoggedToday, 10) || 0));

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const todayKey = getSaoPauloDateKey();
    const region = extractRegionFromHeaders(headers);

    try {
      const [sessionsRaw, historyRaw] = await Promise.all([
        getValues(sheetId, `${TAB_SESSIONS}!A1:H${MAX_ACTIVE_ROWS + 30}`),
        getValues(sheetId, `${TAB_HISTORY}!A1:K400`)
      ]);

      // Poda automática na virada de data (mantém <= MAX_ACTIVE_ROWS linhas do dia atual)
      const hasStaleDays = sessionsRaw.slice(1).some((r) => r && r[1] && String(r[1]).trim() !== todayKey);
      const todaySessions = deduplicateSessionRows(sessionsRaw, todayKey);
      const existing = todaySessions.find((s) => s.sessionId === sessionId);

      const updatedSession = {
        sessionId,
        dia: todayKey,
        regiao: existing?.regiao && existing.regiao !== 'Local / Indefinida' ? existing.regiao : region,
        sexo,
        ultimoSinal: nowIso,
        ultimoTs: nowMs,
        treinoAtual: treinoAtual || existing?.treinoAtual || '',
        exConcluidos: Math.max(existing?.exConcluidos || 0, exConcluidos),
        seriesDia: Math.max(existing?.seriesDia || 0, seriesDia)
      };

      const nextSessionsMap = new Map(todaySessions.map((s) => [s.sessionId, s]));
      nextSessionsMap.set(sessionId, updatedSession);
      const nextSessionsList = Array.from(nextSessionsMap.values())
        .sort((a, b) => b.ultimoTs - a.ultimoTs)
        .slice(0, MAX_ACTIVE_ROWS);

      if (hasStaleDays || sessionsRaw.length === 0) {
        await clearValues(sheetId, `${TAB_SESSIONS}!A1:H${MAX_ACTIVE_ROWS + 30}`);
        const rebuilt = [
          SESSIONS_HEADER,
          ...nextSessionsList.map((s) => [
            s.sessionId,
            s.dia,
            s.regiao,
            s.sexo,
            s.ultimoSinal,
            s.treinoAtual,
            String(s.exConcluidos),
            String(s.seriesDia)
          ])
        ];
        await updateValues(sheetId, `${TAB_SESSIONS}!A1:H${rebuilt.length}`, rebuilt);
      } else if (existing?.rowIndex) {
        await updateValues(sheetId, `${TAB_SESSIONS}!A${existing.rowIndex}:H${existing.rowIndex}`, [[
          updatedSession.sessionId,
          updatedSession.dia,
          updatedSession.regiao,
          updatedSession.sexo,
          updatedSession.ultimoSinal,
          updatedSession.treinoAtual,
          String(updatedSession.exConcluidos),
          String(updatedSession.seriesDia)
        ]]);
      } else {
        await appendValues(sheetId, `${TAB_SESSIONS}!A1:H1`, [[
          updatedSession.sessionId,
          updatedSession.dia,
          updatedSession.regiao,
          updatedSession.sexo,
          updatedSession.ultimoSinal,
          updatedSession.treinoAtual,
          String(updatedSession.exConcluidos),
          String(updatedSession.seriesDia)
        ]]);
      }

      // Rollup diário deduplicado para Tracking_Historico
      const historyRows = parseHistoryRows(historyRaw);
      const existingHistory = historyRows.find((h) => h.data === todayKey);

      const sessoesUnicas = nextSessionsList.length;
      const simultaneousNow = nextSessionsList.filter(
        (s) => s.ultimoTs > 0 && nowMs - s.ultimoTs <= ACTIVE_WINDOW_MS
      ).length;
      const picoSimultaneo = Math.max(existingHistory?.picoSimultaneo || 0, simultaneousNow);
      const acessosDia = Math.max(
        sessoesUnicas,
        (existingHistory?.acessosDia || 0) + (eventType === 'session_start' ? 1 : 0)
      );

      const regioes = {};
      const sexoDist = { M: 0, F: 0 };
      const treinosDist = {};
      let totalEx = 0;
      let totalSeries = 0;

      for (const s of nextSessionsList) {
        regioes[s.regiao] = (regioes[s.regiao] || 0) + 1;
        if (s.sexo === 'F') sexoDist.F += 1;
        else sexoDist.M += 1;
        if (s.treinoAtual) {
          treinosDist[s.treinoAtual] = (treinosDist[s.treinoAtual] || 0) + 1;
        }
        totalEx += s.exConcluidos;
        totalSeries += s.seriesDia;
      }

      const mediaEx = sessoesUnicas > 0 ? Number((totalEx / sessoesUnicas).toFixed(2)) : 0;
      const historyRowValues = [
        todayKey,
        String(acessosDia),
        String(sessoesUnicas),
        String(picoSimultaneo),
        JSON.stringify(regioes),
        String(totalEx),
        String(totalSeries),
        String(mediaEx),
        JSON.stringify(sexoDist),
        JSON.stringify(treinosDist),
        nowIso
      ];

      if (historyRaw.length === 0) {
        await updateValues(sheetId, `${TAB_HISTORY}!A1:K2`, [HISTORY_HEADER, historyRowValues]);
      } else if (existingHistory?.rowIndex) {
        await updateValues(
          sheetId,
          `${TAB_HISTORY}!A${existingHistory.rowIndex}:K${existingHistory.rowIndex}`,
          [historyRowValues]
        );
      } else {
        await appendValues(sheetId, `${TAB_HISTORY}!A1:K1`, [historyRowValues]);
      }

      return { status: 200, body: { ok: true, skipped: false } };
    } catch (err) {
      console.warn('[tracking POST] fail-open:', err?.message);
      return { status: 200, body: { ok: false, skipped: true } };
    }
  }

  return { status: 405, body: { ok: false, error: 'Método não permitido.' } };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  let parsedBody = {};
  if (req.method === 'POST') {
    try {
      parsedBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch {
      parsedBody = {};
    }
  }

  const result = await handleTrackingRequest({
    method: req.method,
    headers: req.headers || {},
    body: parsedBody
  });
  return res.status(result.status).json(result.body);
}
