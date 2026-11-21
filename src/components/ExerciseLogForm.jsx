import React, { useState, useRef, useEffect } from 'react';
import { Save, History, CheckCircle2, Check } from 'lucide-react';
import { formatWeightDisplay, parsePtBrNumber } from '../utils/numberFormat';

export default function ExerciseLogForm({
  exerciseId,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  lastLog,
  defaultRepsPlaceholder,
  todaySetsCount,
  historyCount,
  showHistory,
  onSaveSet,
  onToggleComplete,
  onToggleHistory
}) {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const canSave = !Number.isNaN(parsePtBrNumber(weight));

  const handleSave = (e) => {
    e.stopPropagation();
    if (!canSave) return;
    onSaveSet();
    setSavedSuccess(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSavedSuccess(false), 1800);
  };

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      {/* Linha 1: Inputs >= 16px (text-base) com suporte a vírgula pt-BR */}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label
            htmlFor={`weight-${exerciseId}`}
            className="text-xs text-zinc-400 mb-1 block font-semibold"
          >
            Carga (kg)
          </label>
          <input
            id={`weight-${exerciseId}`}
            type="text"
            inputMode="decimal"
            enterKeyHint="next"
            placeholder={lastLog ? `Última: ${formatWeightDisplay(lastLog.weight)}kg` : 'ex: 20,5'}
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(e); }}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-700 bg-black text-white text-base placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label
            htmlFor={`reps-${exerciseId}`}
            className="text-xs text-zinc-400 mb-1 block font-semibold"
          >
            Reps
          </label>
          <input
            id={`reps-${exerciseId}`}
            type="text"
            inputMode="numeric"
            enterKeyHint="done"
            placeholder={`ex: ${defaultRepsPlaceholder}`}
            value={reps}
            onChange={(e) => onRepsChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(e); }}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-700 bg-black text-white text-base placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Linha 2: Ações desacopladas (>= 44px) — Salvar Série (mantém aberto) | Concluir | Histórico */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            savedSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>
            {savedSuccess
              ? 'Série Salva!'
              : todaySetsCount > 0
              ? `Salvar Série #${todaySetsCount + 1}`
              : 'Salvar Série'}
          </span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          aria-label="Concluir exercício"
          title="Marcar exercício como concluído"
          className="min-h-[44px] px-3 rounded-xl border border-emerald-800/80 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer flex-shrink-0"
        >
          <Check className="w-4 h-4" />
          <span>Concluir</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleHistory();
          }}
          aria-label="Ver histórico de cargas"
          aria-expanded={showHistory}
          title="Ver histórico de cargas"
          className={`min-w-[44px] min-h-[44px] px-2.5 rounded-xl border flex items-center justify-center transition-all relative cursor-pointer flex-shrink-0 ${
            showHistory
              ? 'bg-blue-950/60 border-blue-500/80 text-blue-300'
              : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white'
          }`}
        >
          <History className="w-5 h-5" />
          {historyCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[0.65rem] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
              {historyCount > 9 ? '9+' : historyCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
