import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function WorkoutTabs({
  selectedWorkout,
  onSelectWorkout,
  workoutMetaByTab
}) {
  return (
    <div
      role="tablist"
      aria-label="Divisão de treino"
      className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800/90 mb-3"
    >
      {['A', 'B', 'C'].map((workout) => {
        const meta = workoutMetaByTab?.[workout] || { musclesText: '', isDone: false };
        const isSelected = selectedWorkout === workout;

        return (
          <button
            key={workout}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectWorkout(workout)}
            className={`min-h-[50px] py-1.5 px-2 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-1 text-sm font-extrabold leading-none">
              <span>Treino {workout}</span>
              {meta.isDone && (
                <CheckCircle2
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isSelected ? 'text-emerald-200' : 'text-emerald-400'
                  }`}
                />
              )}
            </span>
            {meta.musclesText && (
              <span
                className={`text-[0.65rem] leading-tight mt-1 truncate max-w-full ${
                  isSelected ? 'text-blue-100' : 'text-zinc-400'
                }`}
              >
                {meta.musclesText}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
