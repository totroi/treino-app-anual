import { getCanonicalExerciseKey } from '../utils/exerciseNormalizer.js';
import { normalizeWeightInput } from '../utils/numberFormat.js';

const LEGACY_LOGS_KEY = "gym_tracker_logs";
const LEGACY_SESSION_KEY = "gym_tracker_session_completed";
const CACHED_CSV_KEY = "irontracker_cached_csv_v1";
const UI_SCALE_KEY = "irontracker_ui_scale";
const SCREENSAVER_DELAY_KEY = "irontracker_screensaver_delay";
const AUTO_TIMER_KEY = "irontracker_auto_start_timer";

const getLogsKey = (username) => `irontracker_logs_${(username || 'default').toLowerCase()}`;
const getSessionV2Key = (username) => `irontracker_session_${(username || 'default').toLowerCase()}`;
const getSessionV3Key = (username) => `irontracker_session_v3_${(username || 'default').toLowerCase()}`;
const getBackupMetaKey = (username) => `irontracker_backup_meta_${(username || 'default').toLowerCase()}`;

export const makeSessionScopeKey = (month, workout) => `${(month || '').trim()}::${(workout || '').trim()}`;

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

export function loadUserWorkoutLogs(username) {
  try {
    const userKey = getLogsKey(username);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      return normalizeLogsMap(JSON.parse(saved));
    }

    const legacy = localStorage.getItem(LEGACY_LOGS_KEY);
    if (legacy) {
      const migrated = normalizeLogsMap(JSON.parse(legacy));
      localStorage.setItem(userKey, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) {
    console.warn("Erro ao carregar histórico de treinos:", e);
  }
  return {};
}

export function saveUserWorkoutLogs(username, logsMap) {
  try {
    localStorage.setItem(getLogsKey(username), JSON.stringify(logsMap));
  } catch (e) {
    console.warn("Erro ao salvar histórico:", e);
  }
}

/**
 * Schema v3.0: Conclusão escopada por `${month}::${workout}` + histórico de sessões,
 * com migração automática retrocompatível a partir de v2 (`irontracker_session_<user>`) ou v1.
 */
export function loadUserSessionV3(username, currentMonth, currentWorkout) {
  const empty = { version: 3, completedByScope: {}, sessionHistory: {} };
  try {
    const v3Key = getSessionV3Key(username);
    const savedV3 = localStorage.getItem(v3Key);
    if (savedV3) {
      const parsed = JSON.parse(savedV3);
      if (parsed && typeof parsed === 'object') {
        return {
          version: 3,
          completedByScope: parsed.completedByScope || {},
          sessionHistory: parsed.sessionHistory || {}
        };
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
          completedByScope: {
            [scopeKey]: [...new Set(arr.map(getCanonicalExerciseKey))]
          },
          sessionHistory: {}
        };
        localStorage.setItem(v3Key, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return empty;
}

export function saveUserSessionV3(username, sessionState) {
  try {
    localStorage.setItem(getSessionV3Key(username), JSON.stringify({
      version: 3,
      completedByScope: sessionState.completedByScope || {},
      sessionHistory: sessionState.sessionHistory || {}
    }));
  } catch {
    // ignore
  }
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
  try {
    localStorage.setItem(getBackupMetaKey(username), JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function exportUserBackup(username, logsMap, sessionV3, currentScopeCompleted = []) {
  const payload = {
    app: "IronTracker",
    version: "3.0",
    exportedAt: new Date().toISOString(),
    username,
    workoutLogs: logsMap,
    completedExercises: currentScopeCompleted,
    completedByScope: sessionV3?.completedByScope || {},
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
    completedByScope: parsed.completedByScope && typeof parsed.completedByScope === 'object' ? parsed.completedByScope : null,
    sessionHistory: parsed.sessionHistory && typeof parsed.sessionHistory === 'object' ? parsed.sessionHistory : null
  };
}

export function resetAllUserProgress(username) {
  try {
    localStorage.removeItem(getLogsKey(username));
    localStorage.removeItem(getSessionV2Key(username));
    localStorage.removeItem(getSessionV3Key(username));
    localStorage.removeItem(getBackupMetaKey(username));
    localStorage.removeItem(LEGACY_LOGS_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch (e) {
    console.warn("Erro ao resetar progresso:", e);
  }
}

/* Cache local do último CSV sincronizado da planilha (reduz fallback offline desatualizado) */
export function loadCachedWorkoutsCSV() {
  try {
    const raw = localStorage.getItem(CACHED_CSV_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.csv === 'string' && parsed.csv.length > 50) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveCachedWorkoutsCSV(csvText) {
  try {
    localStorage.setItem(CACHED_CSV_KEY, JSON.stringify({
      csv: csvText,
      syncedAt: new Date().toISOString()
    }));
  } catch {
    // ignore
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
