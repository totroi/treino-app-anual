import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  BellOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  Zap,
  Save,
  Check,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import ExerciseSilhouette from './ExerciseSilhouette';
import {
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  getRepsPlaceholder,
  parseRestSeconds,
  cleanAdvancedTechnique
} from '../utils/exerciseNormalizer';
import { findGlossaryEntriesForTechnique } from '../utils/glossaryData';
import { formatWeightDisplay, parsePtBrNumber } from '../utils/numberFormat';

const ULTRA_ECO_IDLE_MS = 12 * 1000;
const WAKELOCK_IDLE_RELEASE_MS = 90 * 1000;

export default function FocusScreensaver({
  isOpen,
  exercise,
  lastLog,
  todaySetsCount = 0,
  isCompleted = false,
  timer,
  onSaveSet,
  onToggleComplete,
  onExit
}) {
  // Pré-preenche carga se já houver série ativa nesta sessão (continuidade rápida entre séries)
  const [weight, setWeight] = useState(() =>
    todaySetsCount > 0 && lastLog ? formatWeightDisplay(lastLog.weight) : ''
  );
  const [reps, setReps] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUltraEco, setIsUltraEco] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showTechTip, setShowTechTip] = useState(false);

  const wakeLockRef = useRef(null);
  const graceTimeoutRef = useRef(null);
  const savedFeedbackRef = useRef(null);

  // Trava o scroll da tela principal enquanto o Modo Foco está aberto (impede iOS de deslocar o fundo)
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Auto-Dim em 2 estágios (12s sem toque e sem input focado -> Ultra Eco >95% #000000 com luminância ~50%)
  useEffect(() => {
    if (!isOpen || isUltraEco || isInputFocused || timer.isAlarmRinging) return;

    let idleId = null;
    const armIdleTimer = () => {
      if (idleId) clearTimeout(idleId);
      idleId = setTimeout(() => {
        setIsUltraEco(true);
      }, ULTRA_ECO_IDLE_MS);
    };

    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, armIdleTimer, { passive: true }));
    armIdleTimer();

    return () => {
      if (idleId) clearTimeout(idleId);
      events.forEach((ev) => window.removeEventListener(ev, armIdleTimer));
    };
  }, [isOpen, isUltraEco, isInputFocused, timer.isAlarmRinging]);

  // WakeLock conservador: ativo durante descanso/alarme; libera automaticamente em 90s se parado
  useEffect(() => {
    const releaseWakeLock = () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
        graceTimeoutRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    if (!isOpen) {
      releaseWakeLock();
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Fallback silencioso caso bateria/SO recuse Wake Lock
      }
    };

    const isActiveNeed = timer.isRunning || timer.isAlarmRinging;

    if (isActiveNeed) {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
        graceTimeoutRef.current = null;
      }
      requestWakeLock();
    } else {
      requestWakeLock();
      if (!graceTimeoutRef.current) {
        graceTimeoutRef.current = setTimeout(() => {
          releaseWakeLock();
        }, WAKELOCK_IDLE_RELEASE_MS);
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (timer.isRunning || timer.isAlarmRinging)) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (!isOpen) releaseWakeLock();
    };
  }, [isOpen, timer.isRunning, timer.isAlarmRinging]);

  // Liberação garantida ao desmontar
  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
      if (savedFeedbackRef.current) clearTimeout(savedFeedbackRef.current);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Fecha também com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onExit]);

  if (!isOpen || !exercise) return null;

  const rawName = exercise['Exercício'] || '';
  const displayName = getDisplayExerciseName(rawName);
  const canonicalKey = getCanonicalExerciseKey(rawName);
  const advancedTechnique = cleanAdvancedTechnique(exercise['Técnica Avançada']);
  const restDescription = (exercise['Descanso'] || '').trim() || '60-75s (Hipertrofia controlada)';
  const restSeconds = parseRestSeconds(restDescription, advancedTechnique, exercise['Grupo muscular']);
  const defaultRepsPlaceholder = getRepsPlaceholder(exercise['Séries/Reps']);
  const canSave = !Number.isNaN(parsePtBrNumber(weight));

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveSeconds =
    timer.isRunning || timer.isAlarmRinging || timer.justFinished || timer.secondsLeft > 0
      ? timer.secondsLeft
      : restSeconds;

  const progressPct =
    timer.totalSeconds > 0 && (timer.isRunning || timer.justFinished || timer.isAlarmRinging)
      ? Math.min(100, Math.round(((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100))
      : 0;

  const handleQuickFillLast = () => {
    if (!lastLog) return;
    setWeight(formatWeightDisplay(lastLog.weight));
    if (lastLog.reps) setReps(String(lastLog.reps));
  };

  const handleSaveSetInFocus = (e) => {
    if (e) e.preventDefault();
    if (!canSave || !onSaveSet) return;
    const saved = onSaveSet(canonicalKey, displayName, weight, reps, restSeconds, exercise);
    if (!saved) return;
    // Fecha o teclado iOS suavemente APÓS a gravação confirmada
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsInputFocused(false);
    // Salvar a série confirmada no Modo Foco dispara o descanso automaticamente
    timer.startTimer(restSeconds, false, displayName);
    setReps('');
    setSavedSuccess(true);
    if (savedFeedbackRef.current) clearTimeout(savedFeedbackRef.current);
    savedFeedbackRef.current = setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleCompleteInFocus = () => {
    if (onToggleComplete && !isCompleted) {
      onToggleComplete(canonicalKey, displayName);
    }
    onExit(true);
  };

  const techniqueMatches = advancedTechnique
    ? findGlossaryEntriesForTechnique(advancedTechnique)
    : [];

  const showUltraEcoView = isUltraEco && !timer.isAlarmRinging;

  // ESTÁGIO 2: ULTRA ECO OLED (>95% pixels #000000 desligados + luminância reduzida ~50%)
  if (showUltraEcoView) {
    return (
      <div
        onClick={() => setIsUltraEco(false)}
        className="fixed inset-0 z-50 min-h-[100dvh] bg-black text-zinc-500 flex flex-col items-center justify-between px-safe pt-safe-screen pb-safe-screen select-none cursor-pointer"
        role="dialog"
        aria-modal="true"
        aria-label="Modo Foco Ultra Eco OLED — toque para acordar controles"
      >
        <div className="w-full max-w-sm flex items-center justify-between text-[0.7rem] text-zinc-700 uppercase tracking-widest">
          <span>Eco OLED</span>
          <span>{todaySetsCount > 0 ? `${todaySetsCount} ${todaySetsCount === 1 ? 'série' : 'séries'}` : 'True Black'}</span>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center text-center my-auto anim-oled-drift opacity-55">
          <ExerciseSilhouette
            exerciseName={displayName}
            muscleGroup={exercise['Grupo muscular']}
            accentColor="#0369a1"
            sizeClass="w-32 h-32"
            lowPower
            paused={!timer.isRunning}
          />

          <h2 className="text-base font-bold text-zinc-400 leading-snug mt-2 px-4">
            {displayName}
          </h2>
          <span className="text-xs text-zinc-600 mt-0.5">{exercise['Séries/Reps']}</span>

          <div
            className={`text-5xl font-mono font-bold tracking-tight mt-6 ${
              timer.justFinished ? 'text-emerald-500/80' : 'text-zinc-400'
            }`}
          >
            {formatTime(effectiveSeconds)}
          </div>
          <span className="text-xs text-zinc-600 uppercase tracking-widest mt-1.5">
            {timer.isRunning ? 'Descansando' : timer.justFinished ? 'Pronto' : 'Aguardando série'}
          </span>
        </div>

        <div className="text-xs text-zinc-700 tracking-wide">
          Toque na tela para registrar série ou sair
        </div>
      </div>
    );
  }

  // ESTÁGIO 1: INTERATIVO DIMMED (fluxo estável justify-start: zero deslocamento de botão quando teclado iOS fecha)
  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] bg-black text-zinc-400 flex flex-col items-center justify-start px-safe pt-safe-screen pb-safe-screen overflow-y-auto overscroll-contain ui-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco OLED"
    >
      {/* Topo discreto com contraste apagado */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs text-zinc-600 uppercase tracking-widest mb-2">
        <span>Modo Foco • Eco OLED</span>
        {todaySetsCount > 0 ? (
          <span className="text-emerald-500/80 font-bold normal-case tracking-normal">
            {todaySetsCount} {todaySetsCount === 1 ? 'série feita' : 'séries feitas'}
          </span>
        ) : (
          <span className="text-zinc-700">90% True Black</span>
        )}
      </div>

      {/* Conteúdo central em fluxo estável (sem my-auto que pula ao recolher o teclado no iPhone) */}
      <div className="w-full max-w-sm flex flex-col items-center text-center py-1 space-y-3">
        {/* Bloco visual com deslocamento anti-burn-in (±10px) — isolado dos inputs */}
        <div className="w-full flex flex-col items-center anim-oled-drift select-none">
          <ExerciseSilhouette
            exerciseName={displayName}
            muscleGroup={exercise['Grupo muscular']}
            accentColor={timer.isAlarmRinging ? '#10b981' : '#0284c7'}
            sizeClass="w-24 h-24"
            lowPower
          />

          <span className="text-xs font-bold uppercase tracking-widest text-sky-600 mt-1">
            {exercise['Grupo muscular']}
          </span>
          <h2 className="text-base font-bold text-zinc-300 leading-snug mt-0.5 px-2">
            {displayName}
          </h2>

          {/* Badges ultra-dim (fundo #000000 puro + borda fina) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-xs font-medium">
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-400">
              {exercise['Séries/Reps']}
            </span>
            {exercise['Cadência'] && (
              <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-500">
                Cadência {exercise['Cadência']}
              </span>
            )}
            {lastLog && (
              <button
                type="button"
                onClick={handleQuickFillLast}
                title="Toque para preencher carga e reps"
                className="bg-black hover:border-emerald-800 border border-emerald-950 px-2.5 py-1 rounded-full text-emerald-500/85 font-mono transition-colors cursor-pointer"
              >
                Última: {formatWeightDisplay(lastLog.weight)}kg{lastLog.reps ? `×${lastLog.reps}` : ''}
              </button>
            )}
          </div>

          {advancedTechnique && (
            <div className="mt-2 w-full flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowTechTip((prev) => !prev)}
                aria-expanded={showTechTip}
                className="min-h-[36px] inline-flex items-center gap-1.5 bg-black hover:border-amber-700 border border-amber-950/90 px-3 py-1 rounded-full text-xs text-amber-500/85 max-w-full transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">{advancedTechnique}</span>
                <HelpCircle className="w-3.5 h-3.5 text-amber-600/80 flex-shrink-0" />
              </button>

              {showTechTip && techniqueMatches.length > 0 && (
                <div className="mt-2 w-full bg-black border border-amber-950 rounded-xl p-2.5 text-left space-y-1.5 ui-fade-in">
                  {techniqueMatches.map((entry) => (
                    <div key={entry.id} className="text-xs leading-relaxed">
                      <span className="font-bold text-amber-500/90">{entry.term}: </span>
                      <span className="text-zinc-400">{entry.shortDesc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Registro Rápido True Black em <form> real com blindagem contra blur/keyboard-collapse no iOS */}
        <form
          onSubmit={handleSaveSetInFocus}
          className="w-full bg-black border border-zinc-900 rounded-2xl p-3 text-left space-y-2.5"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="focus-weight"
                className="text-xs text-zinc-500 font-semibold block mb-1"
              >
                Carga (kg)
              </label>
              <input
                id="focus-weight"
                type="text"
                inputMode="decimal"
                enterKeyHint="next"
                placeholder={lastLog ? `${formatWeightDisplay(lastLog.weight)}` : 'ex: 80'}
                value={weight}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800/90 bg-black text-zinc-200 text-base placeholder-zinc-700 focus:border-sky-700 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="focus-reps"
                className="text-xs text-zinc-500 font-semibold block mb-1"
              >
                Reps
              </label>
              <input
                id="focus-reps"
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                placeholder={`ex: ${defaultRepsPlaceholder}`}
                value={reps}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={(e) => setReps(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800/90 bg-black text-zinc-200 text-base placeholder-zinc-700 focus:border-sky-700 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSave}
              onPointerDown={(e) => {
                // Evita que o iOS feche o teclado e desloque o botão antes do submit/click completar
                if (canSave) e.preventDefault();
              }}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-black border-emerald-700 text-emerald-400'
                  : 'bg-black border-sky-800/80 hover:border-sky-600 text-sky-400/90 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {savedSuccess
                  ? 'Salva • Descansando!'
                  : todaySetsCount > 0
                  ? `Salvar #${todaySetsCount + 1} & Descansar`
                  : 'Salvar & Descansar'}
              </span>
            </button>

            {!isCompleted && onToggleComplete && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleCompleteInFocus}
                aria-label="Concluir exercício e sair do modo foco"
                title="Marcar exercício como concluído"
                className="min-h-[44px] px-3 rounded-xl border border-emerald-900/80 bg-black hover:border-emerald-700 text-emerald-500/85 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer flex-shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            )}
          </div>

          {todaySetsCount > 0 && lastLog && (
            <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-emerald-500/80">
              <span className="flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">
                  Série #{todaySetsCount} registrada ({formatWeightDisplay(lastLog.weight)}kg
                  {lastLog.reps ? ` × ${lastLog.reps}` : ''})
                </span>
              </span>
            </div>
          )}
        </form>

        {/* Cronômetro Ultra-Low-APL (outline puro sobre #000000) */}
        <div className="w-full bg-black border border-zinc-900 rounded-2xl p-3.5 select-none">
          <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full transition-all duration-300 ${
                timer.isAlarmRinging || timer.justFinished ? 'bg-emerald-600/80' : 'bg-sky-700/80'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {timer.isAlarmRinging ? (
            <button
              type="button"
              onClick={() => {
                setIsUltraEco(false);
                timer.dismissAlarm();
              }}
              className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-black hover:bg-emerald-950/40 text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2 border-2 border-emerald-600/80 animate-pulse cursor-pointer"
            >
              <BellOff className="w-5 h-5" />
              PARAR ALARME
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {timer.isRunning
                    ? 'Descansando'
                    : timer.justFinished
                    ? 'Pronto para a série!'
                    : 'Aguardando série'}
                </span>
                <button
                  type="button"
                  onClick={timer.toggleSound}
                  aria-label={timer.soundEnabled ? 'Silenciar alarme' : 'Ativar alarme'}
                  className="min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer"
                >
                  {timer.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-sky-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-zinc-700" />
                  )}
                </button>
              </div>

              <div
                className={`text-3xl font-mono font-bold tracking-tight mb-3 ${
                  timer.justFinished
                    ? 'text-emerald-400/85'
                    : timer.isRunning
                    ? 'text-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                {formatTime(effectiveSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => timer.addSeconds(-15)}
                  aria-label="Subtrair 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={() => timer.addSeconds(15)}
                  aria-label="Adicionar 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!timer.isRunning && timer.secondsLeft === 0) {
                      timer.startTimer(restSeconds, false, displayName);
                    } else {
                      timer.togglePlayPause();
                    }
                  }}
                  className={`flex-1 min-h-[44px] px-3 rounded-xl font-bold text-xs bg-black border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    timer.isRunning
                      ? 'border-amber-900/80 text-amber-500/90 hover:border-amber-700'
                      : 'border-sky-900/80 text-sky-400/90 hover:border-sky-700'
                  }`}
                >
                  {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timer.isRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  type="button"
                  onClick={timer.resetTimer}
                  aria-label="Reiniciar cronômetro"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-500 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão explícito de saída em outline True Black */}
      <div className="w-full max-w-sm mt-auto pt-3">
        <button
          type="button"
          onClick={() => onExit(false)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sair do Modo Foco</span>
        </button>
      </div>
    </div>
  );
}
