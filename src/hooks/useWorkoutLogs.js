import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  loadUserWorkoutLogs,
  saveUserWorkoutLogs,
  loadUserSessionV3,
  saveUserSessionV3,
  makeSessionScopeKey,
  exportUserBackup,
  parseImportedBackup,
  resetAllUserProgress,
  loadBackupMeta,
  saveBackupMeta
} from '../services/storageService';
import { normalizeWeightInput, parsePtBrNumber } from '../utils/numberFormat';

export function useWorkoutLogs(username, selectedMonth, selectedWorkout) {
  const [workoutLogs, setWorkoutLogs] = useState(() =>
    username ? loadUserWorkoutLogs(username) : {}
  );
  const [sessionV3, setSessionV3] = useState(() =>
    username
      ? loadUserSessionV3(username, selectedMonth, selectedWorkout)
      : { version: 3, completedByScope: {}, sessionHistory: {} }
  );
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

  const getCompletedForScope = useCallback(
    (month, workout) => {
      return sessionV3.completedByScope?.[makeSessionScopeKey(month, workout)] || [];
    },
    [sessionV3]
  );

  // Conta quantas séries o atleta já salvou HOJE para este exercício
  const getTodaySetsCount = useCallback(
    (canonicalKey) => {
      const entries = workoutLogs[canonicalKey] || [];
      const todayStr = new Date().toLocaleDateString('pt-BR');
      return entries.filter((item) => new Date(item.date).toLocaleDateString('pt-BR') === todayStr).length;
    },
    [workoutLogs]
  );

  // Salva uma série SEM colapsar/concluir o card automaticamente (Item 4.1)
  const logSet = useCallback(
    (canonicalKey, displayTitle, rawWeight, rawReps) => {
      const cleanWeight = normalizeWeightInput(rawWeight);
      if (!cleanWeight && cleanWeight !== '0') return null;

      const todayCount = getTodaySetsCount(canonicalKey);
      const newLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString(),
        weight: cleanWeight,
        reps: rawReps ? String(rawReps).trim() : '',
        exerciseLabel: displayTitle,
        month: selectedMonth,
        workout: selectedWorkout,
        setNumber: todayCount + 1
      };

      setWorkoutLogs((prev) => {
        const currentLogs = prev[canonicalKey] || [];
        return { ...prev, [canonicalKey]: [newLog, ...currentLogs] };
      });

      setBackupMeta((prev) => ({
        ...prev,
        logsSinceBackup: (prev.logsSinceBackup || 0) + 1
      }));

      return newLog;
    },
    [getTodaySetsCount, selectedMonth, selectedWorkout]
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
          version: 3,
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

  const deleteLog = useCallback((canonicalKey, logId, idx) => {
    setWorkoutLogs((prev) => {
      const current = prev[canonicalKey] || [];
      const updated = current.filter((item, i) => (logId ? item.id !== logId : i !== idx));
      return { ...prev, [canonicalKey]: updated };
    });
  }, []);

  // Reseta apenas a sessão do Treino/Mês atual (sem apagar outros treinos nem o histórico)
  const resetCurrentSession = useCallback(() => {
    setSessionV3((prev) => ({
      ...prev,
      completedByScope: {
        ...prev.completedByScope,
        [currentScopeKey]: []
      }
    }));
  }, [currentScopeKey]);

  // Reseta todo o progresso local do usuário
  const resetAllProgress = useCallback(() => {
    if (!username) return;
    resetAllUserProgress(username);
    setWorkoutLogs({});
    setSessionV3({ version: 3, completedByScope: {}, sessionHistory: {} });
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

    if (imported.completedByScope || imported.sessionHistory) {
      setSessionV3((prev) => ({
        version: 3,
        completedByScope: {
          ...prev.completedByScope,
          ...(imported.completedByScope || {})
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
    backupMeta,
    completedInCurrentScope,
    getCompletedForScope,
    getTodaySetsCount,
    logSet,
    toggleComplete,
    deleteLog,
    resetCurrentSession,
    resetAllProgress,
    exportBackup,
    importBackupText,
    summaryStats
  };
}
