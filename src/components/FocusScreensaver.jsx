import React, { useEffect, useRef } from 'react';
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
  Zap
} from 'lucide-react';
import ExerciseSilhouette from './ExerciseSilhouette';
import { getDisplayExerciseName, cleanAdvancedTechnique } from '../utils/exerciseNormalizer';
import { formatWeightDisplay } from '../utils/numberFormat';

export default function FocusScreensaver({ isOpen, exercise, lastLog, timer, onExit }) {
  const wakeLockRef = useRef(null);
  const graceTimeoutRef = useRef(null);

  // WakeLock inteligente (Item 6.2): mantém a tela acesa enquanto o cronômetro corre ou apita,
  // e libera automaticamente após 3 min de inatividade parado para proteger a bateria OLED.
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
      // Janela de tolerância de 3 minutos após pausa/término para o usuário ler e iniciar a série
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
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onExit]);

  if (!isOpen || !exercise) return null;

  const displayName = getDisplayExerciseName(exercise['Exercício']);
  const advancedTechnique = cleanAdvancedTechnique(exercise['Técnica Avançada']);
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct =
    timer.totalSeconds > 0
      ? Math.min(100, Math.round(((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100))
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-zinc-100 flex flex-col items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none overflow-y-auto ui-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco OLED"
    >
      {/* Topo discreto com contraste legível */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs text-zinc-400 uppercase tracking-widest">
        <span>Modo Foco OLED</span>
        <span className="text-zinc-500">True Black</span>
      </div>

      {/* Centro + Cronômetro com deslocamento anti-burn-in (±10px) */}
      <div className="w-full max-w-sm flex flex-col items-center text-center anim-oled-drift my-auto py-3">
        <ExerciseSilhouette
          exerciseName={displayName}
          muscleGroup={exercise['Grupo muscular']}
          accentColor={timer.isAlarmRinging ? '#34d399' : '#38bdf8'}
        />

        <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mt-1">
          {exercise['Grupo muscular']}
        </span>
        <h2 className="text-lg font-extrabold text-white leading-snug mt-0.5 px-2">
          {displayName}
        </h2>

        {/* Badges essenciais: Séries/Reps, Cadência e Última Carga (Item 6.3) */}
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
            <span className="bg-emerald-950/50 border border-emerald-800/70 px-2.5 py-1 rounded-full text-emerald-300 font-mono">
              Última: {formatWeightDisplay(lastLog.weight)}kg{lastLog.reps ? `×${lastLog.reps}` : ''}
            </span>
          )}
        </div>

        {advancedTechnique && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 px-3 py-1 rounded-full text-xs text-amber-200 max-w-full">
            <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="truncate">{advancedTechnique}</span>
          </div>
        )}

        {/* Bloco Interativo do Cronômetro (todos os botões >= 44x44px) */}
        <div className="w-full mt-5 bg-black border border-zinc-800 rounded-2xl p-4">
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-3">
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
              className="w-full min-h-[52px] py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-emerald-400 animate-pulse cursor-pointer"
            >
              <BellOff className="w-5 h-5" />
              PARAR ALARME
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {timer.isRunning ? 'Descansando' : timer.justFinished ? 'Pronto!' : 'Descanso'}
                </span>
                <button
                  type="button"
                  onClick={timer.toggleSound}
                  aria-label={timer.soundEnabled ? 'Silenciar alarme' : 'Ativar alarme'}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"
                >
                  {timer.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-sky-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-zinc-500" />
                  )}
                </button>
              </div>

              <div
                className={`text-4xl font-mono font-extrabold tracking-tight mb-4 ${
                  timer.justFinished ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {formatTime(timer.secondsLeft)}
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
                  onClick={timer.togglePlayPause}
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

      {/* Botão explícito de saída (evita fechamento acidental no bolso — Item 6.1) */}
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
