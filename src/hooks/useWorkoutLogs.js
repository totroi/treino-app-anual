import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadUserWorkoutLogs,
  saveUserWorkoutLogs,
  loadUserSessionV3,
  saveUserSessionV3,
  makeSessionScopeKey,
  getLocalIsoWeekKey,
  exportUserBackup,
  parseImportedBackup,
  resetAllUserProgress,
  loadBackupMeta,
  saveBackupMeta
} from '../services/storageService';
import { normalizeWeightInput, parsePtBrNumber } from '../utils/numberFormat';

function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useWorkoutLogs(username, selectedMonth, selectedWorkout) {
  const [workoutLogs, setWorkoutLogs] = useState(() =>
    username ? loadUserWorkoutLogs(username) : {}
  );

  const [initialSession] = useState(() =>
    username
      ? loadUserSessionV3(username, selectedMonth, selectedWorkout)
      : {
          version: 3,
          activeWeekKey: getLocalIsoWeekKey(),
          completedByScope: {},
          sessionStartedAtByScope: {},
          sessionHistory: {},
          weekRolledOver: false
        }
  );

  const [sessionV3, setSessionV3] = useState(() => ({
    version: 3,
    activeWeekKey: initialSession.activeWeekKey || getLocalIsoWeekKey(),
    completedByScope: initialSession.completedByScope || {},
    sessionStartedAtByScope: initialSession.sessionStartedAtByScope || {},
    sessionHistory: initialSession.sessionHistory || {}
  }));

  const [weekRolledOver] = useState(() => Boolean(initialSession.weekRolledOver));

  const [backupMeta, setBackupMeta] = useState(() =>
    username
      ? loadBackupMeta(username)
      : { lastExportedAt: null, logsSinceBackup: 0 }
  );

  // Persiste logs
  useEffect(() => {
    if (!username) return;
    saveUserWorkoutLogs(username, workoutLogs);
  }, [workoutLogs, username]);

  // Persiste sessão v3
  useEffect(() => {
    if (!username) return;
    saveUserSessionV3(username, sessionV3);
  }, [sessionV3, username]);

  // Persiste meta de backup
  useEffect(() => {
    if (!username) return;
    saveBackupMeta(username, backupMeta);
  }, [backupMeta, username]);

  const currentScopeKey = makeSessionScopeKey(selectedMonth, selectedWorkout);

  const completedInCurrentScope = useMemo(() => {
    return sessionV3.completedByScope?.[currentScopeKey] || [];
  }, [sessionV3, currentScopeKey]);

  const currentSessionStartMs = useMemo(() => {
    const raw = sessionV3.sessionStartedAtByScope?.[currentScopeKey];
    if (!raw) return null;
    const ms = new Date(raw).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [sessionV3, currentScopeKey]);

  const getCompletedForScope = useCallback(
    (month, workout) => {
      return sessionV3.completedByScope?.[makeSessionScopeKey(month, workout)] || [];
    },
    [sessionV3]
  );

  const hasAnyWeekProgressForMonth = useCallback(
    (month) => {
      return ['A', 'B', 'C'].some((w) => {
        const list = sessionV3.completedByScope?.[makeSessionScopeKey(month, w)];
        return Array.isArray(list) && list.length > 0;
      });
    },
    [sessionV3]
  );

  // Conta quantas séries o atleta salvou na SESSÃO ATIVA de hoje para este exercício.
  // Usa chave local pura YYYY-MM-DD (imune a variações de locale no iOS Safari) e respeita reinícios da sessão.
  const getTodaySetsCount = useCallback(
    (canonicalKey) => {
      const entries = workoutLogs[canonicalKey] || [];
      const todayKey = getLocalDateKey(new Date());
      return entries.filter((item) => {
        const itemDate = new Date(item.date);
        if (Number.isNaN(itemDate.getTime())) return false;
        if (getLocalDateKey(itemDate) !== todayKey) return false;
        if (currentSessionStartMs !== null && itemDate.getTime() < currentSessionStartMs) {
          return false;
        }
        return true;
      }).length;
    },
    [workoutLogs, currentSessionStartMs]
  );

  // Salva uma série SEM colapsar/concluir o card automaticamente e persiste sincronamente no localStorage
  const logSet = useCallback(
    (canonicalKey, displayTitle, rawWeight, rawReps) => {
      const cleanWeight = normalizeWeightInput(rawWeight);
      if (!cleanWeight && cleanWeight !== '0') return null;

      const activeCount = getTodaySetsCount(canonicalKey);
      const newLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString(),
        weight: cleanWeight,
        reps: rawReps ? String(rawReps).trim() : '',
        exerciseLabel: displayTitle,
        month: selectedMonth,
        workout: selectedWorkout,
        setNumber: activeCount + 1
      };

      setWorkoutLogs((prev) => {
        const currentLogs = prev[canonicalKey] || [];
        const nextLogs = { ...prev, [canonicalKey]: [newLog, ...currentLogs] };
        if (username) saveUserWorkoutLogs(username, nextLogs);
        return nextLogs;
      });

      setBackupMeta((prev) => ({
        ...prev,
        logsSinceBackup: (prev.logsSinceBackup || 0) + 1
      }));

      return newLog;
    },
    [getTodaySetsCount, selectedMonth, selectedWorkout, username]
  );

  // Marca ou desmarca exercício concluído APENAS no escopo `${selectedMonth}::${selectedWorkout}`
  const toggleComplete = useCallback(
    (canonicalKey) => {
      const willBeCompleted = !completedInCurrentScope.includes(canonicalKey);
      setSessionV3((prev) => {
        const list = prev.completedByScope?.[currentScopeKey] || [];
        const exists = list.includes(canonicalKey);
        const nextList = exists ? list.filter((k) => k !== canonicalKey) : [...list, canonicalKey];
        const todayIso = new Date().toISOString().slice(0, 10);
        const histKey = `${todayIso}::${currentScopeKey}`;

        return {
          ...prev,
          version: 3,
          activeWeekKey: prev.activeWeekKey || getLocalIsoWeekKey(),
          completedByScope: {
            ...prev.completedByScope,
            [currentScopeKey]: nextList
          },
          sessionHistory: {
            ...prev.sessionHistory,
            [histKey]: {
              completedAt: new Date().toISOString(),
              exercisesCount: nextList.length
            }
          }
        };
      });
      return willBeCompleted;
    },
    [completedInCurrentScope, currentScopeKey]
  );

  const deleteLog = useCallback(
    (canonicalKey, logId, idx) => {
      setWorkoutLogs((prev) => {
        const current = prev[canonicalKey] || [];
        const updated = current.filter((item, i) => (logId ? item.id !== logId : i !== idx));
        const nextLogs = { ...prev, [canonicalKey]: updated };
        if (username) saveUserWorkoutLogs(username, nextLogs);
        return nextLogs;
      });
    },
    [username]
  );

  // Reinicia apenas o status do Treino atual (reabre cards e zera contador da sessão, sem apagar histórico)
  const resetCurrentWorkoutStatus = useCallback(() => {
    const nowIso = new Date().toISOString();
    setSessionV3((prev) => ({
      ...prev,
      version: 3,
      activeWeekKey: getLocalIsoWeekKey(),
      completedByScope: {
        ...prev.completedByScope,
        [currentScopeKey]: []
      },
      sessionStartedAtByScope: {
        ...(prev.sessionStartedAtByScope || {}),
        [currentScopeKey]: nowIso
      }
    }));
  }, [currentScopeKey]);

  // Reinicia o status semanal completo (Treinos A, B e C do mês selecionado), preservando 100% do histórico
  const resetMonthWeekStatus = useCallback(
    (monthOverride = null) => {
      const targetMonth = monthOverride || selectedMonth;
      const nowIso = new Date().toISOString();
      setSessionV3((prev) => {
        const nextCompleted = { ...(prev.completedByScope || {}) };
        const nextStartedAt = { ...(prev.sessionStartedAtByScope || {}) };
        ['A', 'B', 'C'].forEach((w) => {
          const scopeKey = makeSessionScopeKey(targetMonth, w);
          nextCompleted[scopeKey] = [];
          nextStartedAt[scopeKey] = nowIso;
        });

        return {
          ...prev,
          version: 3,
          activeWeekKey: getLocalIsoWeekKey(),
          completedByScope: nextCompleted,
          sessionStartedAtByScope: nextStartedAt
        };
      });
    },
    [selectedMonth]
  );

  // Reseta todo o progresso local do usuário (ação destrutiva)
  const resetAllProgress = useCallback(() => {
    if (!username) return;
    resetAllUserProgress(username);
    setWorkoutLogs({});
    setSessionV3({
      version: 3,
      activeWeekKey: getLocalIsoWeekKey(),
      completedByScope: {},
      sessionStartedAtByScope: {},
      sessionHistory: {}
    });
    setBackupMeta({ lastExportedAt: null, logsSinceBackup: 0 });
  }, [username]);

  const exportBackup = useCallback(() => {
    if (!username) return;
    exportUserBackup(username, workoutLogs, sessionV3, completedInCurrentScope);
    setBackupMeta({ lastExportedAt: new Date().toISOString(), logsSinceBackup: 0 });
  }, [username, workoutLogs, sessionV3, completedInCurrentScope]);

  const importBackupText = useCallback((jsonText) => {
    const imported = parseImportedBackup(jsonText);
    setWorkoutLogs((prev) => {
      const merged = { ...prev };
      Object.entries(imported.workoutLogs).forEach(([k, entries]) => {
        const combined = [...entries, ...(merged[k] || [])];
        const seen = new Set();
        merged[k] = combined
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .filter((item) => {
            const sig = `${item.date}_${item.weight}_${item.reps}`;
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
          });
      });
      return merged;
    });

    if (imported.completedByScope || imported.sessionHistory || imported.sessionStartedAtByScope) {
      setSessionV3((prev) => ({
        version: 3,
        activeWeekKey: imported.activeWeekKey || prev.activeWeekKey || getLocalIsoWeekKey(),
        completedByScope: {
          ...prev.completedByScope,
          ...(imported.completedByScope || {})
        },
        sessionStartedAtByScope: {
          ...(prev.sessionStartedAtByScope || {}),
          ...(imported.sessionStartedAtByScope || {})
        },
        sessionHistory: {
          ...prev.sessionHistory,
          ...(imported.sessionHistory || {})
        }
      }));
    }
  }, []);

  // Estatísticas consolidadas (para ProfileDrawer e ResultsModal)
  const summaryStats = useMemo(() => {
    let totalLogs = 0;
    const prs = [];

    Object.entries(workoutLogs).forEach(([canonicalKey, entries]) => {
      if (!Array.isArray(entries) || entries.length === 0) return;
      totalLogs += entries.length;

      let bestEntry = entries[0];
      let bestWeight = parsePtBrNumber(entries[0].weight) || 0;
      entries.forEach((e) => {
        const w = parsePtBrNumber(e.weight);
        if (!Number.isNaN(w) && w > bestWeight) {
          bestWeight = w;
          bestEntry = e;
        }
      });

      const latest = entries[0];
      const previous = entries.length > 1 ? entries[1] : null;
      const delta = previous
        ? Number(((parsePtBrNumber(latest.weight) || 0) - (parsePtBrNumber(previous.weight) || 0)).toFixed(2))
        : 0;

      prs.push({
        canonicalKey,
        label: latest.exerciseLabel || canonicalKey,
        prWeight: bestWeight,
        prReps: bestEntry.reps,
        prDate: bestEntry.date,
        latestWeight: parsePtBrNumber(latest.weight) || 0,
        latestDate: latest.date,
        delta,
        totalEntries: entries.length
      });
    });

    prs.sort((a, b) => b.prWeight - a.prWeight);

    const sessionsCount = Object.values(sessionV3.sessionHistory || {}).filter(
      (s) => s && s.exercisesCount > 0
    ).length;

    return {
      totalLogs,
      uniqueExercisesCount: prs.length,
      sessionsCount,
      prs
    };
  }, [workoutLogs, sessionV3]);

  return {
    workoutLogs,
    sessionV3,
    weekRolledOver,
    backupMeta,
    completedInCurrentScope,
    getCompletedForScope,
    hasAnyWeekProgressForMonth,
    getTodaySetsCount,
    logSet,
    toggleComplete,
    deleteLog,
    resetCurrentWorkoutStatus,
    resetMonthWeekStatus,
    resetCurrentSession: resetCurrentWorkoutStatus,
    resetAllProgress,
    exportBackup,
    importBackupText,
    summaryStats
  };
}
