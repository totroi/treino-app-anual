import React from 'react';
import { Link2, HelpCircle, ArrowDown } from 'lucide-react';

export default function ExercisePairGroup({
  pairId,
  pairType,
  allCompleted = false,
  onOpenTechniqueHelp,
  children
}) {
  const pairNum = pairId ? pairId.replace(/^PAR-/i, '') : '1';
  const childArray = React.Children.toArray(children);

  return (
    <section
      aria-label={`Par conectado ${pairType}`}
      className={`rounded-2xl border p-2.5 mb-4 transition-all ${
        allCompleted
          ? 'bg-emerald-950/15 border-emerald-800/60 border-l-4 border-l-emerald-500/80'
          : 'bg-amber-950/10 border-amber-800/50 border-l-4 border-l-amber-500/85'
      }`}
    >
      {/* Cabeçalho do Bloco Conectado */}
      <div className="flex items-center justify-between gap-2 px-1 pb-2.5 mb-2 border-b border-amber-900/35">
        <div className="flex items-start gap-2 min-w-0">
          <div
            className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
              allCompleted
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/70'
                : 'bg-amber-950 text-amber-400 border border-amber-800/70'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  allCompleted ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {pairType} • Par {pairNum}
              </span>
              <span className="text-[0.68rem] font-bold px-1.5 py-0.5 rounded-md bg-black border border-zinc-800 text-zinc-300">
                0s entre exercícios
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug mt-0.5">
              Execute <strong className="text-zinc-200">1/2</strong> até a falha e vá direto para{' '}
              <strong className="text-zinc-200">2/2</strong> sem descanso.
            </p>
          </div>
        </div>

        {onOpenTechniqueHelp && (
          <button
            type="button"
            onClick={() => onOpenTechniqueHelp(pairType)}
            aria-label={`Entender ${pairType} no glossário`}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-amber-300 hover:bg-amber-950/60 flex-shrink-0 cursor-pointer"
            title={`Ler sobre ${pairType}`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards conectados com conector visual central "0s" */}
      <div>
        {childArray.map((child, idx) => (
          <React.Fragment key={idx}>
            <div className="[&>article]:mb-0 [&>div]:mb-0">{child}</div>
            {idx < childArray.length - 1 && (
              <div className="flex items-center justify-center py-2 select-none">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black border border-amber-800/60 text-xs font-bold text-amber-300">
                  <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>0s • Sem descanso — ir direto para 2/2</span>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
