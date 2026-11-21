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
  CheckCircle2
} from 'lucide-react';
import ExerciseSilhouette from './ExerciseSilhouette';
import {
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  getRepsPlaceholder,
  parseRestSeconds,
  cleanAdvancedTechnique
} from '../utils/exerciseNormalizer';
import { formatWeightDisplay, parsePtBrNumber } from '../utils/numberFormat';

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
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const wakeLockRef = useRef(null);
  const graceTimeoutRef = useRef(null);
  const savedFeedbackRef = useRef(null);

  // WakeLock inteligente: mantém a tela acesa enquanto o cronômetro corre ou apita,
  // e libera automaticamente após 3 min parado para proteger a bateria OLED.
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
        }, 3 * 60 * 1000);
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

  // Fecha também com ESC (exceto quando o usuário está digitando no input)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit();
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

  const handleSaveSetInFocus = () => {
    if (!canSave || !onSaveSet) return;
    onSaveSet(canonicalKey, displayName, weight, reps, restSeconds, exercise);
    // No Modo Foco, salvar a série significa que o usuário terminou a execução -> inicia o descanso automaticamente!
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
    onExit();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-zinc-100 flex flex-col items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain ui-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco OLED"
    >
      {/* Topo discreto com status da sessão */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs text-zinc-400 uppercase tracking-widest mb-1">
        <span>Modo Foco OLED</span>
        {todaySetsCount > 0 ? (
          <span className="text-emerald-400 font-bold normal-case tracking-normal">
            {todaySetsCount} {todaySetsCount === 1 ? 'série feita' : 'séries feitas'}
          </span>
        ) : (
          <span className="text-zinc-500">True Black</span>
        )}
      </div>

      {/* Conteúdo central */}
      <div className="w-full max-w-sm flex flex-col items-center text-center my-auto py-2 space-y-3.5">
        {/* Bloco visual com deslocamento anti-burn-in (±10px) — isolado dos inputs */}
        <div className="w-full flex flex-col items-center anim-oled-drift select-none">
          <ExerciseSilhouette
            exerciseName={displayName}
            muscleGroup={exercise['Grupo muscular']}
            accentColor={timer.isAlarmRinging ? '#34d399' : '#38bdf8'}
            sizeClass="w-28 h-28"
          />

          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mt-1">
            {exercise['Grupo muscular']}
          </span>
          <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug mt-0.5 px-2">
            {displayName}
          </h2>

          {/* Badges essenciais + Última carga clicável para preencher em 1 toque */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-xs font-semibold">
            <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-100">
              {exercise['Séries/Reps']}
            </span>
            {exercise['Cadência'] && (
              <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-300">
                Cadência {exercise['Cadência']}
              </span>
            )}
            {lastLog && (
              <button
                type="button"
                onClick={handleQuickFillLast}
                title="Toque para preencher carga e reps"
                className="bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/70 px-2.5 py-1 rounded-full text-emerald-300 font-mono transition-colors cursor-pointer"
              >
                Última: {formatWeightDisplay(lastLog.weight)}kg{lastLog.reps ? `×${lastLog.reps}` : ''}
              </button>
            )}
          </div>

          {advancedTechnique && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full text-xs text-amber-200 max-w-full">
              <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate">{advancedTechnique}</span>
            </div>
          )}
        </div>

        {/* Registro Rápido da Série no Modo Foco (salva e dispara o descanso automaticamente) */}
        <div className="w-full bg-black border border-zinc-800/90 rounded-2xl p-3 text-left space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="focus-weight"
                className="text-xs text-zinc-400 font-semibold block mb-1"
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
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSetInFocus(); }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white text-base placeholder-zinc-600 focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="focus-reps"
                className="text-xs text-zinc-400 font-semibold block mb-1"
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
                onChange={(e) => setReps(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSetInFocus(); }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-white text-base placeholder-zinc-600 focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSetInFocus}
              disabled={!canSave}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-35 disabled:cursor-not-allowed'
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
                onClick={handleCompleteInFocus}
                aria-label="Concluir exercício e sair do modo foco"
                title="Marcar exercício como concluído"
                className="min-h-[44px] px-3 rounded-xl border border-emerald-800/80 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer flex-shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            )}
          </div>
        </div>

        {/* Bloco Interativo do Cronômetro (pronto/pausado ao entrar; inicia ao salvar ou tocar Iniciar) */}
        <div className="w-full bg-black border border-zinc-800 rounded-2xl p-3.5 select-none">
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full transition-all duration-300 ${
                timer.isAlarmRinging || timer.justFinished ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {timer.isAlarmRinging ? (
            <button
              type="button"
              onClick={timer.dismissAlarm}
              className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-emerald-400 animate-pulse cursor-pointer"
            >
              <BellOff className="w-5 h-5" />
              PARAR ALARME
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {timer.isRunning
                    ? 'Descansando'
                    : timer.justFinished
                    ? 'Pronto para a série!'
                    : 'Descanso (Aguardando série)'}
                </span>
                <button
                  type="button"
                  onClick={timer.toggleSound}
                  aria-label={timer.soundEnabled ? 'Silenciar alarme' : 'Ativar alarme'}
                  className="min-w-[44px] min-h-[44px] -my-2 -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"
                >
                  {timer.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-sky-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
              </div>

              <div
                className={`text-3xl font-mono font-extrabold tracking-tight mb-3 ${
                  timer.justFinished ? 'text-emerald-400' : timer.isRunning ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {formatTime(effectiveSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => timer.addSeconds(-15)}
                  aria-label="Subtrair 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={() => timer.addSeconds(15)}
                  aria-label="Adicionar 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
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
                  className={`flex-1 min-h-[44px] px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    timer.isRunning
                      ? 'bg-amber-600 hover:bg-amber-500'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timer.isRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  type="button"
                  onClick={timer.resetTimer}
                  aria-label="Reiniciar cronômetro"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão explícito de saída (evita fechamento acidental no bolso) */}
      <div className="w-full max-w-sm pt-2">
        <button
          type="button"
          onClick={onExit}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sair do Modo Foco</span>
        </button>
      </div>
    </div>
  );
}
