import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Volume2, VolumeX, Plus, BellOff } from 'lucide-react';
import { unlockTimerAudio, playAlarmBurst, stopSharedAudio } from '../utils/timerAudio';

const PRESETS = [
  { label: '15s', seconds: 15, desc: 'Rest-Pause' },
  { label: '30s', seconds: 30, desc: 'Curto' },
  { label: '60s', seconds: 60, desc: 'Padrão' },
  { label: '90s', seconds: 90, desc: 'Composto' },
  { label: '120s', seconds: 120, desc: 'Pesado' }
];

export default function RestTimer({ externalTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justFinished, setJustFinished] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [lastTriggerTimestamp, setLastTriggerTimestamp] = useState(0);
  const alarmIntervalRef = useRef(null);

  const stopAlarm = useCallback(() => {
    setIsAlarmRinging(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    stopSharedAudio();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
  }, []);

  // Acionamento externo (botão de descanso do card)
  if (externalTrigger && externalTrigger.timestamp !== lastTriggerTimestamp) {
    const secs = externalTrigger.seconds || 60;
    setLastTriggerTimestamp(externalTrigger.timestamp);
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(true);
    setJustFinished(false);
    setIsAlarmRinging(false);
    setIsOpen(true);
  }

  // Loop de alarme contínuo quando o cronômetro chega a zero
  useEffect(() => {
    if (!isAlarmRinging) {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      return;
    }

    if (soundEnabled) playAlarmBurst();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([250, 120, 250]);
      } catch {
        // ignore
      }
    }

    let cycles = 0;
    alarmIntervalRef.current = setInterval(() => {
      cycles += 1;
      if (cycles >= 15) {
        setIsAlarmRinging(false);
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
        return;
      }
      if (soundEnabled) playAlarmBurst();
      if (navigator.vibrate) {
        try {
          navigator.vibrate([250, 120, 250]);
        } catch {
          // ignore
        }
      }
    }, 1100);

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [isAlarmRinging, soundEnabled]);

  // Contagem regressiva
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setJustFinished(true);
          setIsAlarmRinging(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startPreset = (secs) => {
    unlockTimerAudio();
    stopAlarm();
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(true);
    setJustFinished(false);
  };

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
    // Se estiver apitando mesmo minimizado, 1 clique no botão flutuante para o alarme imediatamente!
    if (isAlarmRinging) {
      return (
        <button
          onClick={() => {
            stopAlarm();
            setJustFinished(false);
          }}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 animate-bounce cursor-pointer"
          title="Toque para parar o alarme"
        >
          <BellOff className="w-4 h-4" />
          <span className="text-xs font-extrabold uppercase tracking-wider">Parar Alarme</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => {
          unlockTimerAudio();
          setIsOpen(true);
        }}
        className={`fixed bottom-4 right-4 z-30 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-xl border transition-all cursor-pointer ${
          isRunning
            ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
            : justFinished
            ? 'bg-emerald-600 text-white border-emerald-400'
            : 'bg-slate-900/95 text-slate-200 border-slate-700 hover:border-blue-500'
        }`}
        title="Cronômetro de Descanso"
      >
        <Timer className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold font-mono">
          {isRunning || secondsLeft > 0 ? formatTime(secondsLeft) : 'Descanso'}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-3.5 text-slate-100">
      {/* Barra de progresso fina no topo */}
      {totalSeconds > 0 && (
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full transition-all duration-300 ${
              justFinished ? 'bg-emerald-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${justFinished ? 'text-emerald-400' : 'text-blue-400'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isAlarmRinging
              ? 'Tempo Esgotado! Volte à Série'
              : justFinished
              ? 'Descanso Concluído!'
              : 'Cronômetro de Descanso'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              unlockTimerAudio();
              const nextState = !soundEnabled;
              setSoundEnabled(nextState);
              if (nextState) playAlarmBurst();
              else stopAlarm();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
            title={soundEnabled ? 'Som ativado (clique para silenciar)' : 'Som desativado (clique para ativar e testar)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              stopAlarm();
              setIsOpen(false);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
            title="Minimizar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Botão de 1 clique em destaque para PARAR ALARME quando estiver apitando */}
      {isAlarmRinging ? (
        <button
          type="button"
          onClick={() => {
            stopAlarm();
            setJustFinished(false);
          }}
          className="w-full py-3 px-4 mb-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 border border-emerald-400 animate-pulse cursor-pointer"
        >
          <BellOff className="w-5 h-5" />
          PARAR ALARME (1 Clique)
        </button>
      ) : (
        /* Display central + controles normais */
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 mb-2.5">
          <div
            className={`text-2xl font-mono font-extrabold tracking-tight ${
              justFinished ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {formatTime(secondsLeft)}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                unlockTimerAudio();
                stopAlarm();
                setSecondsLeft((prev) => prev + 15);
                setTotalSeconds((prev) => Math.max(prev, secondsLeft + 15));
                setJustFinished(false);
              }}
              className="px-2 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-0.5 cursor-pointer"
              title="Adicionar 15 segundos"
            >
              <Plus className="w-3 h-3" />
              15s
            </button>

            <button
              onClick={() => {
                unlockTimerAudio();
                stopAlarm();
                if (secondsLeft === 0) {
                  startPreset(totalSeconds || 60);
                } else {
                  setIsRunning(!isRunning);
                }
              }}
              className={`p-2 rounded-lg font-bold text-white transition-colors cursor-pointer ${
                isRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                stopAlarm();
                setIsRunning(false);
                setSecondsLeft(totalSeconds);
                setJustFinished(false);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              title="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Presets rápidos */}
      <div className="grid grid-cols-5 gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.seconds}
            onClick={() => startPreset(p.seconds)}
            className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
              totalSeconds === p.seconds && isRunning
                ? 'bg-blue-600/25 border-blue-500 text-blue-300'
                : 'bg-slate-800/70 border-slate-700/70 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="text-xs font-bold">{p.label}</div>
            <div className="text-[9px] text-slate-400 truncate">{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
