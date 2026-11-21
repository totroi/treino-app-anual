import React from 'react';
import { Calendar, ChevronDown, FileText, BookOpen } from 'lucide-react';

export default function MonthAndGuidesBar({
  availableMonths,
  selectedMonth,
  onSelectMonth,
  onOpenMonthGuide,
  onOpenPrinciples,
  uiScale = 'normal'
}) {
  const isExtraLarge = uiScale === 'xlarge';

  return (
    <div className="bg-zinc-950/90 border-b border-zinc-900">
      <div
        className={`max-w-md mx-auto px-3 py-2.5 ${
          isExtraLarge ? 'space-y-2' : 'flex items-center gap-2'
        }`}
      >
        <div className="relative flex-1 min-w-0">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
          <select
            aria-label="Selecionar mês da periodização"
            value={selectedMonth}
            onChange={(e) => onSelectMonth(e.target.value)}
            className="w-full min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer truncate"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m} className="bg-zinc-950 text-white">
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>

        <div className={isExtraLarge ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-2 flex-shrink-0'}>
          <button
            type="button"
            onClick={onOpenMonthGuide}
            className="min-h-[44px] px-3 py-2 flex items-center justify-center gap-1.5 bg-blue-950/60 text-blue-300 border border-blue-800/70 rounded-xl text-xs font-bold hover:bg-blue-900/50 transition-colors cursor-pointer"
            title={`Abrir Guia de ${selectedMonth}`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>{isExtraLarge ? `Guia ${selectedMonth}` : 'Guia'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrinciples}
            className="min-h-[44px] px-3 py-2 flex items-center justify-center gap-1.5 bg-amber-950/60 text-amber-300 border border-amber-700/70 rounded-xl text-xs font-bold hover:bg-amber-900/50 transition-colors cursor-pointer"
            title="Princípios Básicos da Hipertrofia"
          >
            <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Princípios</span>
          </button>
        </div>
      </div>
    </div>
  );
}
