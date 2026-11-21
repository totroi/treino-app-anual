import { useEffect } from 'react';

export function useFocusAutoDim({
  enabled,
  focusedExercise,
  screensaverDelay,
  isScreensaverOpen,
  isBlockedByModal,
  onTriggerScreensaver
}) {
  useEffect(() => {
    if (
      !enabled ||
      !focusedExercise ||
      screensaverDelay <= 0 ||
      isScreensaverOpen ||
      isBlockedByModal
    ) {
      return;
    }

    let timeoutId = null;
    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onTriggerScreensaver();
      }, screensaverDelay * 1000);
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
    };
  }, [
    enabled,
    focusedExercise,
    screensaverDelay,
    isScreensaverOpen,
    isBlockedByModal,
    onTriggerScreensaver
  ]);
}
