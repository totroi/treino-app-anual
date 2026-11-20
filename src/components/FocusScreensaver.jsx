import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, BellOff, Volume2, VolumeX } from 'lucide-react';
import ExerciseSilhouette from './ExerciseSilhouette';
import { getDisplayExerciseName } from '../utils/exerciseNormalizer';

export default function FocusScreensaver({ isOpen, exercise, timer, onExit }) {
  // Mantém a tela acesa (Screen Wake Lock API — suportado no iOS Safari 16.4+ e Android Chrome)
  useEffect(() => {
    if (!isOpen) return;
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // fallback silencioso caso o navegador/bateria recuse Wake Lock
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isOpen]);

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
      onClick={onExit}
      className="fixed inset-0 z-50 bg-black text-slate-100 flex flex-col items-center justify-between px-6 py-8 select-none cursor-pointer animate-in fade-in duration-500"
      role="dialog"
      aria-label="Modo Foco Screensaver OLED"
    >
      {/* Topo discreto com instrução de retorno */}
      <div className="w-full max-w-sm flex items-center justify-between text-[0.65rem] text-slate-600 uppercase tracking-widest">
        <span>Modo Foco OLED</span>
        <span>Toque fora para voltar</span>
      </div>

      {/* Centro com deslocamento anti-burn-in sutil */}
      <div className="w-full max-w-sm flex flex-col items-center text-center anim-oled-drift my-auto">
        {/* Silhueta SVG Animada */}
        <ExerciseSilhouette
          exerciseName={displayName}
          muscleGroup={exercise['Grupo muscular']}
          accentColor={timer.isAlarmRinging ? '#34d399' : '#38bdf8'}
        />

        {/* Informações Essenciais do Exercício */}
        <span className="text-[0.65rem] font-bold uppercase tracking-widest text-sky-500/80 mt-2">
          {exercise['Grupo muscular']}
        </span>
        <h2 className="text-lg font-extrabold text-slate-100 leading-snug mt-0.5 px-2">
          {displayName}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
          <span className="bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full text-slate-200">
            {exercise['Séries/Reps']}
          </span>
          {exercise['Cadência'] && (
            <span className="bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full text-slate-400">
              Cadência {exercise['Cadência']}
            </span>
          )}
        </div>

        {/* Bloco Interativo do Cronômetro (clicar aqui NÃO fecha o screensaver) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full mt-7 bg-black border border-slate-800/90 rounded-2xl p-4 cursor-default"
        >
          {/* Barra de progresso ultrafina */}
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden mb-3">
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
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 border border-emerald-400 animate-pulse cursor-pointer"
            >
              <BellOff className="w-5 h-5" />
              PARAR ALARME
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">
                  {timer.isRunning ? 'Descansando' : timer.justFinished ? 'Pronto!' : 'Descanso'}
                </span>
                <button
                  type="button"
                  onClick={timer.toggleSound}
                  className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg cursor-pointer"
                  title={timer.soundEnabled ? 'Som ligado' : 'Som desligado'}
                >
                  {timer.soundEnabled ? <Volume2 className="w-4 h-4 text-sky-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>

              <div
                className={`text-4xl font-mono font-extrabold tracking-tight mb-4 ${
                  timer.justFinished ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {formatTime(timer.secondsLeft)}
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => timer.addSeconds(15)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  title="Adicionar 15 segundos"
                >
                  <Plus className="w-3.5 h-3.5" />
                  15s
                </button>

                <button
                  type="button"
                  onClick={timer.togglePlayPause}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    timer.isRunning
                      ? 'bg-amber-600/90 hover:bg-amber-500'
                      : 'bg-sky-600/90 hover:bg-sky-500'
                  }`}
                >
                  {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timer.isRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  type="button"
                  onClick={timer.resetTimer}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer"
                  title="Reiniciar cronômetro"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rodapé ultrafino */}
      <div className="text-[0.65rem] text-slate-700 tracking-wide">
        IronTracker • True Black OLED
      </div>
    </div>
  );
}
