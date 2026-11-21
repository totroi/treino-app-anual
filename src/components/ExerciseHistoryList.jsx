import React, { useState, useMemo } from 'react';
import { Trash2, Trophy } from 'lucide-react';
import {
  formatWeightDisplay,
  computeWeightDelta,
  formatWeightDelta,
  parsePtBrNumber
} from '../utils/numberFormat';

export default function ExerciseHistoryList({ history, canonicalKey, onDeleteLog }) {
  const [confirmingId, setConfirmingId] = useState(null);

  const maxWeight = useMemo(() => {
    if (!history || history.length === 0) return 0;
    return history.reduce((max, item) => {
      const w = parsePtBrNumber(item.weight);
      return !Number.isNaN(w) && w > max ? w : max;
    }, 0);
  }, [history]);

  return (
    <div
      className="mt-4 pt-3 border-t border-zinc-800 ui-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Histórico Unificado ({history?.length || 0})
        </h4>
        <span className="text-xs text-zinc-500">12 meses</span>
      </div>

      {history && history.length > 0 ? (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {history.map((log, idx) => {
            const prevLog = history[idx + 1];
            const diff = prevLog ? computeWeightDelta(log.weight, prevLog.weight) : 0;
            const entryWeight = parsePtBrNumber(log.weight);
            const isPR = maxWeight > 0 && !Number.isNaN(entryWeight) && entryWeight === maxWeight;
            const itemKey = log.id || `${idx}`;
            const isConfirming = confirmingId === itemKey;

            return (
              <div
                key={itemKey}
                className="flex items-center justify-between gap-2 text-xs p-2.5 bg-zinc-950 rounded-xl border border-zinc-800"
              >
                <div className="min-w-0">
                  <div className="text-zinc-300 font-medium">
                    {new Date(log.date).toLocaleDateString('pt-BR')}
                    {log.setNumber ? <span className="text-zinc-500"> • Série #{log.setNumber}</span> : null}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 mt-1">
                    <span className="font-mono font-extrabold text-sm text-white">
                      {formatWeightDisplay(log.weight)}kg
                    </span>
                    {log.reps && <span className="text-zinc-400">{log.reps} reps</span>}
                    {isPR && (
                      <span className="inline-flex items-center gap-0.5 text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/70">
                        <Trophy className="w-3 h-3" />
                        PR
                      </span>
                    )}
                    {diff !== 0 && (
                      <span
                        className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                          diff > 0
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}
                      >
                        {formatWeightDelta(diff)}
                      </span>
                    )}
                  </div>
                </div>

                {onDeleteLog && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isConfirming ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="min-h-[44px] px-2.5 rounded-lg bg-zinc-900 text-zinc-300 text-xs font-bold cursor-pointer"
                        >
                          Não
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteLog(canonicalKey, log.id, idx);
                            setConfirmingId(null);
                          }}
                          className="min-h-[44px] px-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                        >
                          Apagar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(itemKey)}
                        aria-label="Excluir registro"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-red-400 rounded-xl hover:bg-zinc-900 transition-colors cursor-pointer"
                        title="Excluir este registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-zinc-400 italic">Nenhum registro salvo para este exercício ainda.</p>
      )}
    </div>
  );
}
