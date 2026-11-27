import { useState, useEffect, useCallback, useRef } from 'react';

const INSTALL_DISMISSED_SESSION_KEY = 'irontracker_install_dismissed_v1';

/**
 * Checks whether the web app is currently running inside an installed PWA window
 * (standalone, fullscreen, minimal-ui, iOS navigator.standalone, or Android TWA).
 */
export function isRunningStandalone(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  try {
    const matchModes = [
      '(display-mode: standalone)',
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)'
    ];
    for (const query of matchModes) {
      if (win.matchMedia && win.matchMedia(query)?.matches) {
        return true;
      }
    }
    if (win.navigator && win.navigator.standalone === true) {
      return true;
    }
    if (win.document && typeof win.document.referrer === 'string' && win.document.referrer.startsWith('android-app://')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Classifies the user's browser/device environment into a deterministic PWA install strategy
 * so every device gets a real, bug-free 1-click experience (native prompt, in-app escape, or OS guide).
 */
export function detectPwaEnvironment({
  ua = '',
  maxTouchPoints = 0,
  hasDeferredPrompt = false,
  standalone = false
} = {}) {
  const rawUa = String(ua || '');
  const isIOS =
    /iPhone|iPad|iPod/i.test(rawUa) ||
    (/Macintosh/i.test(rawUa) && Number(maxTouchPoints) > 1);
  const isAndroid = /Android/i.test(rawUa);

  const inAppToken =
    /WhatsApp|Instagram|FBAN|FBAV|FBIOS|FB_IAB|Line\/|MicroMessenger|Telegram|BytedanceWebview|TikTok|LinkedInApp|Snapchat|Twitter|GSA\/|;\s*wv\)/i.test(
      rawUa
    );
  const iosMissingSafariWebView =
    isIOS &&
    /AppleWebKit/i.test(rawUa) &&
    !/Safari\//i.test(rawUa) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(rawUa);

  const isInAppBrowser = Boolean(inAppToken || iosMissingSafariWebView);
  const isIosOtherBrowser = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(rawUa);
  const isIosSafari = isIOS && !isInAppBrowser && !isIosOtherBrowser;

  let platformKind = 'desktop_manual';
  let platformLabel = 'Navegador Desktop';

  if (standalone) {
    platformKind = 'standalone';
    platformLabel = 'App Instalado (PWA)';
  } else if (isInAppBrowser) {
    platformKind = 'in_app_browser';
    platformLabel = isIOS ? 'Navegador interno (iPhone)' : 'Navegador interno (Android)';
  } else if (hasDeferredPrompt) {
    platformKind = 'native_prompt';
    platformLabel = isAndroid ? 'Android (Instalação direta)' : 'Navegador compatível';
  } else if (isIosSafari) {
    platformKind = 'ios_safari';
    platformLabel = 'Safari (iPhone / iPad)';
  } else if (isIosOtherBrowser) {
    platformKind = 'ios_other_browser';
    if (/CriOS/i.test(rawUa)) platformLabel = 'Chrome no iOS';
    else if (/EdgiOS/i.test(rawUa)) platformLabel = 'Edge no iOS';
    else if (/FxiOS/i.test(rawUa)) platformLabel = 'Firefox no iOS';
    else platformLabel = 'Navegador iOS';
  } else if (isAndroid) {
    platformKind = 'android_manual';
    platformLabel = /Firefox/i.test(rawUa) ? 'Firefox Android' : 'Navegador Android';
  }

  return {
    isIOS,
    isAndroid,
    isInAppBrowser,
    platformKind,
    platformLabel
  };
}

function readSessionDismissed() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(INSTALL_DISMISSED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(() =>
    typeof window !== 'undefined' ? window.__irontrackerInstallPrompt || null : null
  );
  const [isStandalone, setIsStandalone] = useState(() => isRunningStandalone());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => readSessionDismissed());
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePromptReady = () => {
      setDeferredPrompt(window.__irontrackerInstallPrompt || null);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    const handleStandaloneChange = () => {
      setIsStandalone(isRunningStandalone(window));
    };

    window.addEventListener('irontracker:install-prompt-ready', handlePromptReady);
    window.addEventListener('irontracker:app-installed', handleInstalled);

    let mql = null;
    if (window.matchMedia) {
      mql = window.matchMedia('(display-mode: standalone)');
      if (mql.addEventListener) {
        mql.addEventListener('change', handleStandaloneChange);
      } else if (mql.addListener) {
        mql.addListener(handleStandaloneChange);
      }
    }

    return () => {
      window.removeEventListener('irontracker:install-prompt-ready', handlePromptReady);
      window.removeEventListener('irontracker:app-installed', handleInstalled);
      if (mql) {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', handleStandaloneChange);
        } else if (mql.removeListener) {
          mql.removeListener(handleStandaloneChange);
        }
      }
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;

  const env = detectPwaEnvironment({
    ua,
    maxTouchPoints,
    hasDeferredPrompt: Boolean(deferredPrompt),
    standalone: isStandalone
  });

  const dismissForSession = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(INSTALL_DISMISSED_SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  const promptInstall = useCallback(async () => {
    const targetPrompt = deferredPrompt || (typeof window !== 'undefined' ? window.__irontrackerInstallPrompt : null);
    if (!targetPrompt || typeof targetPrompt.prompt !== 'function') {
      return { outcome: 'unavailable' };
    }
    try {
      await targetPrompt.prompt();
      const choice = await targetPrompt.userChoice;
      if (typeof window !== 'undefined') {
        window.__irontrackerInstallPrompt = null;
      }
      setDeferredPrompt(null);
      if (choice?.outcome === 'accepted') {
        setIsInstalled(true);
      }
      return { outcome: choice?.outcome || 'dismissed' };
    } catch {
      return { outcome: 'error' };
    }
  }, [deferredPrompt]);

  const copyAppLink = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    const url = window.location.origin || window.location.href;
    let ok = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }

    if (!ok && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, url.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }

    if (ok) {
      setLinkCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2500);
    }
    return ok;
  }, []);

  return {
    isStandalone,
    isInstalled,
    canPromptNative: Boolean(deferredPrompt),
    isInAppBrowser: env.isInAppBrowser,
    isIOS: env.isIOS,
    isAndroid: env.isAndroid,
    platformKind: env.platformKind,
    platformLabel: env.platformLabel,
    isDismissed,
    dismissForSession,
    promptInstall,
    copyAppLink,
    linkCopied
  };
}
