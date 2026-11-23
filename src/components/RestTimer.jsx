import React from 'react';
import { Timer, Play, Pause, RotateCcw, X, Volume2, VolumeX, Plus, Minus, BellOff } from 'lucide-react';
import { unlockTimerAudio } from '../utils/timerAudio';

const PRESETS = [
  { label: '10s', seconds: 10, desc: 'Rest-Pause' },
  { label: '30s', seconds: 30, desc: 'Curto' },
  { label: '60s', seconds: 60, desc: 'Padrão' },
  { label: '90s', seconds: 90, desc: 'Composto' },
  { label: '120s', seconds: 120, desc: 'Pesado' },
  { label: '180s', seconds: 180, desc: 'HIT / PCr' }
];

export default function RestTimer({ timer }) {
  const {
    isOpen,
    setIsOpen,
    secondsLeft,
    totalSeconds,
    isRunning,
    soundEnabled,
    justFinished,
    isAlarmRinging,
    activeExerciseName,
    startTimer,
    togglePlayPause,
    addSeconds,
    resetTimer,
    stopAlarm,
    dismissAlarm,
    toggleSound
  } = timer;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct =
    totalSeconds > 0
      ? Math.min(100, Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100))
      : 0;

  if (!isOpen) {
    if (isAlarmRinging) {
      return (
        <button
          type="button"
          onClick={dismissAlarm}
          className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 min-h-[48px] flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 animate-bounce cursor-pointer"
          aria-label="Parar alarme de descanso"
        >
          <BellOff className="w-5 h-5" />
          <span className="text-xs font-extrabold uppercase tracking-wider">Parar Alarme</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          unlockTimerAudio();
          setIsOpen(true);
        }}
        className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 min-h-[44px] min-w-[44px] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border transition-all cursor-pointer ${
          isRunning
            ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
            : justFinished
            ? 'bg-emerald-600 text-white border-emerald-400'
            : 'bg-zinc-950/95 text-zinc-100 border-zinc-700 hover:border-blue-500'
        }`}
        aria-label="Abrir cronômetro de descanso"
        title="Cronômetro de Descanso"
      >
        <Timer className={`w-4 h-4 ${isRunning ? 'text-white' : 'text-blue-400'}`} />
        <span className="text-xs font-extrabold font-mono">
          {isRunning || secondsLeft > 0 ? formatTime(secondsLeft) : 'Descanso'}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-md bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl p-3.5 text-zinc-100 ui-fade-in"
      role="region"
      aria-label="Cronômetro de Descanso"
    >
      {/* Barra de progresso fina no topo */}
      {totalSeconds > 0 && (
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full transition-all duration-300 ${
              justFinished || isAlarmRinging ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex items-center gap-2">
          <Timer className={`w-4 h-4 flex-shrink-0 ${justFinished || isAlarmRinging ? 'text-emerald-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-zinc-300 truncate">
              {isAlarmRinging
                ? 'Tempo Esgotado! Volte à Série'
                : justFinished
                ? 'Descanso Concluído!'
                : 'Cronômetro de Descanso'}
            </span>
            {activeExerciseName && (
              <span className="block text-xs text-zinc-400 truncate leading-tight">
                {activeExerciseName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Silenciar alarme' : 'Ativar e testar som do alarme'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl cursor-pointer"
            title={soundEnabled ? 'Som ativado (toque para silenciar)' : 'Som desativado (toque para ativar)'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-400" /> : <VolumeX className="w-5 h-5 text-zinc-500" />}
          </button>
          <button
            type="button"
            onClick={() => {
              stopAlarm();
              setIsOpen(false);
            }}
            aria-label="Minimizar cronômetro"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-xl cursor-pointer"
            title="Minimizar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Botão de 1 toque em destaque para PARAR ALARME quando estiver apitando */}
      {isAlarmRinging ? (
        <button
          type="button"
          onClick={dismissAlarm}
          className="w-full min-h-[52px] py-3 px-4 mb-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 border border-emerald-400 animate-pulse cursor-pointer"
        >
          <BellOff className="w-5 h-5" />
          PARAR ALARME
        </button>
      ) : (
        /* Display central + controles >= 44x44px */
        <div className="flex items-center justify-between gap-2 bg-black border border-zinc-800 rounded-xl px-3 py-2 mb-2.5">
          <div
            className={`text-2xl font-mono font-extrabold tracking-tight ${
              justFinished ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => addSeconds(-15)}
              aria-label="Subtrair 15 segundos"
              className="min-w-[44px] min-h-[44px] px-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 flex items-center justify-center gap-0.5 cursor-pointer"
              title="Diminuir 15 segundos"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>15s</span>
            </button>

            <button
              type="button"
              onClick={() => addSeconds(15)}
              aria-label="Adicionar 15 segundos"
              className="min-w-[44px] min-h-[44px] px-2 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 flex items-center justify-center gap-0.5 cursor-pointer"
              title="Adicionar 15 segundos"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>15s</span>
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl font-bold text-white flex items-center justify-center transition-colors cursor-pointer ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={resetTimer}
              aria-label="Reiniciar cronômetro"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
              title="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Presets rápidos (6 opções em 2x3 no mobile com toque >= 44px e fonte legível >= 11px) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.seconds}
            type="button"
            onClick={() => startTimer(p.seconds, true)}
            className={`min-h-[44px] py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer ${
              totalSeconds === p.seconds && isRunning
                ? 'bg-blue-600/25 border-blue-500 text-blue-200'
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            <div className="text-xs font-extrabold leading-tight">{p.label}</div>
            <div className="text-[0.7rem] text-zinc-400 truncate leading-tight mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>

      {soundEnabled && (
        <p className="text-[0.7rem] text-zinc-500 text-center mt-2 leading-tight">
          No iPhone, mantenha a chave lateral fora do Silencioso para ouvir o alarme.
        </p>
      )}
    </div>
  );
}
