import React, { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Dumbbell, CalendarCheck, Download, Search, TrendingUp } from 'lucide-react';
import { formatWeightDisplay, formatWeightDelta } from '../utils/numberFormat';

export default function ResultsModal({
  isOpen,
  onClose,
  currentUser,
  summaryStats,
  backupMeta,
  onExportBackup
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const filteredPrs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = summaryStats?.prs || [];
    if (!q) return list;
    return list.filter((item) => item.label.toLowerCase().includes(q));
  }, [summaryStats, query]);

  if (!isOpen) return null;

  const needsBackup =
    (backupMeta?.logsSinceBackup || 0) >= 10 ||
    ((summaryStats?.totalLogs || 0) >= 10 && !backupMeta?.lastExportedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 touch-none ui-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Meus Resultados e Recordes Pessoais"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-4 pt-3.5 pb-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-amber-600/20 border border-amber-600/50 p-2 rounded-xl text-amber-400 flex-shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-white leading-tight truncate">
                Meus Resultados & PRs
              </h2>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {currentUser?.name} (@{currentUser?.username})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar resultados"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {/* 3 Cards de Resumo */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black border border-zinc-800 rounded-2xl p-3 text-center">
              <Dumbbell className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="text-xl font-extrabold text-white font-mono">
                {summaryStats.totalLogs}
              </div>
              <div className="text-xs text-zinc-400 leading-tight mt-0.5">Séries Salvas</div>
            </div>

            <div className="bg-black border border-zinc-800 rounded-2xl p-3 text-center">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-extrabold text-white font-mono">
                {summaryStats.uniqueExercisesCount}
              </div>
              <div className="text-xs text-zinc-400 leading-tight mt-0.5">Exercícios</div>
            </div>

            <div className="bg-black border border-zinc-800 rounded-2xl p-3 text-center">
              <CalendarCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-extrabold text-white font-mono">
                {summaryStats.sessionsCount}
              </div>
              <div className="text-xs text-zinc-400 leading-tight mt-0.5">Sessões</div>
            </div>
          </div>

          {/* Alerta amigável de backup */}
          {needsBackup && onExportBackup && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-100 leading-relaxed">
                <strong className="text-amber-300 block">Proteja seu histórico!</strong>
                Você tem {backupMeta?.logsSinceBackup || summaryStats.totalLogs} registros novos desde o último backup.
              </div>
              <button
                type="button"
                onClick={onExportBackup}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Backup</span>
              </button>
            </div>
          )}

          {/* Lista de Recordes Pessoais (PRs) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Recordes Pessoais por Exercício
              </h3>
              <span className="text-xs text-zinc-500">{filteredPrs.length} registros</span>
            </div>

            {(summaryStats?.prs?.length || 0) > 4 && (
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filtrar exercício..."
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-black border border-zinc-800 text-base text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}

            {filteredPrs.length === 0 ? (
              <div className="bg-black border border-zinc-800 rounded-2xl p-6 text-center">
                <TrendingUp className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-300">
                  {summaryStats.totalLogs === 0
                    ? 'Nenhum treino registrado ainda'
                    : 'Nenhum exercício encontrado na busca'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Salve suas cargas e repetições nos cards de exercício para ver sua evolução aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPrs.map((item) => {
                  const deltaBadge = formatWeightDelta(item.delta);
                  return (
                    <div
                      key={item.canonicalKey}
                      className="bg-black border border-zinc-800/90 rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white leading-snug truncate">
                          {item.label}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          PR em {new Date(item.prDate).toLocaleDateString('pt-BR')} • {item.totalEntries}{' '}
                          {item.totalEntries === 1 ? 'série' : 'séries'}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-extrabold font-mono text-amber-300">
                          {formatWeightDisplay(item.prWeight)}kg
                          {item.prReps ? (
                            <span className="text-zinc-300 font-normal"> × {item.prReps}</span>
                          ) : null}
                        </div>
                        {deltaBadge && (
                          <span
                            className={`inline-block mt-0.5 text-[0.7rem] font-bold px-1.5 py-0.5 rounded-md ${
                              item.delta > 0
                                ? 'bg-emerald-950/70 text-emerald-300'
                                : 'bg-rose-950/70 text-rose-300'
                            }`}
                          >
                            Última: {deltaBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-zinc-800 bg-zinc-950 flex gap-2">
          {onExportBackup && summaryStats.totalLogs > 0 && (
            <button
              type="button"
              onClick={onExportBackup}
              className="min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-blue-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar JSON</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm cursor-pointer"
          >
            Voltar ao Treino
          </button>
        </div>
      </div>
    </div>
  );
}
