import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Dumbbell,
  Calendar,
  ChevronDown,
  Info,
  RefreshCw,
  FileText,
  RotateCcw,
  LogOut,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  User,
  BookOpen,
  Trash2,
  AlertTriangle,
  Type
} from 'lucide-react';
import { INITIAL_CSV_DATA } from './data/fallbackWorkouts';
import {
  MONTHLY_DOCS,
  getCurrentMonthName,
  sortMonthsChronologically,
  isOptionalExercise,
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  parseCSV
} from './utils/exerciseNormalizer';
import { getCurrentSession, logoutUser } from './services/authService';
import {
  loadUserWorkoutLogs,
  saveUserWorkoutLogs,
  loadUserCompletedSession,
  saveUserCompletedSession,
  exportUserBackup,
  parseImportedBackup,
  resetAllUserProgress,
  loadUiScale,
  saveUiScale
} from './services/storageService';
import LoginScreen from './components/LoginScreen';
import ExerciseCard from './components/ExerciseCard';
import RestTimer from './components/RestTimer';
import PrinciplesModal from './components/PrinciplesModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const session = getCurrentSession();
    return session ? session.user : null;
  });

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthName());
  const [selectedWorkout, setSelectedWorkout] = useState('A');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('TODOS');
  const [hideOptionals, setHideOptionals] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPrinciplesModal, setShowPrinciplesModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [uiScale, setUiScale] = useState(() => loadUiScale());

  const handleUiScaleChange = (newScale) => {
    setUiScale(newScale);
    saveUiScale(newScale);
  };

  // Histórico e Sessão por usuário logado
  const [workoutLogs, setWorkoutLogs] = useState({});
  const [completedExercises, setCompletedExercises] = useState([]);
  const [timerTrigger, setTimerTrigger] = useState(null);
  const fileInputRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  // Carrega dados do usuário quando loga
  useEffect(() => {
    if (!currentUser) return;
    setWorkoutLogs(loadUserWorkoutLogs(currentUser.username));
    setCompletedExercises(loadUserCompletedSession(currentUser.username));
  }, [currentUser]);

  // Salva dados do usuário quando alterados
  useEffect(() => {
    if (!currentUser) return;
    saveUserWorkoutLogs(currentUser.username, workoutLogs);
  }, [workoutLogs, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    saveUserCompletedSession(currentUser.username, completedExercises);
  }, [completedExercises, currentUser]);

  // Carrega planilha via rota serverless com cache (/api/workouts) + fallback offline
  const loadWorkoutsData = useCallback(async (isManualSync = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workouts');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setRawData(parsed);
        setIsOfflineFallback(false);
        if (isManualSync) showToast('Planilha sincronizada com sucesso!');
      } else {
        throw new Error('CSV vazio');
      }
    } catch (err) {
      console.warn('Usando dados de backup offline:', err);
      const parsed = parseCSV(INITIAL_CSV_DATA);
      setRawData(parsed);
      setIsOfflineFallback(true);
      if (isManualSync) showToast('Modo offline: usando base local.');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (currentUser) {
      loadWorkoutsData(false);
    }
  }, [currentUser, loadWorkoutsData]);

  // Meses ordenados cronologicamente (Janeiro -> Dezembro)
  const availableMonths = useMemo(() => {
    const months = new Set(rawData.map(d => d['Mês']?.trim()).filter(Boolean));
    return sortMonthsChronologically(Array.from(months));
  }, [rawData]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Reseta filtro de grupo muscular ao trocar mês ou treino
  useEffect(() => {
    setSelectedMuscleGroup('TODOS');
  }, [selectedMonth, selectedWorkout]);

  // Exercícios do mês e treino selecionados (antes do filtro de grupo/opcional)
  const baseWorkoutExercises = useMemo(() => {
    return rawData.filter((item) => {
      const itemMonth = item['Mês']?.trim();
      const itemWorkout = item['Treino']?.trim();
      const isMonthMatch = itemMonth === selectedMonth;
      const isWorkoutMatch =
        itemWorkout && (itemWorkout === selectedWorkout || itemWorkout.includes(selectedWorkout));
      return isMonthMatch && isWorkoutMatch;
    });
  }, [rawData, selectedMonth, selectedWorkout]);

  // Grupos musculares disponíveis no treino atual
  const workoutMuscleGroups = useMemo(() => {
    const groups = new Set(baseWorkoutExercises.map(e => (e['Grupo muscular'] || '').trim()).filter(Boolean));
    return Array.from(groups).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [baseWorkoutExercises]);

  // Estatísticas de progresso do treino atual
  const progressStats = useMemo(() => {
    const total = baseWorkoutExercises.length;
    const mandatory = baseWorkoutExercises.filter(e => !isOptionalExercise(e['Exercício']));
    const completedTotal = baseWorkoutExercises.filter(e =>
      completedExercises.includes(getCanonicalExerciseKey(e['Exercício']))
    ).length;
    const completedMandatory = mandatory.filter(e =>
      completedExercises.includes(getCanonicalExerciseKey(e['Exercício']))
    ).length;

    const pct = total > 0 ? Math.round((completedTotal / total) * 100) : 0;
    return {
      total,
      mandatoryCount: mandatory.length,
      optionalCount: total - mandatory.length,
      completedTotal,
      completedMandatory,
      pct
    };
  }, [baseWorkoutExercises, completedExercises]);

  // Exercícios filtrados e ordenados
  const filteredExercises = useMemo(() => {
    const filtered = baseWorkoutExercises.filter((item) => {
      if (hideOptionals && isOptionalExercise(item['Exercício'])) return false;
      if (selectedMuscleGroup !== 'TODOS' && item['Grupo muscular'] !== selectedMuscleGroup) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const keyA = getCanonicalExerciseKey(a['Exercício']);
      const keyB = getCanonicalExerciseKey(b['Exercício']);

      // Critério 0: Concluídos vão para o final
      const isCompletedA = completedExercises.includes(keyA);
      const isCompletedB = completedExercises.includes(keyB);
      if (isCompletedA !== isCompletedB) {
        return isCompletedA ? 1 : -1;
      }

      // Critério 1: Grupo Muscular (A-Z)
      const groupA = (a['Grupo muscular'] || '').trim();
      const groupB = (b['Grupo muscular'] || '').trim();
      const compareGroup = groupA.localeCompare(groupB, 'pt-BR');
      if (compareGroup !== 0) return compareGroup;

      // Critério 2: Obrigatórios antes dos Opcionais dentro do mesmo grupo
      const optA = isOptionalExercise(a['Exercício']);
      const optB = isOptionalExercise(b['Exercício']);
      if (optA !== optB) return optA ? 1 : -1;

      // Critério 3: Nome do Exercício (A-Z)
      const cleanNameA = getDisplayExerciseName(a['Exercício']);
      const cleanNameB = getDisplayExerciseName(b['Exercício']);
      return cleanNameA.localeCompare(cleanNameB, 'pt-BR');
    });
  }, [baseWorkoutExercises, hideOptionals, selectedMuscleGroup, completedExercises]);

  const handleSaveLog = (canonicalKey, displayTitle, weight, reps) => {
    const newLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      weight: String(weight),
      reps: reps ? String(reps) : '',
      exerciseLabel: displayTitle
    };

    setWorkoutLogs((prev) => {
      const currentLogs = prev[canonicalKey] || [];
      return { ...prev, [canonicalKey]: [newLog, ...currentLogs] };
    });

    setCompletedExercises((prev) => {
      if (!prev.includes(canonicalKey)) {
        return [...prev, canonicalKey];
      }
      return prev;
    });
  };

  const handleToggleComplete = (canonicalKey) => {
    setCompletedExercises((prev) =>
      prev.includes(canonicalKey)
        ? prev.filter((k) => k !== canonicalKey)
        : [...prev, canonicalKey]
    );
  };

  const handleDeleteLog = (canonicalKey, logId, idx) => {
    setWorkoutLogs((prev) => {
      const current = prev[canonicalKey] || [];
      const updated = current.filter((item, i) => (logId ? item.id !== logId : i !== idx));
      return { ...prev, [canonicalKey]: updated };
    });
    showToast('Registro removido do histórico.');
  };

  const handleResetSession = () => {
    if (window.confirm('Deseja iniciar uma nova sessão? Isso reabrirá todos os exercícios concluídos hoje.')) {
      setCompletedExercises([]);
      showToast('Nova sessão iniciada!');
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setShowUserMenu(false);
  };

  const handleConfirmFullReset = () => {
    if (!currentUser) return;
    resetAllUserProgress(currentUser.username);
    setWorkoutLogs({});
    setCompletedExercises([]);
    setShowResetConfirmModal(false);
    showToast('Todo o progresso foi resetado!');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const importedLogs = parseImportedBackup(ev.target.result);
        setWorkoutLogs((prev) => {
          const merged = { ...prev };
          Object.entries(importedLogs).forEach(([k, entries]) => {
            merged[k] = [...entries, ...(merged[k] || [])];
          });
          return merged;
        });
        showToast('Backup importado com sucesso!');
        setShowUserMenu(false);
      } catch {
        alert('Não foi possível importar o arquivo. Verifique se é um JSON válido do IronTracker.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Se não estiver autenticado, exibe tela de login
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  if (loading && rawData.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Carregando periodização anual...</p>
        </div>
      </div>
    );
  }

  const currentDocLink = MONTHLY_DOCS[selectedMonth];

  return (
    <div className="min-h-screen bg-slate-950 pb-24 font-sans text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-700 text-slate-100 px-4 py-2 rounded-full shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-slate-900/95 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-slate-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-600/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg leading-none tracking-tight text-white">IronTracker</h1>
                {isOfflineFallback && (
                  <span className="text-[0.6rem] bg-amber-950 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded font-bold uppercase">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-[0.65rem] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Hipertrofia Anual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 relative">
            {/* Botão Resetar Sessão */}
            <button
              onClick={handleResetSession}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Nova Sessão (Reabrir Exercícios)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Botão Sincronizar Planilha */}
            <button
              onClick={() => loadWorkoutsData(true)}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Sincronizar Planilha"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Botão Perfil / Menu do Usuário */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              title="Conta e Backup"
            >
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span className="max-w-[85px] truncate">{currentUser.name.split(' ')[0]}</span>
            </button>

            {/* Dropdown do Usuário */}
            {showUserMenu && (
              <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-40">
                <div className="px-2.5 py-2 border-b border-slate-800 mb-2">
                  <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                  <div className="text-[0.65rem] text-slate-400 uppercase tracking-wider">
                    @{currentUser.username} • {currentUser.role}
                  </div>
                </div>

                {/* Controle de Tamanho de Fonte e Elementos */}
                <div className="px-2 py-2 mb-1.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-1.5 text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <Type className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tamanho da Fonte / Interface</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'normal', label: 'A', desc: 'Padrão' },
                      { id: 'large', label: 'A+', desc: 'Médio' },
                      { id: 'xlarge', label: 'A++', desc: 'Grande' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleUiScaleChange(opt.id)}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                          uiScale === opt.id
                            ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-xs font-extrabold leading-none">{opt.label}</div>
                        <div className="text-[0.6rem] opacity-80 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    exportUserBackup(currentUser.username, workoutLogs, completedExercises);
                    setShowUserMenu(false);
                    showToast('Backup exportado!');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  Exportar Histórico (JSON)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Importar Histórico (JSON)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowResetConfirmModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-400 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Resetar Todo o Progresso
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair da Conta
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Seletor de Mês, Link do Guia & Botão Princípios (Relayout Adaptativo em Fonte Grande) */}
        <div
          className={`max-w-md mx-auto px-4 py-2.5 border-t border-slate-800/80 ${
            uiScale === 'xlarge' ? 'space-y-2' : 'flex items-center gap-2'
          }`}
        >
          <div className="relative flex-1 min-w-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-9 pr-7 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer truncate"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className={uiScale === 'xlarge' ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-2 flex-shrink-0'}>
            {currentDocLink && (
              <a
                href={currentDocLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-950/60 text-blue-300 border border-blue-800/70 rounded-xl text-xs font-bold hover:bg-blue-900/50 transition-colors flex-shrink-0"
                title={`Ler Guia Completo de ${selectedMonth}`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{uiScale === 'xlarge' ? `Guia de ${selectedMonth}` : 'Guia'}</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowPrinciplesModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-950/60 text-amber-300 border border-amber-700/70 rounded-xl text-xs font-bold hover:bg-amber-900/50 hover:text-amber-200 transition-colors flex-shrink-0 cursor-pointer shadow-sm"
              title="Princípios Básicos da Hipertrofia"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Princípios</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Abas de Treino A / B / C */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800 mb-3">
          {['A', 'B', 'C'].map((workout) => (
            <button
              key={workout}
              onClick={() => setSelectedWorkout(workout)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                selectedWorkout === workout
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              Treino {workout}
            </button>
          ))}
        </div>

        {/* Barra de Progresso da Sessão */}
        {progressStats.total > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300">
                Progresso do Treino {selectedWorkout}
              </span>
              <span className="font-bold text-blue-400">
                {progressStats.completedTotal}/{progressStats.total} concluídos ({progressStats.pct}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressStats.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressStats.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[0.7rem] text-slate-400 mt-1.5">
              <span>
                Obrigatórios: <strong className="text-slate-200">{progressStats.completedMandatory}/{progressStats.mandatoryCount}</strong>
              </span>
              {progressStats.optionalCount > 0 && (
                <button
                  type="button"
                  onClick={() => setHideOptionals(!hideOptionals)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.65rem] font-bold border transition-colors cursor-pointer ${
                    hideOptionals
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {hideOptionals ? `Mostrar Opcionais (${progressStats.optionalCount})` : 'Ocultar Opcionais'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Chips de Filtro Rápido por Grupo Muscular */}
        {workoutMuscleGroups.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
            <button
              onClick={() => setSelectedMuscleGroup('TODOS')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                selectedMuscleGroup === 'TODOS'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              Todos ({baseWorkoutExercises.length})
            </button>
            {workoutMuscleGroups.map((group) => (
              <button
                key={group}
                onClick={() => setSelectedMuscleGroup(group)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                  selectedMuscleGroup === group
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        )}

        {/* Lista de Exercícios */}
        <div className="space-y-4">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((exercise, idx) => {
              const canonicalKey = getCanonicalExerciseKey(exercise['Exercício']);
              return (
                <ExerciseCard
                  key={`${canonicalKey}-${idx}`}
                  data={exercise}
                  onSaveLog={handleSaveLog}
                  onToggleComplete={handleToggleComplete}
                  onDeleteLog={handleDeleteLog}
                  onTriggerTimer={(seconds) => setTimerTrigger({ seconds, timestamp: Date.now() })}
                  history={workoutLogs[canonicalKey] || []}
                  isCompleted={completedExercises.includes(canonicalKey)}
                  uiScale={uiScale}
                />
              );
            })
          ) : (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="bg-slate-800 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
                <Info className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-slate-200 font-bold text-sm">Nenhum exercício exibido</h3>
              <p className="text-xs text-slate-400 mt-1 px-6">
                Não há exercícios para o filtro atual no Treino {selectedWorkout} de {selectedMonth}.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center pb-8">
          <p className="text-xs text-slate-500">
            Progresso salvo para <strong className="text-slate-400">@{currentUser.username}</strong> neste dispositivo.
          </p>
        </div>
      </main>

      {/* Modal de Confirmação de Reset de Todo o Progresso */}
      {showResetConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-950 border border-red-800/70 p-2.5 rounded-xl text-red-400 flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white leading-tight">
                  Resetar Todo o Progresso?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Conta: @{currentUser.username}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Esta ação apagará <strong className="text-red-300">todo o histórico de cargas registradas</strong> e os exercícios concluídos neste dispositivo. Essa operação não pode ser desfeita.
            </p>

            <button
              type="button"
              onClick={() => {
                exportUserBackup(currentUser.username, workoutLogs, completedExercises);
                showToast('Backup salvo antes do reset!');
              }}
              className="w-full mb-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Backup (JSON) por Segurança
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFullReset}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20 transition-colors cursor-pointer"
              >
                Sim, Resetar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Princípios Básicos da Hipertrofia */}
      <PrinciplesModal
        isOpen={showPrinciplesModal}
        onClose={() => setShowPrinciplesModal(false)}
      />

      {/* Cronômetro de Descanso Flutuante */}
      <RestTimer externalTrigger={timerTrigger} />
    </div>
  );
}
