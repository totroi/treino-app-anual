import { useState, useEffect, useRef, useCallback } from 'react';
import {
  unlockTimerAudio,
  playAlarmBurst,
  stopSharedAudio,
  triggerSafeVibration,
  startSilentKeepAlive,
  stopSilentKeepAlive,
  resumeAudioFromInterruption
} from '../utils/timerAudio';

export function useRestTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justFinished, setJustFinished] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState('');

  // Timestamp absoluto de término para precisão ±1s mesmo com tela bloqueada ou no WhatsApp no iOS/Android
  const endTimeRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  const stopAlarm = useCallback(() => {
    setIsAlarmRinging(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    stopSharedAudio();
    triggerSafeVibration(0);
  }, []);

  // Loop de alarme contínuo quando o cronômetro zera + recuperação imediata ao voltar do WhatsApp / Gravação de Tela no iOS
  useEffect(() => {
    if (!isAlarmRinging) {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      return;
    }

    if (soundEnabled) playAlarmBurst();
    triggerSafeVibration([250, 120, 250]);

    let cycles = 0;
    alarmIntervalRef.current = setInterval(() => {
      cycles += 1;
      if (cycles >= 15) {
        setIsAlarmRinging(false);
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
        stopSharedAudio();
        return;
      }
      if (soundEnabled) playAlarmBurst();
      triggerSafeVibration([250, 120, 250]);
    }, 1100);

    // Se o iOS colocou o áudio em 'interrupted' enquanto o usuário estava no WhatsApp/Deezer/Gravação de Tela,
    // destrava e toca imediatamente no instante em que a aba volta a ficar visível ou recebe toque
    const handleWakeAlarmAudio = () => {
      if (!soundEnabled) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      resumeAudioFromInterruption().then(() => {
        playAlarmBurst();
      });
    };

    document.addEventListener('visibilitychange', handleWakeAlarmAudio);
    window.addEventListener('focus', handleWakeAlarmAudio);
    window.addEventListener('pageshow', handleWakeAlarmAudio);
    window.addEventListener('touchstart', handleWakeAlarmAudio, { passive: true });
    window.addEventListener('pointerdown', handleWakeAlarmAudio, { passive: true });

    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleWakeAlarmAudio);
      window.removeEventListener('focus', handleWakeAlarmAudio);
      window.removeEventListener('pageshow', handleWakeAlarmAudio);
      window.removeEventListener('touchstart', handleWakeAlarmAudio);
      window.removeEventListener('pointerdown', handleWakeAlarmAudio);
    };
  }, [isAlarmRinging, soundEnabled]);

  // Recalcula tempo restante a partir de Date.now() — imune ao throttling de background do Safari/Chrome
  const syncRemaining = useCallback(() => {
    if (!endTimeRef.current) return;
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      endTimeRef.current = null;
      setIsRunning(false);
      setJustFinished(true);
      setIsAlarmRinging(true);
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    syncRemaining();
    const interval = setInterval(syncRemaining, 250);
    const handleResume = () => {
      resumeAudioFromInterruption();
      syncRemaining();
    };
    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
    };
  }, [isRunning, syncRemaining]);

  const startTimer = useCallback(
    (secs, openPanel = true, exerciseLabel = '') => {
      unlockTimerAudio();
      stopAlarm();
      if (soundEnabled) {
        startSilentKeepAlive();
      }
      const duration = Math.max(5, secs || 60);
      endTimeRef.current = Date.now() + duration * 1000;
      setTotalSeconds(duration);
      setSecondsLeft(duration);
      setIsRunning(true);
      setJustFinished(false);
      if (exerciseLabel) setActiveExerciseName(exerciseLabel);
      if (openPanel) setIsOpen(true);
    },
    [stopAlarm, soundEnabled]
  );

  // Prepara o cronômetro com o tempo do exercício SEM iniciar a contagem (ex.: ao entrar no Modo Foco antes da série)
  const prepareTimer = useCallback(
    (secs, exerciseLabel = '') => {
      if (isRunning || isAlarmRinging) return;
      const duration = Math.max(5, secs || 60);
      endTimeRef.current = null;
      setTotalSeconds(duration);
      setSecondsLeft(duration);
      setJustFinished(false);
      if (exerciseLabel) setActiveExerciseName(exerciseLabel);
    },
    [isRunning, isAlarmRinging]
  );

  const togglePlayPause = useCallback(() => {
    unlockTimerAudio();
    stopAlarm();
    if (isRunning) {
      // Pausa mantendo segundos restantes exatos e encerra o keep-alive
      const remaining = endTimeRef.current
        ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
        : secondsLeft;
      endTimeRef.current = null;
      setSecondsLeft(remaining);
      setIsRunning(false);
      stopSilentKeepAlive();
      return;
    }

    if (soundEnabled) {
      startSilentKeepAlive();
    }
    const resumeSecs = secondsLeft > 0 ? secondsLeft : totalSeconds || 60;
    endTimeRef.current = Date.now() + resumeSecs * 1000;
    setSecondsLeft(resumeSecs);
    setIsRunning(true);
    setJustFinished(false);
  }, [isRunning, secondsLeft, totalSeconds, stopAlarm, soundEnabled]);

  // Updater puro (sem aninhar setState dentro de outro updater)
  const addSeconds = useCallback(
    (delta = 15) => {
      unlockTimerAudio();
      stopAlarm();
      const base =
        isRunning && endTimeRef.current
          ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
          : secondsLeft;
      const next = Math.max(5, base + delta);
      if (isRunning) {
        endTimeRef.current = Date.now() + next * 1000;
        if (soundEnabled) startSilentKeepAlive();
      }
      setSecondsLeft(next);
      setTotalSeconds((prevTot) => Math.max(prevTot, next));
      setJustFinished(false);
    },
    [isRunning, secondsLeft, stopAlarm, soundEnabled]
  );

  const resetTimer = useCallback(() => {
    stopAlarm();
    stopSilentKeepAlive();
    endTimeRef.current = null;
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
    setJustFinished(false);
  }, [stopAlarm, totalSeconds]);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    setJustFinished(false);
  }, [stopAlarm]);

  const toggleSound = useCallback(() => {
    unlockTimerAudio();
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        if (isRunning) startSilentKeepAlive();
        playAlarmBurst();
      } else {
        stopAlarm();
        stopSilentKeepAlive();
      }
      return next;
    });
  }, [stopAlarm, isRunning]);

  return {
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
    prepareTimer,
    togglePlayPause,
    addSeconds,
    resetTimer,
    stopAlarm,
    dismissAlarm,
    toggleSound
  };
}
