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

    const pointerEvents = ['pointerdown', 'keydown', 'touchstart'];
    pointerEvents.forEach((ev) =>
      window.addEventListener(ev, resetInactivityTimer, { passive: true })
    );
    window.addEventListener('scroll', resetInactivityTimer, { capture: true, passive: true });
    resetInactivityTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      pointerEvents.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
      window.removeEventListener('scroll', resetInactivityTimer, { capture: true });
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
