import { getCanonicalExerciseKey } from '../utils/exerciseNormalizer';

const LEGACY_LOGS_KEY = "gym_tracker_logs";
const LEGACY_SESSION_KEY = "gym_tracker_session_completed";

const getLogsKey = (username) => `irontracker_logs_${(username || 'default').toLowerCase()}`;
const getSessionKey = (username) => `irontracker_session_${(username || 'default').toLowerCase()}`;

/**
 * Normaliza um objeto de logs antigo (cujas chaves eram o nome bruto do exercício)
 * para chaves canônicas unificadas, ordenando por data decrescente.
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
        normalized[canonicalKey].push({
          id: entry.id || `${entry.date}-${entry.weight}-${Math.random().toString(36).slice(2, 7)}`,
          date: entry.date || new Date().toISOString(),
          weight: String(entry.weight),
          reps: entry.reps ? String(entry.reps) : "",
          exerciseLabel: entry.exerciseLabel || rawKey
        });
      }
    });
  });

  // Ordenar cada lista por data mais recente primeiro e remover duplicatas exatas de timestamp+peso
  Object.keys(normalized).forEach((key) => {
    const seen = new Set();
    normalized[key] = normalized[key]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((item) => {
        const sig = `${item.date}_${item.weight}_${item.reps}`;
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

    // Migração transparente do localStorage antigo (gym_tracker_logs)
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
    const userKey = getLogsKey(username);
    localStorage.setItem(userKey, JSON.stringify(logsMap));
  } catch (e) {
    console.warn("Erro ao salvar histórico:", e);
  }
}

export function loadUserCompletedSession(username) {
  try {
    const userKey = getSessionKey(username);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      const arr = JSON.parse(saved);
      return Array.isArray(arr) ? arr.map(getCanonicalExerciseKey) : [];
    }

    const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
    if (legacy) {
      const arr = JSON.parse(legacy);
      const migrated = Array.isArray(arr) ? arr.map(getCanonicalExerciseKey) : [];
      localStorage.setItem(userKey, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveUserCompletedSession(username, completedList) {
  try {
    const userKey = getSessionKey(username);
    localStorage.setItem(userKey, JSON.stringify(completedList));
  } catch {
    // ignore
  }
}

export function exportUserBackup(username, logsMap, completedList) {
  const payload = {
    app: "IronTracker",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    username,
    workoutLogs: logsMap,
    completedExercises: completedList
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
}

export function parseImportedBackup(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Arquivo de backup inválido.");
  }
  const rawLogs = parsed.workoutLogs || parsed;
  const normalizedLogs = normalizeLogsMap(rawLogs);
  return normalizedLogs;
}
