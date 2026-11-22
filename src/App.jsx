import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { RefreshCw, Info, CheckCircle2, Undo2 } from 'lucide-react';
import {
  getCurrentMonthName,
  sortMonthsChronologically,
  isOptionalExercise,
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  parseRestSeconds,
  cleanAdvancedTechnique,
  buildExerciseRenderUnits
} from './utils/exerciseNormalizer';
import { findGlossaryEntriesForTechnique } from './utils/glossaryData';
import { getCurrentSession, logoutUser } from './services/authService';
import {
  loadUiScale,
  saveUiScale,
  loadScreensaverDelay,
  saveScreensaverDelay,
  loadAutoStartTimer,
  saveAutoStartTimer
} from './services/storageService';
import { useWorkoutsData } from './hooks/useWorkoutsData';
import { useWorkoutLogs } from './hooks/useWorkoutLogs';
import { useRestTimer } from './hooks/useRestTimer';
import { useFocusAutoDim } from './hooks/useFocusAutoDim';
import LoginScreen from './components/LoginScreen';
import HeaderBar from './components/HeaderBar';
import MonthAndGuidesBar from './components/MonthAndGuidesBar';
import WorkoutTabs from './components/WorkoutTabs';
import WorkoutFilters from './components/WorkoutFilters';
import ExerciseCard from './components/ExerciseCard';
import ExercisePairGroup from './components/ExercisePairGroup';
import ProfileDrawer from './components/ProfileDrawer';
import ConfirmResetModal from './components/ConfirmResetModal';
import ResultsModal from './components/ResultsModal';
import PrinciplesModal from './components/PrinciplesModal';
import FocusScreensaver from './components/FocusScreensaver';
import RestTimer from './components/RestTimer';

function AuthenticatedWorkspace({ currentUser, onLogout }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName());
  const [selectedWorkout, setSelectedWorkout] = useState('A');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('TODOS');
  const [hideOptionals, setHideOptionals] = useState(false);
  const [statusFilter, setStatusFilter] = useState('TODOS'); // 'TODOS' | 'PENDENTES'
  const [searchQuery, setSearchQuery] = useState('');

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [principlesState, setPrinciplesState] = useState({
    isOpen: false,
    section: null,
    highlightIds: [],
    contextLabel: ''
  });
  const [resetModalTab, setResetModalTab] = useState(null); // 'status' | 'history' | null

  const [uiScale, setUiScale] = useState(() => loadUiScale());
  const [screensaverDelay, setScreensaverDelay] = useState(() => loadScreensaverDelay());
  const [autoStartTimer, setAutoStartTimer] = useState(() => loadAutoStartTimer());
  const [focusedExercise, setFocusedExercise] = useState(null);
  const [isScreensaverOpen, setIsScreensaverOpen] = useState(false);
  const [autoDimPaused, setAutoDimPaused] = useState(false);

  // Mapa de refs dos cards para retorno preciso ao exercício em foco após sair do Modo Foco
  const exerciseCardRefs = useRef(new Map());

  const scrollToExerciseByRawName = useCallback((rawName) => {
    if (!rawName) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = exerciseCardRefs.current.get(rawName);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }, []);

  // Toast com suporte opcional a ação "Desfazer"
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, undoAction = null) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, undoAction });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, undoAction ? 4500 : 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const { rawData, loading, isOfflineFallback, syncWorkouts } = useWorkoutsData(true, showToast);
  const logs = useWorkoutLogs(currentUser.username, selectedMonth, selectedWorkout);
  const timer = useRestTimer();

  // Notifica discretamente quando a virada semanal automática (ISO-8601) limpar o ciclo anterior
  useEffect(() => {
    if (!logs.weekRolledOver) return;
    const id = setTimeout(() => {
      showToast('Nova semana iniciada! Treinos A, B e C prontos.');
    }, 150);
    return () => clearTimeout(id);
  }, [logs.weekRolledOver, showToast]);

  const availableMonths = useMemo(() => {
    const months = new Set(rawData.map((d) => d['Mês']?.trim()).filter(Boolean));
    return sortMonthsChronologically(Array.from(months));
  }, [rawData]);

  const effectiveMonth = useMemo(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      return availableMonths[0];
    }
    return selectedMonth;
  }, [availableMonths, selectedMonth]);

  const handleSelectMonth = (month) => {
    setSelectedMonth(month);
    setSelectedMuscleGroup('TODOS');
    setSearchQuery('');
    setFocusedExercise(null);
    setIsScreensaverOpen(false);
  };

  const handleSelectWorkout = (workout) => {
    setSelectedWorkout(workout);
    setSelectedMuscleGroup('TODOS');
    setSearchQuery('');
    setFocusedExercise(null);
    setIsScreensaverOpen(false);
  };

  const handleUiScaleChange = (newScale) => {
    setUiScale(newScale);
    saveUiScale(newScale);
  };

  const handleScreensaverDelayChange = (secs) => {
    setScreensaverDelay(secs);
    saveScreensaverDelay(secs);
  };

  const handleToggleAutoStartTimer = (enabled) => {
    setAutoStartTimer(enabled);
    saveAutoStartTimer(enabled);
  };

  const openPrinciplesSection = useCallback((section = null) => {
    setPrinciplesState({
      isOpen: true,
      section,
      highlightIds: [],
      contextLabel: ''
    });
  }, []);

  const openTechniqueHelp = useCallback((techniqueText) => {
    const matches = findGlossaryEntriesForTechnique(techniqueText);
    const highlightIds = matches.map((m) => m.id);
    setPrinciplesState({
      isOpen: true,
      section: highlightIds[0] || 'glossario',
      highlightIds,
      contextLabel: techniqueText
    });
  }, []);

  useFocusAutoDim({
    enabled: !autoDimPaused,
    focusedExercise,
    screensaverDelay,
    isScreensaverOpen,
    isBlockedByModal:
      principlesState.isOpen ||
      showResultsModal ||
      showUserMenu ||
      Boolean(resetModalTab),
    onTriggerScreensaver: () => setIsScreensaverOpen(true)
  });

  // Metadados das abas A / B / C (resumo muscular dinâmico + badge concluído)
  const workoutMetaByTab = useMemo(() => {
    const result = {};
    ['A', 'B', 'C'].forEach((w) => {
      const items = rawData.filter((item) => {
        const m = item['Mês']?.trim();
        const t = item['Treino']?.trim();
        return m === effectiveMonth && t && (t === w || t.includes(w));
      });
      const mandatory = items.filter((e) => !isOptionalExercise(e['Exercício']));
      const uniqueGroups = Array.from(
        new Set(items.map((e) => (e['Grupo muscular'] || '').trim()).filter(Boolean))
      );
      const musclesText =
        uniqueGroups.length > 2
          ? `${uniqueGroups.slice(0, 2).join(' + ')} +${uniqueGroups.length - 2}`
          : uniqueGroups.join(' + ');

      const completedKeys = logs.getCompletedForScope(effectiveMonth, w);
      const isDone =
        mandatory.length > 0 &&
        mandatory.every((e) => completedKeys.includes(getCanonicalExerciseKey(e['Exercício'])));

      result[w] = { musclesText, isDone };
    });
    return result;
  }, [rawData, effectiveMonth, logs]);

  // Mapa de chaves canônicas por treino (A/B/C) do mês atual para fallback de logs legados v1/v2
  const workoutExerciseKeysByTab = useMemo(() => {
    const map = { A: new Set(), B: new Set(), C: new Set() };
    ['A', 'B', 'C'].forEach((w) => {
      rawData.forEach((item) => {
        const m = item['Mês']?.trim();
        const t = item['Treino']?.trim();
        if (m === effectiveMonth && t && (t === w || t.includes(w))) {
          map[w].add(getCanonicalExerciseKey(item['Exercício']));
        }
      });
    });
    return map;
  }, [rawData, effectiveMonth]);

  // Exercícios do mês e treino selecionados
  const baseWorkoutExercises = useMemo(() => {
    return rawData.filter((item) => {
      const itemMonth = item['Mês']?.trim();
      const itemWorkout = item['Treino']?.trim();
      const isMonthMatch = itemMonth === effectiveMonth;
      const isWorkoutMatch =
        itemWorkout && (itemWorkout === selectedWorkout || itemWorkout.includes(selectedWorkout));
      return isMonthMatch && isWorkoutMatch;
    });
  }, [rawData, effectiveMonth, selectedWorkout]);

  // Contagem por grupo muscular (considera ocultação de opcionais)
  const visibleBaseForGroups = useMemo(() => {
    return hideOptionals
      ? baseWorkoutExercises.filter((e) => !isOptionalExercise(e['Exercício']))
      : baseWorkoutExercises;
  }, [baseWorkoutExercises, hideOptionals]);

  const muscleGroupsWithCount = useMemo(() => {
    const counts = new Map();
    visibleBaseForGroups.forEach((e) => {
      const g = (e['Grupo muscular'] || '').trim();
      if (g) counts.set(g, (counts.get(g) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([group, count]) => ({ group, count }));
  }, [visibleBaseForGroups]);

  // Estatísticas de progresso da sessão atual (escopo Mês::Treino)
  const progressStats = useMemo(() => {
    const total = baseWorkoutExercises.length;
    const mandatory = baseWorkoutExercises.filter((e) => !isOptionalExercise(e['Exercício']));
    const completedTotal = baseWorkoutExercises.filter((e) =>
      logs.completedInCurrentScope.includes(getCanonicalExerciseKey(e['Exercício']))
    ).length;
    const completedMandatory = mandatory.filter((e) =>
      logs.completedInCurrentScope.includes(getCanonicalExerciseKey(e['Exercício']))
    ).length;

    return {
      total,
      mandatoryCount: mandatory.length,
      optionalCount: total - mandatory.length,
      completedTotal,
      completedMandatory
    };
  }, [baseWorkoutExercises, logs.completedInCurrentScope]);

  // Lista filtrada e unidades de renderização (agrupa pares conectados 1/2 -> 2/2 mantendo o par unido)
  const filteredExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return baseWorkoutExercises.filter((item) => {
      if (hideOptionals && isOptionalExercise(item['Exercício'])) return false;
      if (selectedMuscleGroup !== 'TODOS' && item['Grupo muscular'] !== selectedMuscleGroup) {
        return false;
      }
      if (statusFilter === 'PENDENTES') {
        const key = getCanonicalExerciseKey(item['Exercício']);
        if (logs.completedInCurrentScope.includes(key)) return false;
      }
      if (q) {
        const haystack = [
          item['Exercício'],
          item['Grupo muscular'],
          item['Especificação do grupo muscular'],
          item['Técnica Avançada'],
          item['Conexão']
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    baseWorkoutExercises,
    hideOptionals,
    selectedMuscleGroup,
    statusFilter,
    searchQuery,
    logs.completedInCurrentScope
  ]);

  const exerciseRenderUnits = useMemo(
    () => buildExerciseRenderUnits(filteredExercises, logs.completedInCurrentScope),
    [filteredExercises, logs.completedInCurrentScope]
  );

  // Mapa rápido de metadados de par para cada exercício visível conectado (usado no card, auto-timer e Modo Foco)
  const activePairMetaByRawName = useMemo(() => {
    const map = new Map();
    exerciseRenderUnits.forEach((unit) => {
      if (unit.type !== 'pair' || unit.exercises.length < 2) return;
      const [firstEx, secondEx] = unit.exercises;
      const [firstConn, secondConn] = unit.connections;
      const firstRaw = firstEx['Exercício'] || '';
      const secondRaw = secondEx['Exercício'] || '';

      map.set(firstRaw, {
        pairId: unit.pairId,
        pairType: unit.pairType,
        step: firstConn.step,
        total: firstConn.total,
        partnerExercise: secondEx,
        partnerName: getDisplayExerciseName(secondRaw)
      });
      map.set(secondRaw, {
        pairId: unit.pairId,
        pairType: unit.pairType,
        step: secondConn.step,
        total: secondConn.total,
        partnerExercise: firstEx,
        partnerName: getDisplayExerciseName(firstRaw)
      });
    });
    return map;
  }, [exerciseRenderUnits]);

  const handleSaveSet = (
    canonicalKey,
    displayTitle,
    weight,
    reps,
    restSeconds,
    exerciseObj,
    options = {}
  ) => {
    const saved = logs.logSet(canonicalKey, displayTitle, weight, reps);
    if (!saved) return null;

    const pairMeta = exerciseObj ? activePairMetaByRawName.get(exerciseObj['Exercício'] || '') : null;
    const isPairFirstStep = Boolean(pairMeta && pairMeta.step === 1 && pairMeta.partnerExercise);

    setFocusedExercise(isPairFirstStep && !options.suppressTimerAndToast ? pairMeta.partnerExercise : exerciseObj);
    setAutoDimPaused(false);

    if (!options.suppressTimerAndToast) {
      if (isPairFirstStep) {
        // Exercício 1/2 de um par: 0s de descanso -> orienta ir direto ao 2/2 e centraliza nele
        showToast(`Série #${saved.setNumber} salva • Vá direto p/ 2/2: ${pairMeta.partnerName} (0s)!`);
        scrollToExerciseByRawName(pairMeta.partnerExercise['Exercício']);
      } else if (autoStartTimer) {
        timer.startTimer(restSeconds, true, displayTitle);
        showToast(`Série #${saved.setNumber} salva • Descanso ${restSeconds}s iniciado!`);
      } else {
        showToast(`Série #${saved.setNumber} salva (${saved.weight}kg)!`);
      }
    }
    return saved;
  };

  const handleToggleComplete = (canonicalKey, displayTitle) => {
    const becameCompleted = logs.toggleComplete(canonicalKey);
    if (becameCompleted) {
      showToast(`${displayTitle} concluído`, () => {
        logs.toggleComplete(canonicalKey);
        setToast(null);
      });
    }
  };

  const handleDeleteLog = (canonicalKey, logId, idx) => {
    logs.deleteLog(canonicalKey, logId, idx);
    showToast('Registro removido do histórico.');
  };

  const handleImportBackupFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        logs.importBackupText(ev.target.result);
        showToast('Backup importado com sucesso!');
      } catch {
        showToast('Arquivo JSON inválido. Verifique se é um backup do IronTracker.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmWorkoutReset = () => {
    logs.resetCurrentWorkoutStatus();
    setResetModalTab(null);
    showToast(`Treino ${selectedWorkout} reiniciado (histórico preservado)!`);
  };

  const handleConfirmWeekReset = () => {
    logs.resetMonthWeekStatus(effectiveMonth);
    setResetModalTab(null);
    showToast(`Nova semana iniciada em ${effectiveMonth} (A, B e C)!`);
  };

  const handleConfirmDeleteHistory = ({ period, workoutScope }) => {
    const removed = logs.deleteLogsInScope({
      period,
      workoutScope,
      targetMonth: effectiveMonth,
      workoutExerciseKeysByTab
    });
    setResetModalTab(null);
    if (period === 'all') {
      showToast('Todo o progresso foi resetado!');
    } else {
      const scopeDesc =
        workoutScope === 'ALL' ? 'A+B+C' : `Treino ${workoutScope}`;
      const periodDesc = period === 'week' ? 'Semana atual' : effectiveMonth;
      showToast(
        `${removed} ${removed === 1 ? 'registro apagado' : 'registros apagados'} (${scopeDesc} • ${periodDesc}).`
      );
    }
  };

  const handleExitFocusMode = (completedOnExit = false) => {
    const prevRawName = focusedExercise?.['Exercício'] || '';
    setIsScreensaverOpen(false);
    // Pausa o auto-dim após saída explícita para não "puxar" o usuário de volta 20s depois
    setAutoDimPaused(true);

    if (completedOnExit) {
      const nextPending = filteredExercises.find((ex) => {
        const exRaw = ex['Exercício'] || '';
        if (exRaw === prevRawName) return false;
        return !logs.completedInCurrentScope.includes(getCanonicalExerciseKey(exRaw));
      });
      if (nextPending) {
        setFocusedExercise(nextPending);
        scrollToExerciseByRawName(nextPending['Exercício']);
      } else {
        setFocusedExercise(null);
      }
      return;
    }

    // Retorno normal: mantém o exercício em foco e centraliza o card na tela principal
    if (prevRawName) {
      scrollToExerciseByRawName(prevRawName);
    }
  };

  const hasCurrentWorkoutProgress = useMemo(() => {
    if (progressStats.completedTotal > 0) return true;
    return baseWorkoutExercises.some(
      (ex) => logs.getTodaySetsCount(getCanonicalExerciseKey(ex['Exercício'])) > 0
    );
  }, [progressStats.completedTotal, baseWorkoutExercises, logs]);

  const hasAnyWeekProgress =
    logs.hasAnyWeekProgressForMonth(effectiveMonth) || logs.hasLogsInCurrentWeek;

  const hasBackupAlert =
    (logs.backupMeta?.logsSinceBackup || 0) >= 10 ||
    (logs.summaryStats.totalLogs >= 10 && !logs.backupMeta?.lastExportedAt);

  if (loading && rawData.length === 0) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-zinc-100">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">Carregando periodização anual...</p>
        </div>
      </div>
    );
  }

  const focusedLastLog = focusedExercise
    ? (logs.workoutLogs[getCanonicalExerciseKey(focusedExercise['Exercício'])] || [])[0] || null
    : null;

  return (
    <div className="min-h-[100dvh] bg-black font-sans text-zinc-100">
      {/* Toast Notification com suporte a "Desfazer" */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-50 max-w-[92vw] bg-zinc-900 border border-zinc-700 text-zinc-100 px-3.5 py-2 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2.5 ui-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{toast.message}</span>
          {toast.undoAction && (
            <button
              type="button"
              onClick={toast.undoAction}
              className="min-h-[34px] px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-300 font-bold flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          )}
        </div>
      )}

      {/* Header enxuto de 1 linha fixa (~56px + safe-area) */}
      <HeaderBar
        currentUser={currentUser}
        selectedMonth={effectiveMonth}
        isOfflineFallback={isOfflineFallback}
        loading={loading}
        showUserMenu={showUserMenu}
        onSync={syncWorkouts}
        onToggleUserMenu={() => setShowUserMenu((prev) => !prev)}
        onOpenResults={() => setShowResultsModal(true)}
        hasBackupAlert={hasBackupAlert}
      />

      {/* Barra rolável de Mês + Guia + Princípios (não ocupa espaço fixo durante o treino) */}
      <MonthAndGuidesBar
        availableMonths={availableMonths}
        selectedMonth={effectiveMonth}
        onSelectMonth={handleSelectMonth}
        onOpenMonthGuide={() => openPrinciplesSection('guia-mes')}
        onOpenPrinciples={() => openPrinciplesSection(null)}
        uiScale={uiScale}
      />

      {/* Conteúdo Principal com padding inferior dinâmico para nunca colidir com o RestTimer (Item 5.1) */}
      <main
        className={`max-w-md mx-auto px-3 pt-3.5 ${
          timer.isOpen
            ? 'pb-[calc(19.5rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]'
        }`}
      >
        <WorkoutTabs
          selectedWorkout={selectedWorkout}
          onSelectWorkout={handleSelectWorkout}
          workoutMetaByTab={workoutMetaByTab}
        />

        <WorkoutFilters
          selectedWorkout={selectedWorkout}
          progressStats={progressStats}
          hasCurrentWorkoutProgress={hasCurrentWorkoutProgress}
          hasAnyWeekProgress={hasAnyWeekProgress}
          onRequestResetStatus={() => setResetModalTab('status')}
          hideOptionals={hideOptionals}
          onToggleHideOptionals={() => setHideOptionals((prev) => !prev)}
          muscleGroupsWithCount={muscleGroupsWithCount}
          selectedMuscleGroup={selectedMuscleGroup}
          onSelectMuscleGroup={setSelectedMuscleGroup}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          totalBaseCount={visibleBaseForGroups.length}
          uiScale={uiScale}
        />

        {/* Lista de Exercícios (cards individuais e blocos conectados de pares 1/2 -> 2/2) */}
        <div>
          {exerciseRenderUnits.length > 0 ? (
            exerciseRenderUnits.map((unit) => {
              const renderCard = (exercise) => {
                const rawName = exercise['Exercício'] || '';
                const canonicalKey = getCanonicalExerciseKey(rawName);
                const rawPairMeta = activePairMetaByRawName.get(rawName) || null;
                const pairMeta = rawPairMeta
                  ? {
                      ...rawPairMeta,
                      onJumpToPartner: () => {
                        setFocusedExercise(rawPairMeta.partnerExercise);
                        setAutoDimPaused(false);
                        scrollToExerciseByRawName(rawPairMeta.partnerExercise['Exercício']);
                      }
                    }
                  : null;

                return (
                  <ExerciseCard
                    key={`${effectiveMonth}-${selectedWorkout}-${rawName}`}
                    cardRef={(el) => {
                      if (el) exerciseCardRefs.current.set(rawName, el);
                      else exerciseCardRefs.current.delete(rawName);
                    }}
                    pairMeta={pairMeta}
                    data={exercise}
                    onSaveSet={handleSaveSet}
                    onToggleComplete={handleToggleComplete}
                    onDeleteLog={handleDeleteLog}
                    onTriggerTimer={(seconds, exObj, title) => {
                      setFocusedExercise(exObj);
                      setAutoDimPaused(false);
                      timer.startTimer(seconds, true, title);
                    }}
                    onOpenScreensaver={(exObj, restSeconds) => {
                      setFocusedExercise(exObj);
                      setAutoDimPaused(false);
                      const title = getDisplayExerciseName(exObj['Exercício']);
                      timer.prepareTimer(restSeconds, title);
                      setIsScreensaverOpen(true);
                    }}
                    onOpenPrincipleSection={openPrinciplesSection}
                    onOpenTechniqueHelp={openTechniqueHelp}
                    isFocused={
                      Boolean(focusedExercise) && focusedExercise['Exercício'] === rawName
                    }
                    history={logs.workoutLogs[canonicalKey] || []}
                    todaySetsCount={logs.getTodaySetsCount(canonicalKey)}
                    isCompleted={logs.completedInCurrentScope.includes(canonicalKey)}
                    uiScale={uiScale}
                  />
                );
              };

              if (unit.type === 'pair') {
                return (
                  <ExercisePairGroup
                    key={`${effectiveMonth}-${selectedWorkout}-${unit.pairId}`}
                    pairId={unit.pairId}
                    pairType={unit.pairType}
                    allCompleted={unit.allCompleted}
                    onOpenTechniqueHelp={openTechniqueHelp}
                  >
                    {unit.exercises.map(renderCard)}
                  </ExercisePairGroup>
                );
              }

              return renderCard(unit.exercise);
            })
          ) : (
            <div className="text-center py-10 px-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-3">
              <div className="bg-zinc-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-zinc-100 font-bold text-sm">Nenhum exercício exibido</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Nenhum exercício corresponde aos filtros ativos no Treino {selectedWorkout} de {effectiveMonth}.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {selectedMuscleGroup !== 'TODOS' && (
                  <button
                    type="button"
                    onClick={() => setSelectedMuscleGroup('TODOS')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Mostrar todos os grupos
                  </button>
                )}
                {hideOptionals && (
                  <button
                    type="button"
                    onClick={() => setHideOptionals(false)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-purple-950 border border-purple-700 text-purple-200 text-xs font-bold cursor-pointer"
                  >
                    Reexibir opcionais
                  </button>
                )}
                {statusFilter !== 'TODOS' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('TODOS')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
                  >
                    Exibir concluídos
                  </button>
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="mt-6 text-center pb-4">
          <p className="text-xs text-zinc-500">
            Progresso salvo localmente para <strong className="text-zinc-400">@{currentUser.username}</strong>.
          </p>
        </footer>
      </main>

      {/* Bottom Sheet de Perfil e Preferências */}
      <ProfileDrawer
        isOpen={showUserMenu}
        onClose={() => setShowUserMenu(false)}
        currentUser={currentUser}
        summaryStats={logs.summaryStats}
        backupMeta={logs.backupMeta}
        uiScale={uiScale}
        onUiScaleChange={handleUiScaleChange}
        screensaverDelay={screensaverDelay}
        onScreensaverDelayChange={handleScreensaverDelayChange}
        autoStartTimer={autoStartTimer}
        onToggleAutoStartTimer={handleToggleAutoStartTimer}
        onOpenResults={() => setShowResultsModal(true)}
        onExportBackup={() => {
          logs.exportBackup();
          showToast('Backup JSON exportado!');
        }}
        onImportBackupFile={handleImportBackupFile}
        onRequestResetSession={() => setResetModalTab('status')}
        onRequestFullReset={() => setResetModalTab('history')}
        onLogout={onLogout}
      />

      {/* Modal de Resultados & PRs */}
      <ResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        currentUser={currentUser}
        summaryStats={logs.summaryStats}
        backupMeta={logs.backupMeta}
        onExportBackup={() => {
          logs.exportBackup();
          showToast('Backup JSON exportado!');
        }}
      />

      {/* Modal Unificado de Reinício de Status (Aba 1) e Limpeza Granular de Histórico (Aba 2) */}
      <ConfirmResetModal
        key={`${resetModalTab || 'closed'}-${selectedWorkout}`}
        initialTab={resetModalTab}
        username={currentUser.username}
        selectedMonth={effectiveMonth}
        selectedWorkout={selectedWorkout}
        workoutExerciseKeysByTab={workoutExerciseKeysByTab}
        countLogsInScope={logs.countLogsInScope}
        onBackupFirst={() => {
          logs.exportBackup();
          showToast('Backup salvo por segurança!');
        }}
        onConfirmWorkoutReset={handleConfirmWorkoutReset}
        onConfirmWeekReset={handleConfirmWeekReset}
        onConfirmDeleteHistory={handleConfirmDeleteHistory}
        onCancel={() => setResetModalTab(null)}
      />

      {/* Modal de Princípios, Guia Offline do Mês e Glossário com Deep-Link Exato */}
      <PrinciplesModal
        key={principlesState.isOpen ? `${principlesState.section || 'top'}-${principlesState.contextLabel}` : 'principles-closed'}
        isOpen={principlesState.isOpen}
        onClose={() =>
          setPrinciplesState({
            isOpen: false,
            section: null,
            highlightIds: [],
            contextLabel: ''
          })
        }
        initialSection={principlesState.section}
        highlightIds={principlesState.highlightIds}
        contextLabel={principlesState.contextLabel}
        selectedMonth={effectiveMonth}
      />

      {/* Modo Foco OLED (Screensaver Interativo com registro de série e troca de par 1/2 <-> 2/2) */}
      <FocusScreensaver
        key={isScreensaverOpen && focusedExercise ? `${focusedExercise['Exercício']}-open` : 'focus-idle'}
        isOpen={isScreensaverOpen}
        exercise={focusedExercise}
        pairContext={(() => {
          const rawMeta = focusedExercise
            ? activePairMetaByRawName.get(focusedExercise['Exercício'] || '')
            : null;
          if (!rawMeta || !rawMeta.partnerExercise) return null;
          return {
            ...rawMeta,
            onSwitchToPartner: () => {
              const partner = rawMeta.partnerExercise;
              const partnerTitle = getDisplayExerciseName(partner['Exercício']);
              const partnerTech = cleanAdvancedTechnique(partner['Técnica Avançada']);
              const partnerRest = parseRestSeconds(
                partner['Descanso'],
                partnerTech,
                partner['Grupo muscular']
              );
              setFocusedExercise(partner);
              timer.prepareTimer(partnerRest, partnerTitle);
            }
          };
        })()}
        lastLog={focusedLastLog}
        todaySetsCount={
          focusedExercise
            ? logs.getTodaySetsCount(getCanonicalExerciseKey(focusedExercise['Exercício']))
            : 0
        }
        isCompleted={
          focusedExercise
            ? logs.completedInCurrentScope.includes(getCanonicalExerciseKey(focusedExercise['Exercício']))
            : false
        }
        timer={timer}
        onSaveSet={(canonicalKey, displayTitle, weight, reps, restSeconds, exerciseObj) =>
          handleSaveSet(canonicalKey, displayTitle, weight, reps, restSeconds, exerciseObj, {
            suppressTimerAndToast: true
          })
        }
        onToggleComplete={handleToggleComplete}
        onExit={handleExitFocusMode}
      />

      {/* Cronômetro de Descanso Flutuante */}
      {!isScreensaverOpen && <RestTimer timer={timer} />}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = getCurrentSession();
    return session ? session.user : null;
  });

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <AuthenticatedWorkspace
      key={currentUser.username}
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}
