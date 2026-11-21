import { MONTHS_ORDER } from './exerciseNormalizer.js';
import { getLocalIsoWeekKey } from '../services/storageService.js';

/**
 * Retorna chave de data local pura YYYY-MM-DD (imune a variações de Intl/locale no iOS Safari).
 */
export function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Avalia se um registro de série pertence ao escopo selecionado para contagem ou limpeza granular.
 * Suporta tanto logs v3 (com `month` e `workout`) quanto logs legados v1/v2.
 */
export function matchesLogScope(canonicalKey, logItem, criteria) {
  if (!logItem || !criteria) return false;
  const {
    period = 'week', // 'week' | 'month' | 'all'
    workoutScope = 'ALL', // 'A' | 'B' | 'C' | 'ALL'
    targetMonth = '',
    workoutExerciseKeysByTab = null,
    now = new Date()
  } = criteria;

  if (period === 'all') return true;

  const itemDate = new Date(logItem.date);
  if (Number.isNaN(itemDate.getTime())) return false;

  if (period === 'week') {
    if (getLocalIsoWeekKey(itemDate) !== getLocalIsoWeekKey(now)) return false;
  } else if (period === 'month') {
    const logMonth = (logItem.month || '').trim() || MONTHS_ORDER[itemDate.getMonth()];
    if (logMonth !== targetMonth) return false;
  } else {
    return false;
  }

  if (workoutScope === 'ALL') return true;

  const normalizedLogWorkout = (logItem.workout || '').trim().toUpperCase();
  if (normalizedLogWorkout) {
    return normalizedLogWorkout === workoutScope;
  }

  // Fallback retrocompatível para logs legados v1/v2 sem o campo `workout`
  const keySet = workoutExerciseKeysByTab?.[workoutScope];
  return Boolean(keySet && keySet.has(canonicalKey));
}
