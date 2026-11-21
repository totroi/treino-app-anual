import { useState, useEffect, useCallback } from 'react';
import { parseCSV } from '../utils/exerciseNormalizer';
import { loadCachedWorkoutsCSV, saveCachedWorkoutsCSV } from '../services/storageService';

export function useWorkoutsData(enabled, onNotify) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadWorkoutsData = useCallback(async (isManualSync = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workouts');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setRawData(parsed);
        setIsOfflineFallback(false);
        saveCachedWorkoutsCSV(text);
        setLastSyncedAt(new Date().toISOString());
        if (isManualSync && onNotify) onNotify('Planilha sincronizada com sucesso!');
        return;
      }
      throw new Error('CSV vazio');
    } catch {
      // 1. Tenta o último CSV sincronizado em cache local antes do fallback estático
      const cached = loadCachedWorkoutsCSV();
      if (cached && cached.csv) {
        const parsedCache = parseCSV(cached.csv);
        if (parsedCache.length > 0) {
          setRawData(parsedCache);
          setIsOfflineFallback(true);
          setLastSyncedAt(cached.syncedAt || null);
          if (isManualSync && onNotify) onNotify('Offline: usando última planilha sincronizada.');
          return;
        }
      }

      // 2. Carregamento sob demanda (lazy chunk) do fallback estático (-103KB no bundle inicial)
      try {
        const { INITIAL_CSV_DATA } = await import('../data/fallbackWorkouts');
        const parsedFallback = parseCSV(INITIAL_CSV_DATA);
        setRawData(parsedFallback);
        setIsOfflineFallback(true);
        if (isManualSync && onNotify) onNotify('Modo offline: usando base local.');
      } catch (err) {
        console.error('Erro ao carregar fallback offline:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

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
