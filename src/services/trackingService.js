import { getCurrentSession } from './authService';

const SESSION_ID_KEY = 'irontracker_tracking_sid_v1';
const SESSION_STARTED_KEY = 'irontracker_tracking_started_v1';
const LAST_HEARTBEAT_KEY = 'irontracker_tracking_last_hb_v1';
const MIN_HEARTBEAT_MS = 5 * 60 * 1000;

function getOrCreateAnonymousSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_ID_KEY);
    if (sid && /^[a-zA-Z0-9_-]{8,48}$/.test(sid)) return sid;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      sid = `s_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    } else {
      sid = `s_${Math.random().toString(36).slice(2, 14)}${Date.now().toString(36)}`;
    }
    sessionStorage.setItem(SESSION_ID_KEY, sid);
    return sid;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

function getAuthToken() {
  const session = getCurrentSession();
  return session?.token || null;
}

async function postTrackingBeacon(payload, { keepalive = false } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { ok: false, skipped: true };
  }
  const token = getAuthToken();
  if (!token) return { ok: false, skipped: true };

  try {
    const res = await fetch('/api/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      keepalive
    });
    if (!res.ok) return { ok: false, skipped: true };
    return await res.json().catch(() => ({ ok: true }));
  } catch {
    return { ok: false, skipped: true };
  }
}

export async function trackSessionStart({ sexo, month, workoutKey, completedExercisesCount = 0, setsLoggedToday = 0 } = {}) {
  if (typeof window === 'undefined') return { ok: false, skipped: true };
  try {
    if (sessionStorage.getItem(SESSION_STARTED_KEY) === '1') {
      return { ok: false, skipped: true };
    }
    sessionStorage.setItem(SESSION_STARTED_KEY, '1');
    sessionStorage.setItem(LAST_HEARTBEAT_KEY, String(Date.now()));
  } catch {
    // ignore
  }

  return postTrackingBeacon({
    sessionId: getOrCreateAnonymousSessionId(),
    eventType: 'session_start',
    sexo: sexo || 'M',
    month: month || '',
    workoutKey: workoutKey || '',
    completedExercisesCount,
    setsLoggedToday
  });
}

export async function trackProgressHeartbeat(
  { sexo, month, workoutKey, completedExercisesCount = 0, setsLoggedToday = 0 } = {},
  { force = false, keepalive = false } = {}
) {
  if (typeof window === 'undefined') return { ok: false, skipped: true };
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(LAST_HEARTBEAT_KEY) || 0);
    if (!force && now - last < MIN_HEARTBEAT_MS) {
      return { ok: false, skipped: true };
    }
    // Mesmo em visibilitychange, respeita throttle mínimo de 60s para poupar cota
    if (force && now - last < 60_000) {
      return { ok: false, skipped: true };
    }
    sessionStorage.setItem(LAST_HEARTBEAT_KEY, String(now));
  } catch {
    // ignore
  }

  return postTrackingBeacon(
    {
      sessionId: getOrCreateAnonymousSessionId(),
      eventType: 'progress_heartbeat',
      sexo: sexo || 'M',
      month: month || '',
      workoutKey: workoutKey || '',
      completedExercisesCount,
      setsLoggedToday
    },
    { keepalive }
  );
}

export async function fetchAdminTrackingStats() {
  const token = getAuthToken();
  if (!token) {
    return { ok: false, status: 401, error: 'Sessão inválida. Faça login novamente.' };
  }

  try {
    const res = await fetch('/api/tracking', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || `Falha ao consultar tracking (HTTP ${res.status}).`
      };
    }
    return { ok: true, status: 200, data };
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Sem conexão para consultar os dados de tracking agora.'
    };
  }
}
