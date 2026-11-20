import { useState, useEffect, useRef, useCallback } from 'react';
import { unlockTimerAudio, playAlarmBurst, stopSharedAudio } from '../utils/timerAudio';

export function useRestTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [justFinished, setJustFinished] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
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

  // Loop de alarme contínuo quando o tempo chega a zero
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

  const startTimer = useCallback((secs, openPanel = true) => {
    unlockTimerAudio();
    stopAlarm();
    const duration = secs || 60;
    setTotalSeconds(duration);
    setSecondsLeft(duration);
    setIsRunning(true);
    setJustFinished(false);
    if (openPanel) setIsOpen(true);
  }, [stopAlarm]);

  const togglePlayPause = useCallback(() => {
    unlockTimerAudio();
    stopAlarm();
    if (secondsLeft === 0) {
      const duration = totalSeconds || 60;
      setSecondsLeft(duration);
      setIsRunning(true);
      setJustFinished(false);
    } else {
      setIsRunning((prev) => !prev);
    }
  }, [secondsLeft, totalSeconds, stopAlarm]);

  const addSeconds = useCallback((delta = 15) => {
    unlockTimerAudio();
    stopAlarm();
    setSecondsLeft((prev) => {
      const next = prev + delta;
      setTotalSeconds((tot) => Math.max(tot, next));
      return next;
    });
    setJustFinished(false);
  }, [stopAlarm]);

  const resetTimer = useCallback(() => {
    stopAlarm();
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
      if (next) playAlarmBurst();
      else stopAlarm();
      return next;
    });
  }, [stopAlarm]);

  return {
    isOpen,
    setIsOpen,
    secondsLeft,
    totalSeconds,
    isRunning,
    soundEnabled,
    justFinished,
    isAlarmRinging,
    startTimer,
    togglePlayPause,
    addSeconds,
    resetTimer,
    stopAlarm,
    dismissAlarm,
    toggleSound
  };
}
