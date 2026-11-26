import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  loadUserWorkoutLogsWithStatus,
  loadUserResetAt,
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
import {
  requestPersistentStorage,
  reconcileUserStateFromIDB,
  recordDeletedLogTombstones,
  isIndexedDBAvailable
} from '../services/durableStorage';
import { normalizeWeightInput, parsePtBrNumber } from '../utils/numberFormat';
import { getLocalDateKey, matchesLogScope } from '../utils/logScope';

export function useWorkoutLogs(username, selectedMonth, selectedWorkout) {
  const [initialLogsLoad] = useState(() =>
    username
      ? loadUserWorkoutLogsWithStatus(username)
      : { logs: {}, corrupted: false, recoveredFromBackup: false }
  );

  const [workoutLogs, setWorkoutLogs] = useState(() => initialLogsLoad.logs);
  const [storageStatus, setStorageStatus] = useState(() => ({
    idbProtected: isIndexedDBAvailable(),
    quotaError: false,
    recoveredFromBackup: Boolean(initialLogsLoad.recoveredFromBackup),
    recoveredFromIDB: 0
  }));

  // Guarda anti-sobrescrita no mount: impede que mount/parse corrompido grave {} por cima do backup sombra/IDB
  const hasMutatedLogsRef = useRef(false);
  const explicitResetRef = useRef(false);
  const initialCorruptedRef = useRef(Boolean(initialLogsLoad.corrupted));
  const idbReconciledRef = useRef(false);

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

  // Solicita persistência durável silenciosa e reconcilia IndexedDB no boot (recuperação automática de PRs)
  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    requestPersistentStorage().catch(() => {});

    const localResetAt = loadUserResetAt(username);
    reconcileUserStateFromIDB(username, initialLogsLoad.logs, localResetAt)
      .then((res) => {
        if (cancelled) return;
        idbReconciledRef.current = true;

        if (res.idbAvailable) {
          setStorageStatus((prev) => ({
            ...prev,
            idbProtected: true,
            recoveredFromIDB: res.recoveredEntries || 0
          }));
        }

        if (res.recovered && !explicitResetRef.current) {
          hasMutatedLogsRef.current = true;
          initialCorruptedRef.current = false;
          setWorkoutLogs((current) => {
            // Preserva eventuais séries já registradas pelo usuário antes do resolve do IDB
            const merged = { ...res.logs };
            Object.entries(current).forEach(([k, entries]) => {
              if (!Array.isArray(entries) || entries.length === 0) return;
              const combined = [...entries, ...(merged[k] || [])];
              const seen = new Set();
              merged[k] = combined
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .filter((item) => {
                  const sig = `${item.date}_${item.weight}_${item.reps}_${item.setNumber || ''}`;
                  if (seen.has(sig)) return false;
                  seen.add(sig);
                  return true;
                });
            });
            return merged;
          });
        } else if (res.idbAvailable && Object.keys(initialLogsLoad.logs).length > 0) {
          // Espelha estado local inicial no IndexedDB pela primeira vez (migração silenciosa)
          saveUserWorkoutLogs(username, initialLogsLoad.logs);
        }

        if (res.sessionV3 && Object.keys(initialSession.sessionHistory || {}).length === 0) {
          setSessionV3((prev) => ({
            ...prev,
            sessionHistory: {
              ...(res.sessionV3.sessionHistory || {}),
              ...(prev.sessionHistory || {})
            }
          }));
        }
      })
      .catch(() => {
        idbReconciledRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [username, initialLogsLoad.logs, initialSession.sessionHistory]);

  // Persiste logs com guarda anti-sobrescrita (nunca grava {} no mount se não houve mutação explícita)
  useEffect(() => {
    if (!username) return;
    const isEmpty = Object.keys(workoutLogs).length === 0;
    if (isEmpty && !explicitResetRef.current && (!hasMutatedLogsRef.current || initialCorruptedRef.current)) {
      return;
    }
    const res = saveUserWorkoutLogs(username, workoutLogs, {
      allowEmpty: explicitResetRef.current || hasMutatedLogsRef.current
    });
    if (res && res.quotaError) {
      Promise.resolve().then(() => {
        setStorageStatus((prev) => (prev.quotaError ? prev : { ...prev, quotaError: true }));
      });
    }
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

      hasMutatedLogsRef.current = true;
      explicitResetRef.current = false;
      requestPersistentStorage().catch(() => {});

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
        const todayLocal = getLocalDateKey(new Date());
        const histKey = `${todayLocal}::${currentScopeKey}`;

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
      hasMutatedLogsRef.current = true;
      setWorkoutLogs((prev) => {
        const current = prev[canonicalKey] || [];
        const removedItem = logId ? current.find((item) => item.id === logId) : current[idx];
        if (username && removedItem?.id) {
          recordDeletedLogTombstones(username, [removedItem.id]).catch(() => {});
        }
        const updated = current.filter((item, i) => (logId ? item.id !== logId : i !== idx));
        const nextLogs = { ...prev };
        if (updated.length > 0) {
          nextLogs[canonicalKey] = updated;
        } else {
          delete nextLogs[canonicalKey];
        }
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
    explicitResetRef.current = true;
    hasMutatedLogsRef.current = true;
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

  // Conta quantos registros de séries existem no escopo escolhido (prévia ao vivo antes de apagar)
  const countLogsInScope = useCallback(
    ({ period, workoutScope, targetMonth, workoutExerciseKeysByTab }) => {
      const now = new Date();
      let count = 0;
      Object.entries(workoutLogs).forEach(([canonicalKey, entries]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach((item) => {
          if (
            matchesLogScope(canonicalKey, item, {
              period,
              workoutScope,
              targetMonth: targetMonth || selectedMonth,
              workoutExerciseKeysByTab,
              now
            })
          ) {
            count += 1;
          }
        });
      });
      return count;
    },
    [workoutLogs, selectedMonth]
  );

  // Limpeza granular de histórico por período (Semana / Mês / Tudo) e treino (A / B / C / ALL)
  const deleteLogsInScope = useCallback(
    ({ period, workoutScope, targetMonth, workoutExerciseKeysByTab }) => {
      const month = targetMonth || selectedMonth;
      if (period === 'all') {
        const total = Object.values(workoutLogs).reduce(
          (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
          0
        );
        resetAllProgress();
        return total;
      }

      const now = new Date();
      const nowIso = now.toISOString();
      let removedCount = 0;
      const removedIds = [];
      const nextLogs = {};

      Object.entries(workoutLogs).forEach(([canonicalKey, entries]) => {
        if (!Array.isArray(entries)) return;
        const kept = entries.filter((item) => {
          const shouldRemove = matchesLogScope(canonicalKey, item, {
            period,
            workoutScope,
            targetMonth: month,
            workoutExerciseKeysByTab,
            now
          });
          if (shouldRemove) {
            removedCount += 1;
            if (item?.id) removedIds.push(item.id);
          }
          return !shouldRemove;
        });
        if (kept.length > 0) {
          nextLogs[canonicalKey] = kept;
        }
      });

      hasMutatedLogsRef.current = true;
      if (username && removedIds.length > 0) {
        recordDeletedLogTombstones(username, removedIds).catch(() => {});
      }
      setWorkoutLogs(nextLogs);

      // Também limpa os cards concluídos (verdinhas) e reinicia o contador da sessão no(s) treino(s) atingido(s)
      const affectedWorkouts = workoutScope === 'ALL' ? ['A', 'B', 'C'] : [workoutScope];
      setSessionV3((prev) => {
        const nextCompleted = { ...(prev.completedByScope || {}) };
        const nextStartedAt = { ...(prev.sessionStartedAtByScope || {}) };
        affectedWorkouts.forEach((w) => {
          const scopeKey = makeSessionScopeKey(month, w);
          nextCompleted[scopeKey] = [];
          nextStartedAt[scopeKey] = nowIso;
        });
        const nextSession = {
          ...prev,
          version: 3,
          activeWeekKey: getLocalIsoWeekKey(now),
          completedByScope: nextCompleted,
          sessionStartedAtByScope: nextStartedAt
        };
        if (username) saveUserSessionV3(username, nextSession);
        return nextSession;
      });

      return removedCount;
    },
    [workoutLogs, selectedMonth, username, resetAllProgress]
  );

  // Indica se há algum registro salvo na semana atual (mantém acesso ao botão Reiniciar mesmo sem verdinhos)
  const hasLogsInCurrentWeek = useMemo(() => {
    const now = new Date();
    return Object.entries(workoutLogs).some(([canonicalKey, entries]) => {
      if (!Array.isArray(entries)) return false;
      return entries.some((item) =>
        matchesLogScope(canonicalKey, item, {
          period: 'week',
          workoutScope: 'ALL',
          targetMonth: selectedMonth,
          now
        })
      );
    });
  }, [workoutLogs, selectedMonth]);

  const exportBackup = useCallback(() => {
    if (!username) return;
    exportUserBackup(username, workoutLogs, sessionV3, completedInCurrentScope);
    setBackupMeta({ lastExportedAt: new Date().toISOString(), logsSinceBackup: 0 });
  }, [username, workoutLogs, sessionV3, completedInCurrentScope]);

  const importBackupText = useCallback((jsonText) => {
    const imported = parseImportedBackup(jsonText);
    hasMutatedLogsRef.current = true;
    explicitResetRef.current = false;
    setWorkoutLogs((prev) => {
      const merged = { ...prev };
      Object.entries(imported.workoutLogs).forEach(([k, entries]) => {
        const combined = [...entries, ...(merged[k] || [])];
        const seen = new Set();
        merged[k] = combined
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .filter((item) => {
            const sig = `${item.date}_${item.weight}_${item.reps}_${item.setNumber || ''}`;
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
    countLogsInScope,
    deleteLogsInScope,
    hasLogsInCurrentWeek,
    exportBackup,
    importBackupText,
    summaryStats,
    storageStatus
  };
}
