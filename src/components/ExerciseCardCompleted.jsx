import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { formatWeightDisplay } from '../utils/numberFormat';

export default function ExerciseCardCompleted({
  data,
  cardRef = null,
  pairMeta = null,
  displayTitle,
  isOptional,
  canonicalKey,
  lastLog,
  todaySetsCount,
  onToggleComplete,
  isScaledUp = false
}) {
  return (
    <div
      ref={cardRef}
      className="scroll-mt-20 bg-emerald-950/35 border border-emerald-800/80 rounded-2xl p-3 mb-2.5 flex items-center justify-between gap-2.5 shadow-sm transition-all"
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
        <div className="bg-emerald-800/80 p-2 rounded-full flex-shrink-0">
          <Check className="w-4 h-4 text-emerald-100" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-1.5">
            {pairMeta && (
              <span className="text-xs font-extrabold bg-amber-950/80 text-amber-300 border border-amber-700/70 px-1.5 py-0.5 rounded-md font-mono">
                {pairMeta.step}/{pairMeta.total}
              </span>
            )}
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider truncate">
              {data['Grupo muscular']}
            </span>
            {todaySetsCount > 0 && (
              <span className="text-xs font-bold bg-emerald-900/70 text-emerald-200 px-1.5 py-0.5 rounded-md">
                {todaySetsCount} {todaySetsCount === 1 ? 'série' : 'séries'}
              </span>
            )}
            {isOptional && (
              <span className="text-xs font-bold bg-purple-900/60 text-purple-200 px-1.5 py-0.5 rounded-full uppercase">
                Opcional
              </span>
            )}
          </div>
          <h3 className={`text-sm font-bold text-emerald-100 mt-0.5 ${isScaledUp ? 'leading-snug' : 'truncate'}`}>
            {displayTitle}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {lastLog && (
          <span className="text-xs font-bold text-emerald-100 bg-emerald-900/70 border border-emerald-700/60 px-2.5 py-1.5 rounded-xl font-mono">
            {formatWeightDisplay(lastLog.weight)}kg{lastLog.reps ? ` × ${lastLog.reps}` : ''}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(canonicalKey);
          }}
          aria-label={`Reabrir ${displayTitle}`}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-700/60 transition-colors cursor-pointer"
          title="Reabrir exercício"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
