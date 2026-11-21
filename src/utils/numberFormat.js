/**
 * Utilitários de normalização e formatação numérica padrão pt-BR (suporta vírgula decimal e evita ruído float)
 */
export function parsePtBrNumber(raw) {
  if (raw === null || raw === undefined) return NaN;
  const normalized = String(raw).trim().replace(',', '.');
  if (!normalized) return NaN;
  return Number.parseFloat(normalized);
}

export function normalizeWeightInput(raw) {
  if (raw === null || raw === undefined) return '';
  const cleaned = String(raw).trim().replace(',', '.');
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return '';
  return String(Number(num.toFixed(2)));
}

export function formatWeightDisplay(raw) {
  const num = parsePtBrNumber(raw);
  if (Number.isNaN(num)) return String(raw || '');
  return String(Number(num.toFixed(2))).replace('.', ',');
}

export function computeWeightDelta(currentWeight, previousWeight) {
  const curr = parsePtBrNumber(currentWeight);
  const prev = parsePtBrNumber(previousWeight);
  if (Number.isNaN(curr) || Number.isNaN(prev)) return 0;
  return Number((curr - prev).toFixed(2));
}

export function formatWeightDelta(delta) {
  if (!delta || Number.isNaN(delta)) return '';
  const formatted = String(Math.abs(Number(delta.toFixed(2)))).replace('.', ',');
  return delta > 0 ? `+${formatted}kg` : `-${formatted}kg`;
}
