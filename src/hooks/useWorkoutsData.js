import { useState, useEffect, useCallback } from 'react';
import { parseCSV } from '../utils/exerciseNormalizer';
import { loadCachedWorkoutsCSV, saveCachedWorkoutsCSV } from '../services/storageService';

// TTL de 24h: na 1ª abertura baixa a planilha e grava localmente; nas reaberturas seguintes (inclusive
// novos usuários abrindo 10x no dia ou em academias de subsolo sem sinal) abre em 0ms com 0 chamadas de API.
export const WORKOUTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function useWorkoutsData(enabled, onNotify, sexo = 'M') {
  const normalizedSexo = String(sexo || 'M').trim().toUpperCase() === 'F' ? 'F' : 'M';
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const fetchAndStoreFromNetwork = useCallback(
    async ({ silent = false, isManualSync = false } = {}) => {
      const response = await fetch(`/api/workouts?sexo=${normalizedSexo}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) throw new Error('CSV vazio');

      setRawData(parsed);
      setIsOfflineFallback(false);
      saveCachedWorkoutsCSV(text, normalizedSexo);
      setLastSyncedAt(new Date().toISOString());
      if (isManualSync && !silent && onNotify) {
        onNotify('Planilha sincronizada com sucesso!');
      }
      return true;
    },
    [normalizedSexo, onNotify]
  );

  const loadWorkoutsData = useCallback(
    async (isManualSync = false) => {
      const isNavigatorOffline =
        typeof navigator !== 'undefined' && navigator.onLine === false;

      // 1. Modo Cache-First (abertura automática): se já existe CSV sincronizado localmente,
      //    exibe instantaneamente em 0ms. Dentro de 24h faz ZERO chamadas de rede; após 24h
      //    revalida silenciosamente em 2º plano sem travar a tela.
      if (!isManualSync) {
        const cached = loadCachedWorkoutsCSV(normalizedSexo);
        if (cached && cached.csv) {
          const parsedCache = parseCSV(cached.csv);
          if (parsedCache.length > 0) {
            setRawData(parsedCache);
            setLastSyncedAt(cached.syncedAt || null);
            setIsOfflineFallback(isNavigatorOffline);
            setLoading(false);

            const syncedMs = cached.syncedAt ? Date.parse(cached.syncedAt) : 0;
            const isFresh =
              Number.isFinite(syncedMs) &&
              syncedMs > 0 &&
              Date.now() - syncedMs < WORKOUTS_CACHE_TTL_MS;

            if (isFresh || isNavigatorOffline) {
              return;
            }

            // Cache com mais de 24h e online: revalida em segundo plano sem spinner
            fetchAndStoreFromNetwork({ silent: true, isManualSync: false }).catch(() => {
              setIsOfflineFallback(true);
            });
            return;
          }
        }
      }

      setLoading(true);
      try {
        await fetchAndStoreFromNetwork({ silent: false, isManualSync });
        return;
      } catch {
        // 2. Fallback para o último CSV sincronizado em cache local (escopado por sexo)
        const cached = loadCachedWorkoutsCSV(normalizedSexo);
        if (cached && cached.csv) {
          const parsedCache = parseCSV(cached.csv);
          if (parsedCache.length > 0) {
            setRawData(parsedCache);
            setIsOfflineFallback(true);
            setLastSyncedAt(cached.syncedAt || null);
            if (isManualSync && onNotify) {
              onNotify('Offline: usando última planilha sincronizada.');
            }
            return;
          }
        }

        // 3. Fallback final: lazy chunk estático pré-cacheado pelo Service Worker correspondente ao sexo
        try {
          if (normalizedSexo === 'F') {
            const { FEMALE_CSV_DATA } = await import('../data/fallbackWorkoutsFemale');
            const parsedFallback = parseCSV(FEMALE_CSV_DATA);
            setRawData(parsedFallback);
          } else {
            const { INITIAL_CSV_DATA } = await import('../data/fallbackWorkouts');
            const parsedFallback = parseCSV(INITIAL_CSV_DATA);
            setRawData(parsedFallback);
          }
          setIsOfflineFallback(true);
          if (isManualSync && onNotify) onNotify('Modo offline: usando base local.');
        } catch (err) {
          console.error('Erro ao carregar fallback offline:', err);
        }
      } finally {
        setLoading(false);
      }
    },
    [normalizedSexo, onNotify, fetchAndStoreFromNetwork]
  );

  useEffect(() => {
    if (enabled) {
      loadWorkoutsData(false);
    }
  }, [enabled, loadWorkoutsData]);

  return {
    rawData,
    loading,
    isOfflineFallback,
    lastSyncedAt,
    syncWorkouts: () => loadWorkoutsData(true)
  };
}
