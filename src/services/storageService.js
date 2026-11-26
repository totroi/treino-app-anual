import { getCanonicalExerciseKey } from '../utils/exerciseNormalizer.js';
import { normalizeWeightInput } from '../utils/numberFormat.js';
import {
  saveDurableLogs,
  saveDurableSessionV3,
  saveDurableBackupMeta,
  saveDurableCsvCache,
  clearDurableUserProgress
} from './durableStorage.js';

const LEGACY_LOGS_KEY = "gym_tracker_logs";
const LEGACY_SESSION_KEY = "gym_tracker_session_completed";
const CACHED_CSV_KEY = "irontracker_cached_csv_v1";
const CACHED_CSV_MALE_KEY = "irontracker_cached_csv_v1_M";
const CACHED_CSV_FEMALE_KEY = "irontracker_cached_csv_v1_F";
const UI_SCALE_KEY = "irontracker_ui_scale";
const SCREENSAVER_DELAY_KEY = "irontracker_screensaver_delay";
const AUTO_TIMER_KEY = "irontracker_auto_start_timer";
const TIMER_VOLUME_KEY = "irontracker_timer_volume";
const TIMER_SOUND_ENABLED_KEY = "irontracker_timer_sound_enabled";

const getLogsKey = (username) => `irontracker_logs_${(username || 'default').toLowerCase()}`;
const getLogsBakKey = (username) => `irontracker_logs_bak_${(username || 'default').toLowerCase()}`;
const getResetAtKey = (username) => `irontracker_reset_at_${(username || 'default').toLowerCase()}`;
const getSessionV2Key = (username) => `irontracker_session_${(username || 'default').toLowerCase()}`;
const getSessionV3Key = (username) => `irontracker_session_v3_${(username || 'default').toLowerCase()}`;
const getBackupMetaKey = (username) => `irontracker_backup_meta_${(username || 'default').toLowerCase()}`;

function isQuotaError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/**
 * Grava em localStorage com evicção automática de caches CSV reconstruíveis se ocorrer QuotaExceededError.
 */
export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true, quotaError: false };
  } catch (err) {
    if (isQuotaError(err)) {
      try {
        localStorage.removeItem(CACHED_CSV_KEY);
        localStorage.removeItem(CACHED_CSV_MALE_KEY);
        localStorage.removeItem(CACHED_CSV_FEMALE_KEY);
        localStorage.setItem(key, value);
        return { ok: true, quotaError: false, evictedCsvCache: true };
      } catch {
        return { ok: false, quotaError: true };
      }
    }
    return { ok: false, quotaError: false };
  }
}

function countLogsEntries(logsMap) {
  if (!logsMap || typeof logsMap !== 'object') return 0;
  let total = 0;
  Object.values(logsMap).forEach((arr) => {
    if (Array.isArray(arr)) total += arr.length;
  });
  return total;
}

export function loadUserResetAt(username) {
  try {
    const raw = localStorage.getItem(getResetAtKey(username));
    const ms = Number(raw);
    return Number.isFinite(ms) && ms > 0 ? ms : 0;
  } catch {
    return 0;
  }
}

export const makeSessionScopeKey = (month, workout) => `${(month || '').trim()}::${(workout || '').trim()}`;

/**
 * Retorna a chave da semana ISO-8601 no fuso local (Segunda -> Domingo), ex.: "2026-W47".
 */
export function getLocalIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Normaliza logs v1/v2/v3 mantendo chaves canônicas unificadas e preservando metadados v3 (month, workout, setNumber)
 */
export function normalizeLogsMap(rawLogsMap) {
  if (!rawLogsMap || typeof rawLogsMap !== 'object') return {};
  const normalized = {};

  Object.entries(rawLogsMap).forEach(([rawKey, entries]) => {
    if (!Array.isArray(entries)) return;
    const canonicalKey = getCanonicalExerciseKey(rawKey);
    if (!normalized[canonicalKey]) {
      normalized[canonicalKey] = [];
    }
    entries.forEach((entry) => {
      if (entry && entry.weight !== undefined) {
        const cleanWeight = normalizeWeightInput(entry.weight) || String(entry.weight);
        const item = {
          id: entry.id || `${entry.date}-${cleanWeight}-${Math.random().toString(36).slice(2, 7)}`,
          date: entry.date || new Date().toISOString(),
          weight: cleanWeight,
          reps: entry.reps ? String(entry.reps) : "",
          exerciseLabel: entry.exerciseLabel || rawKey
        };
        if (entry.month) item.month = entry.month;
        if (entry.workout) item.workout = entry.workout;
        if (entry.setNumber) item.setNumber = entry.setNumber;
        normalized[canonicalKey].push(item);
      }
    });
  });

  Object.keys(normalized).forEach((key) => {
    const seen = new Set();
    normalized[key] = normalized[key]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((item) => {
        const sig = `${item.date}_${item.weight}_${item.reps}_${item.setNumber || ''}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
  });

  return normalized;
}

export function loadUserWorkoutLogsWithStatus(username) {
  const userKey = getLogsKey(username);
  const bakKey = getLogsBakKey(username);
  let corrupted = false;

  try {
    const saved = localStorage.getItem(userKey);
    if (saved) {
      return {
        logs: normalizeLogsMap(JSON.parse(saved)),
        corrupted: false,
        recoveredFromBackup: false
      };
    }
  } catch (e) {
    corrupted = true;
    console.warn("Erro ao carregar histórico principal de treinos:", e);
  }

  // Fallback síncrono instantâneo via sombra irontracker_logs_bak_<username>
  try {
    const bakSaved = localStorage.getItem(bakKey);
    if (bakSaved) {
      const recovered = normalizeLogsMap(JSON.parse(bakSaved));
      if (countLogsEntries(recovered) > 0) {
        safeLocalStorageSet(userKey, JSON.stringify(recovered));
        return { logs: recovered, corrupted: false, recoveredFromBackup: true };
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar backup sombra de treinos:", e);
  }

  try {
    const legacy = localStorage.getItem(LEGACY_LOGS_KEY);
    if (legacy) {
      const migrated = normalizeLogsMap(JSON.parse(legacy));
      safeLocalStorageSet(userKey, JSON.stringify(migrated));
      return { logs: migrated, corrupted: false, recoveredFromBackup: false };
    }
  } catch (e) {
    console.warn("Erro ao migrar histórico legado:", e);
  }

  return { logs: {}, corrupted, recoveredFromBackup: false };
}

export function loadUserWorkoutLogs(username) {
  return loadUserWorkoutLogsWithStatus(username).logs;
}

export function saveUserWorkoutLogs(username, logsMap, { allowEmpty = false } = {}) {
  const userKey = getLogsKey(username);
  const bakKey = getLogsBakKey(username);
  const serialized = JSON.stringify(logsMap);
  const entryCount = countLogsEntries(logsMap);

  const result = safeLocalStorageSet(userKey, serialized);
  if (entryCount > 0) {
    safeLocalStorageSet(bakKey, serialized);
  } else if (allowEmpty) {
    try {
      localStorage.removeItem(bakKey);
    } catch {
      // ignore
    }
  }

  // Espelho assíncrono em IndexedDB (2 gerações)
  saveDurableLogs(username, logsMap, { allowEmpty }).catch(() => {});
  return result;
}

/**
 * Schema v3.0: Conclusão escopada por `${month}::${workout}`, controle de virada semanal ISO
 * (`activeWeekKey`), timestamp de início de sessão (`sessionStartedAtByScope`) e histórico de sessões,
 * com migração automática retrocompatível a partir de v2 (`irontracker_session_<user>`) ou v1.
 */
export function loadUserSessionV3(username, currentMonth, currentWorkout, now = new Date()) {
  const currentWeekKey = getLocalIsoWeekKey(now);
  const empty = {
    version: 3,
    activeWeekKey: currentWeekKey,
    completedByScope: {},
    sessionStartedAtByScope: {},
    sessionHistory: {},
    weekRolledOver: false
  };
  try {
    const v3Key = getSessionV3Key(username);
    const savedV3 = localStorage.getItem(v3Key);
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      if (parsed && typeof parsed === 'object') {
        const savedWeekKey = typeof parsed.activeWeekKey === 'string' && parsed.activeWeekKey ? parsed.activeWeekKey : null;
        const hadAnyCompleted = Object.values(parsed.completedByScope || {}).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        );

        // Virada semanal automática (Segunda-feira 00h no fuso local): limpa status mantendo histórico intacto
        if (savedWeekKey && savedWeekKey !== currentWeekKey) {
          const rolled = {
            version: 3,
            activeWeekKey: currentWeekKey,
            completedByScope: {},
            sessionStartedAtByScope: {},
            sessionHistory: parsed.sessionHistory || {}
          };
          localStorage.setItem(v3Key, JSON.stringify(rolled));
          return { ...rolled, weekRolledOver: hadAnyCompleted };
        }

        const loaded = {
          version: 3,
          activeWeekKey: savedWeekKey || currentWeekKey,
          completedByScope: parsed.completedByScope || {},
          sessionStartedAtByScope: parsed.sessionStartedAtByScope || {},
          sessionHistory: parsed.sessionHistory || {},
          weekRolledOver: false
        };
        if (!savedWeekKey) {
          saveUserSessionV3(username, loaded);
        }
        return loaded;
      }
    }

    // Migração retrocompatível de v2/v1 apenas para o escopo ativo atual
    const legacyRaw = localStorage.getItem(getSessionV2Key(username)) || localStorage.getItem(LEGACY_SESSION_KEY);
    if (legacyRaw) {
      const arr = JSON.parse(legacyRaw);
      if (Array.isArray(arr) && arr.length > 0) {
        const scopeKey = makeSessionScopeKey(currentMonth, currentWorkout);
        const migrated = {
          version: 3,
          activeWeekKey: currentWeekKey,
          completedByScope: {
            [scopeKey]: [...new Set(arr.map(getCanonicalExerciseKey))]
          },
          sessionStartedAtByScope: {},
          sessionHistory: {}
        };
        localStorage.setItem(v3Key, JSON.stringify(migrated));
        return { ...migrated, weekRolledOver: false };
      }
    }
  } catch {
    // ignore
  }
  return empty;
}

export function saveUserSessionV3(username, sessionState) {
  const payload = {
    version: 3,
    activeWeekKey: sessionState.activeWeekKey || getLocalIsoWeekKey(),
    completedByScope: sessionState.completedByScope || {},
    sessionStartedAtByScope: sessionState.sessionStartedAtByScope || {},
    sessionHistory: sessionState.sessionHistory || {}
  };
  const res = safeLocalStorageSet(getSessionV3Key(username), JSON.stringify(payload));
  saveDurableSessionV3(username, payload).catch(() => {});
  return res;
}

export function loadBackupMeta(username) {
  try {
    const raw = localStorage.getItem(getBackupMetaKey(username));
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { lastExportedAt: null, logsSinceBackup: 0 };
}

export function saveBackupMeta(username, meta) {
  const res = safeLocalStorageSet(getBackupMetaKey(username), JSON.stringify(meta));
  saveDurableBackupMeta(username, meta).catch(() => {});
  return res;
}

export function exportUserBackup(username, logsMap, sessionV3, currentScopeCompleted = []) {
  const payload = {
    app: "IronTracker",
    version: "3.0",
    exportedAt: new Date().toISOString(),
    username,
    workoutLogs: logsMap,
    completedExercises: currentScopeCompleted,
    activeWeekKey: sessionV3?.activeWeekKey || getLocalIsoWeekKey(),
    completedByScope: sessionV3?.completedByScope || {},
    sessionStartedAtByScope: sessionV3?.sessionStartedAtByScope || {},
    sessionHistory: sessionV3?.sessionHistory || {}
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `irontracker-backup-${username}-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  saveBackupMeta(username, { lastExportedAt: payload.exportedAt, logsSinceBackup: 0 });
}

export function parseImportedBackup(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Arquivo de backup inválido.");
  }
  const rawLogs = parsed.workoutLogs || parsed;
  return {
    workoutLogs: normalizeLogsMap(rawLogs),
    activeWeekKey: typeof parsed.activeWeekKey === 'string' ? parsed.activeWeekKey : null,
    completedByScope: parsed.completedByScope && typeof parsed.completedByScope === 'object' ? parsed.completedByScope : null,
    sessionStartedAtByScope: parsed.sessionStartedAtByScope && typeof parsed.sessionStartedAtByScope === 'object' ? parsed.sessionStartedAtByScope : null,
    sessionHistory: parsed.sessionHistory && typeof parsed.sessionHistory === 'object' ? parsed.sessionHistory : null
  };
}

export function resetAllUserProgress(username) {
  try {
    const now = Date.now();
    localStorage.removeItem(getLogsKey(username));
    localStorage.removeItem(getLogsBakKey(username));
    localStorage.removeItem(getSessionV2Key(username));
    localStorage.removeItem(getSessionV3Key(username));
    localStorage.removeItem(getBackupMetaKey(username));
    localStorage.removeItem(LEGACY_LOGS_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    safeLocalStorageSet(getResetAtKey(username), String(now));
  } catch (e) {
    console.warn("Erro ao resetar progresso:", e);
  }
  clearDurableUserProgress(username).catch(() => {});
}

/* Cache local do último CSV sincronizado da planilha, isolado por sexo ('M' vs 'F') */
export function loadCachedWorkoutsCSV(sexo = "M") {
  const isFemale = String(sexo || "M").trim().toUpperCase() === "F";
  const candidateKeys = isFemale
    ? [CACHED_CSV_FEMALE_KEY]
    : [CACHED_CSV_MALE_KEY, CACHED_CSV_KEY];

  for (const key of candidateKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.csv === "string" && parsed.csv.length > 50) {
        return parsed;
      }
    } catch {
      // ignore corrupt entry and try next candidate if available
    }
  }
  return null;
}

export function saveCachedWorkoutsCSV(csvText, sexo = "M") {
  const isFemale = String(sexo || "M").trim().toUpperCase() === "F";
  const targetKey = isFemale ? CACHED_CSV_FEMALE_KEY : CACHED_CSV_MALE_KEY;
  const payload = {
    csv: csvText,
    syncedAt: new Date().toISOString()
  };
  saveDurableCsvCache(sexo, payload).catch(() => {});
  try {
    localStorage.setItem(targetKey, JSON.stringify(payload));
  } catch {
    // Se localStorage estiver cheio, preserva espaço para PRs e confia no IndexedDB/fallback JS
  }
}

/* Preferências de Interface */
const UI_SCALE_FONT_SIZES = {
  normal: "16px",
  large: "18px",
  xlarge: "19.5px"
};

export function applyUiScaleToDocument(scale) {
  if (typeof document === "undefined") return;
  const fontSize = UI_SCALE_FONT_SIZES[scale] || UI_SCALE_FONT_SIZES.normal;
  document.documentElement.style.fontSize = fontSize;
}

export function loadUiScale() {
  try {
    const saved = localStorage.getItem(UI_SCALE_KEY);
    const scale = saved && UI_SCALE_FONT_SIZES[saved] ? saved : "normal";
    applyUiScaleToDocument(scale);
    return scale;
  } catch {
    return "normal";
  }
}

export function saveUiScale(scale) {
  const validScale = UI_SCALE_FONT_SIZES[scale] ? scale : "normal";
  try {
    localStorage.setItem(UI_SCALE_KEY, validScale);
  } catch {
    // ignore
  }
  applyUiScaleToDocument(validScale);
}

const VALID_SCREENSAVER_DELAYS = [0, 15, 20, 30, 45];

export function loadScreensaverDelay() {
  try {
    const saved = localStorage.getItem(SCREENSAVER_DELAY_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (VALID_SCREENSAVER_DELAYS.includes(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return 20;
}

export function saveScreensaverDelay(seconds) {
  const valid = VALID_SCREENSAVER_DELAYS.includes(seconds) ? seconds : 20;
  try {
    localStorage.setItem(SCREENSAVER_DELAY_KEY, String(valid));
  } catch {
    // ignore
  }
}

export function loadAutoStartTimer() {
  try {
    const saved = localStorage.getItem(AUTO_TIMER_KEY);
    if (saved !== null) return saved === 'true';
  } catch {
    // ignore
  }
  return false;
}

export function saveAutoStartTimer(enabled) {
  try {
    localStorage.setItem(AUTO_TIMER_KEY, String(Boolean(enabled)));
  } catch {
    // ignore
  }
}

const VALID_TIMER_VOLUMES = ['low', 'medium', 'high'];

export function loadTimerVolume() {
  try {
    const saved = localStorage.getItem(TIMER_VOLUME_KEY);
    if (saved && VALID_TIMER_VOLUMES.includes(saved)) return saved;
  } catch {
    // ignore
  }
  return 'high';
}

export function saveTimerVolume(level) {
  const valid = VALID_TIMER_VOLUMES.includes(level) ? level : 'high';
  try {
    localStorage.setItem(TIMER_VOLUME_KEY, valid);
  } catch {
    // ignore
  }
}

export function loadTimerSoundEnabled() {
  try {
    const saved = localStorage.getItem(TIMER_SOUND_ENABLED_KEY);
    if (saved === '0' || saved === 'false') return false;
    if (saved === '1' || saved === 'true') return true;
  } catch {
    // ignore
  }
  return true;
}

export function saveTimerSoundEnabled(enabled) {
  try {
    localStorage.setItem(TIMER_SOUND_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}
