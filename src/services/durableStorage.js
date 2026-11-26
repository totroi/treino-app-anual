// Camada de persistência durável 100% local (IndexedDB + navigator.storage.persist)
// Protege PRs e histórico de treino contra evicção parcial de localStorage e atualizações do PWA.

const DB_NAME = 'irontracker_durable_db';
const DB_VERSION = 1;
const STORE_NAME = 'user_state';
const MAX_TOMBSTONES = 500;

let dbPromise = null;
let persistRequested = false;

export async function requestPersistentStorage() {
  if (persistRequested) return false;
  persistRequested = true;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      const already = typeof navigator.storage.persisted === 'function'
        ? await navigator.storage.persisted()
        : false;
      if (already) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // Silencioso em navegadores sem suporte (ex.: iOS WebKit)
  }
  return false;
}

export function isIndexedDBAvailable() {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDurableDB() {
  if (!isIndexedDBAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDurableDB();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbSet(key, value) {
  const db = await openDurableDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(key) {
  const db = await openDurableDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

const uKey = (prefix, username) => `${prefix}:${String(username || 'default').toLowerCase()}`;

function countEntriesInMap(logsMap) {
  if (!logsMap || typeof logsMap !== 'object') return 0;
  let total = 0;
  Object.values(logsMap).forEach((arr) => {
    if (Array.isArray(arr)) total += arr.length;
  });
  return total;
}

/**
 * Grava logs com rotação de 2 gerações (logs + logs_prev) no IndexedDB.
 * Nunca sobrescreve um snapshot preenchido com `{}` salvo se `allowEmpty === true` (reset explícito).
 */
export async function saveDurableLogs(username, logsMap, { allowEmpty = false } = {}) {
  if (!username || !logsMap || typeof logsMap !== 'object') return false;
  const key = uKey('logs', username);
  const prevKey = uKey('logs_prev', username);
  const incomingCount = countEntriesInMap(logsMap);

  const existing = await idbGet(key);
  const existingCount = countEntriesInMap(existing?.data);

  if (incomingCount === 0 && existingCount > 0 && !allowEmpty) {
    return false;
  }

  if (existingCount > 0 && incomingCount > 0) {
    await idbSet(prevKey, existing);
  }

  return idbSet(key, {
    updatedAt: Date.now(),
    data: logsMap
  });
}

export async function recordDeletedLogTombstones(username, deletedIds = []) {
  if (!username || !Array.isArray(deletedIds) || deletedIds.length === 0) return false;
  const key = uKey('tombstones', username);
  const current = (await idbGet(key)) || [];
  const merged = Array.from(new Set([...current, ...deletedIds.filter(Boolean)]));
  const trimmed = merged.slice(-MAX_TOMBSTONES);
  return idbSet(key, trimmed);
}

export async function saveDurableSessionV3(username, sessionV3) {
  if (!username || !sessionV3) return false;
  return idbSet(uKey('session_v3', username), {
    updatedAt: Date.now(),
    data: sessionV3
  });
}

export async function saveDurableBackupMeta(username, meta) {
  if (!username || !meta) return false;
  return idbSet(uKey('backup_meta', username), {
    updatedAt: Date.now(),
    data: meta
  });
}

export async function saveDurableCsvCache(sexo, payload) {
  const key = `csv_cache:${String(sexo || 'M').trim().toUpperCase() === 'F' ? 'F' : 'M'}`;
  return idbSet(key, payload);
}

export async function loadDurableCsvCache(sexo) {
  const key = `csv_cache:${String(sexo || 'M').trim().toUpperCase() === 'F' ? 'F' : 'M'}`;
  return idbGet(key);
}

export async function clearDurableUserProgress(username) {
  if (!username) return false;
  const now = Date.now();
  await idbDelete(uKey('logs', username));
  await idbDelete(uKey('logs_prev', username));
  await idbDelete(uKey('session_v3', username));
  await idbDelete(uKey('backup_meta', username));
  await idbDelete(uKey('tombstones', username));
  await idbSet(uKey('reset_at', username), now);
  return true;
}

function mergeLogsMaps(mapsList, tombstoneSet, resetAtMs) {
  const merged = {};

  for (const map of mapsList) {
    if (!map || typeof map !== 'object') continue;
    for (const [canonicalKey, entries] of Object.entries(map)) {
      if (!Array.isArray(entries)) continue;
      if (!merged[canonicalKey]) merged[canonicalKey] = [];

      for (const item of entries) {
        if (!item || item.weight === undefined) continue;
        if (item.id && tombstoneSet.has(item.id)) continue;
        if (resetAtMs && item.date) {
          const itemMs = new Date(item.date).getTime();
          if (!Number.isNaN(itemMs) && itemMs <= resetAtMs) continue;
        }
        merged[canonicalKey].push(item);
      }
    }
  }

  Object.keys(merged).forEach((key) => {
    const seen = new Set();
    merged[key] = merged[key]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((item) => {
        const sig = item.id
          ? `id:${item.id}`
          : `${item.date}_${item.weight}_${item.reps}_${item.setNumber || ''}`;
        const contentSig = `${item.date}_${item.weight}_${item.reps}_${item.setNumber || ''}`;
        if (seen.has(sig) || seen.has(contentSig)) return false;
        seen.add(sig);
        seen.add(contentSig);
        return true;
      });
    if (merged[key].length === 0) delete merged[key];
  });

  return merged;
}

/**
 * Reconcilia estado local com IndexedDB no boot, recuperando PRs perdidos caso localStorage
 * tenha sido limpo/corrompido, respeitando tombstones de exclusão e reset explícito.
 */
export async function reconcileUserStateFromIDB(
  username,
  localLogs = {},
  localResetAtMs = 0
) {
  if (!username || !isIndexedDBAvailable()) {
    return {
      idbAvailable: false,
      recovered: false,
      recoveredEntries: 0,
      logs: localLogs,
      sessionV3: null,
      backupMeta: null
    };
  }

  const [idbLogsRec, idbPrevRec, idbTombstones, idbResetAt, idbSessionRec, idbBackupRec] =
    await Promise.all([
      idbGet(uKey('logs', username)),
      idbGet(uKey('logs_prev', username)),
      idbGet(uKey('tombstones', username)),
      idbGet(uKey('reset_at', username)),
      idbGet(uKey('session_v3', username)),
      idbGet(uKey('backup_meta', username))
    ]);

  const effectiveResetAt = Math.max(Number(localResetAtMs) || 0, Number(idbResetAt) || 0);
  const tombstoneSet = new Set(Array.isArray(idbTombstones) ? idbTombstones : []);

  const idbLogsData =
    idbLogsRec && (!effectiveResetAt || (idbLogsRec.updatedAt || 0) > effectiveResetAt)
      ? idbLogsRec.data
      : null;
  const idbPrevData =
    idbPrevRec && (!effectiveResetAt || (idbPrevRec.updatedAt || 0) > effectiveResetAt)
      ? idbPrevRec.data
      : null;

  const localCount = countEntriesInMap(localLogs);
  const mergedLogs = mergeLogsMaps(
    [localLogs, idbLogsData, idbPrevData],
    tombstoneSet,
    effectiveResetAt
  );
  const mergedCount = countEntriesInMap(mergedLogs);

  const recoveredEntries = Math.max(0, mergedCount - localCount);

  return {
    idbAvailable: true,
    recovered: recoveredEntries > 0,
    recoveredEntries,
    logs: mergedLogs,
    sessionV3:
      idbSessionRec && (!effectiveResetAt || (idbSessionRec.updatedAt || 0) > effectiveResetAt)
        ? idbSessionRec.data
        : null,
    backupMeta:
      idbBackupRec && (!effectiveResetAt || (idbBackupRec.updatedAt || 0) > effectiveResetAt)
        ? idbBackupRec.data
        : null
  };
}
