import { useState, useEffect, useCallback, useRef } from 'react';

const META_CACHE_NAME = 'irontracker-sw-meta';
const META_VERSION_KEY = '/__irontracker_sw_version__';
const AUTO_CHECK_THROTTLE_MS = 15 * 60 * 1000; // 15 min

async function readActiveSwVersion() {
  try {
    if (typeof caches === 'undefined') return '';
    const cache = await caches.open(META_CACHE_NAME);
    const res = await cache.match(META_VERSION_KEY);
    if (res) {
      return (await res.text()).trim();
    }
  } catch {
    // ignore
  }
  return '';
}

function formatShortVersion(rawVersion) {
  if (!rawVersion) return '';
  const cleaned = String(rawVersion).replace(/^irontracker-shell-/, '').trim();
  return cleaned ? `v${cleaned.slice(0, 7)}` : '';
}

export function usePwaUpdate() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [hasPwaUpdate, setHasPwaUpdate] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  const registrationRef = useRef(null);
  const reloadingRef = useRef(false);
  const lastAutoCheckRef = useRef(0);

  const attachRegistration = useCallback((reg) => {
    if (!reg) return;
    registrationRef.current = reg;

    if (reg.waiting && navigator.serviceWorker?.controller) {
      setHasPwaUpdate(true);
      setUpdateStatusMsg('Nova versão pronta para instalar.');
    }

    const handleUpdateFound = () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker?.controller) {
          setHasPwaUpdate(true);
          setUpdateStatusMsg('Nova versão pronta para instalar.');
        }
      });
    };

    reg.addEventListener?.('updatefound', handleUpdateFound);
    return () => {
      reg.removeEventListener?.('updatefound', handleUpdateFound);
    };
  }, []);

  useEffect(() => {
    let cleanupReg = null;
    let mounted = true;

    readActiveSwVersion().then((ver) => {
      if (mounted && ver) setCurrentVersion(ver);
    });

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const initRegistration = async () => {
      try {
        const existing =
          window.__irontrackerSwRegistration ||
          (await navigator.serviceWorker.getRegistration('/'));
        if (mounted && existing) {
          cleanupReg = attachRegistration(existing);
        }
      } catch {
        // ignore
      }
    };
    initRegistration();

    const handleSwRegistered = (e) => {
      if (cleanupReg) cleanupReg();
      cleanupReg = attachRegistration(e.detail);
    };

    const handleControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };

    window.addEventListener('irontracker:sw-registered', handleSwRegistered);
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      mounted = false;
      if (cleanupReg) cleanupReg();
      window.removeEventListener('irontracker:sw-registered', handleSwRegistered);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [attachRegistration]);

  const checkForUpdates = useCallback(async ({ manual = false } = {}) => {
    if (typeof window === 'undefined') return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (manual) {
        setUpdateStatusMsg('Sem conexão — app pronto para uso offline.');
      }
      return false;
    }

    const now = Date.now();
    if (!manual && now - lastAutoCheckRef.current < AUTO_CHECK_THROTTLE_MS) {
      return false;
    }
    lastAutoCheckRef.current = now;

    if (manual) {
      setIsCheckingUpdate(true);
      setUpdateStatusMsg('');
    }

    try {
      let reg = registrationRef.current;
      if (!reg && 'serviceWorker' in navigator) {
        reg =
          window.__irontrackerSwRegistration ||
          (await navigator.serviceWorker.getRegistration('/'));
        if (reg) registrationRef.current = reg;
      }

      if (reg && typeof reg.update === 'function') {
        await reg.update().catch(() => {});
        if (reg.waiting && navigator.serviceWorker?.controller) {
          setHasPwaUpdate(true);
          setUpdateStatusMsg('Nova versão pronta para instalar.');
          return true;
        }
      }

      // Fallback via precache-manifest.json comparado com irontracker-sw-meta
      const activeVer = (await readActiveSwVersion()) || currentVersion;
      if (activeVer) setCurrentVersion(activeVer);

      const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const remoteVer = typeof data?.version === 'string' ? data.version.trim() : '';
        if (remoteVer) {
          setLatestVersion(remoteVer);
          if (
            activeVer &&
            remoteVer !== activeVer &&
            !remoteVer.endsWith('-dev') &&
            !activeVer.includes('fallback')
          ) {
            setHasPwaUpdate(true);
            setUpdateStatusMsg('Nova versão disponível.');
            return true;
          }
        }
      }

      if (manual) {
        setUpdateStatusMsg('Você já está na versão mais recente.');
      }
      return false;
    } catch {
      if (manual) {
        setUpdateStatusMsg('Não foi possível verificar agora. Tente novamente online.');
      }
      return false;
    } finally {
      if (manual) setIsCheckingUpdate(false);
    }
  }, [currentVersion]);

  // Verificação throttled em retorno ao app (visibilitychange) e ao recuperar internet (online)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates({ manual: false });
      }
    };
    const onOnline = () => {
      checkForUpdates({ manual: false });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [checkForUpdates]);

  const applyUpdate = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateStatusMsg('Aplicando atualização...');

    try {
      let reg = registrationRef.current;
      if (!reg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        reg =
          window.__irontrackerSwRegistration ||
          (await navigator.serviceWorker.getRegistration('/'));
        if (reg) registrationRef.current = reg;
      }

      const activateWorker = (worker) => {
        if (!worker) return false;
        worker.postMessage({ type: 'SKIP_WAITING' });
        return true;
      };

      if (reg?.waiting) {
        activateWorker(reg.waiting);
        return;
      }

      if (reg && typeof reg.update === 'function') {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          activateWorker(reg.waiting);
          return;
        }
        if (reg.installing) {
          // Aguarda pré-cache de install terminar antes de ativar (evita tela branca)
          await new Promise((resolve) => {
            const inst = reg.installing;
            if (!inst) return resolve();
            const timer = setTimeout(resolve, 12000);
            inst.addEventListener('statechange', () => {
              if (inst.state === 'installed' || inst.state === 'redundant') {
                clearTimeout(timer);
                resolve();
              }
            });
          });
          if (reg.waiting) {
            activateWorker(reg.waiting);
            return;
          }
        }
      }

      // Fallback final apenas se não houver worker waiting nem installing
      if (!reloadingRef.current) {
        reloadingRef.current = true;
        window.location.reload();
      }
    } catch {
      setIsUpdating(false);
      setUpdateStatusMsg('Falha ao atualizar. Tente novamente.');
    }
  }, [isUpdating]);

  return {
    currentVersion,
    currentShortVersion: formatShortVersion(currentVersion),
    latestVersion,
    latestShortVersion: formatShortVersion(latestVersion),
    hasPwaUpdate,
    isCheckingUpdate,
    isUpdating,
    updateStatusMsg,
    checkForUpdates,
    applyUpdate
  };
}
