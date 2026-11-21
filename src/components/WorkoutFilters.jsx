import React, { useState } from 'react';
import { Sparkles, Search, X } from 'lucide-react';

export default function WorkoutFilters({
  selectedWorkout,
  progressStats,
  hideOptionals,
  onToggleHideOptionals,
  muscleGroupsWithCount,
  selectedMuscleGroup,
  onSelectMuscleGroup,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalBaseCount,
  uiScale = 'normal'
}) {
  const [showSearch, setShowSearch] = useState(false);

  const displayedCompleted = hideOptionals
    ? progressStats.completedMandatory
    : progressStats.completedTotal;
  const displayedTotal = hideOptionals
    ? progressStats.mandatoryCount
    : progressStats.total;
  const displayedPct = displayedTotal > 0 ? Math.round((displayedCompleted / displayedTotal) * 100) : 0;

  return (
    <div className="space-y-3 mb-4">
      {/* Barra de Progresso do Treino */}
      {progressStats.total > 0 && (
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-2 text-xs mb-2">
            <span className="font-bold text-zinc-200">
              Progresso do Treino {selectedWorkout}
            </span>
            <span className="font-extrabold text-blue-400">
              {displayedCompleted}/{displayedTotal} ({displayedPct}%)
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                displayedPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${displayedPct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
            <span className="text-xs text-zinc-400">
              Obrigatórios:{' '}
              <strong className="text-zinc-100">
                {progressStats.completedMandatory}/{progressStats.mandatoryCount}
              </strong>
              {hideOptionals && progressStats.optionalCount > 0 && (
                <span className="text-zinc-500"> (+{progressStats.optionalCount} opc. ocultos)</span>
              )}
            </span>

            {progressStats.optionalCount > 0 && (
              <button
                type="button"
                onClick={onToggleHideOptionals}
                className={`min-h-[38px] px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  hideOptionals
                    ? 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    : 'bg-purple-950/60 text-purple-200 border-purple-700/70 hover:bg-purple-900/60'
                }`}
                title="Opcionais são exercícios extras para usar quando houver tempo e energia"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {hideOptionals
                    ? `Exibir Opcionais (${progressStats.optionalCount})`
                    : 'Ocultar Opcionais'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Chips Musculares + Busca Rápida & Filtro de Status */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Chips de Grupo Muscular com fade lateral indicando scroll */}
          <div className="relative flex-1 min-w-0">
            <div
              className={`flex items-center gap-1.5 ${
                uiScale === 'xlarge'
                  ? 'flex-wrap'
                  : 'overflow-x-auto no-scrollbar pr-6'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectMuscleGroup('TODOS')}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                  selectedMuscleGroup === 'TODOS'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Todos ({totalBaseCount})
              </button>
              {muscleGroupsWithCount.map(({ group, count }) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => onSelectMuscleGroup(group)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors cursor-pointer ${
                    selectedMuscleGroup === group
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {group} ({count})
                </button>
              ))}
            </div>
            {uiScale !== 'xlarge' && muscleGroupsWithCount.length > 2 && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent" />
            )}
          </div>

          {/* Botão Lupa (Busca rápida nos exercícios) */}
          <button
            type="button"
            onClick={() => {
              setShowSearch((prev) => {
                if (prev) onSearchQueryChange('');
                return !prev;
              });
            }}
            aria-label="Buscar exercício ou técnica"
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-colors flex-shrink-0 cursor-pointer ${
              showSearch || searchQuery
                ? 'bg-blue-950/70 border-blue-600 text-blue-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            {showSearch ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Input de busca expansível + Pílula Pendentes/Todos (Item 3.4) */}
        {(showSearch || searchQuery) && (
          <div className="flex items-center gap-2 ui-fade-in">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Buscar exercício ou técnica..."
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'PENDENTES' ? 'TODOS' : 'PENDENTES')}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === 'PENDENTES'
                  ? 'bg-amber-950/60 border-amber-700 text-amber-200'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {statusFilter === 'PENDENTES' ? 'Só Pendentes' : 'Todos Status'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
