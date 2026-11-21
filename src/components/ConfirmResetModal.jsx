import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  Download,
  ShieldCheck,
  CalendarSync,
  Trash2,
  X
} from 'lucide-react';

export default function ConfirmResetModal({
  initialTab, // 'status' | 'history' | null
  username,
  selectedMonth,
  selectedWorkout,
  workoutExerciseKeysByTab,
  countLogsInScope,
  onBackupFirst,
  onConfirmWorkoutReset,
  onConfirmWeekReset,
  onConfirmDeleteHistory,
  onCancel
}) {
  const [activeTab, setActiveTab] = useState(initialTab === 'history' ? 'history' : 'status');
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'all'
  const [workoutScope, setWorkoutScope] = useState(selectedWorkout || 'A'); // 'A' | 'B' | 'C' | 'ALL'
  const [armedConfirm, setArmedConfirm] = useState(false);

  useEffect(() => {
    if (!initialTab) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [initialTab, onCancel]);

  if (!initialTab) return null;

  const effectiveWorkoutScope = period === 'all' ? 'ALL' : workoutScope;
  const matchingCount = countLogsInScope
    ? countLogsInScope({
        period,
        workoutScope: effectiveWorkoutScope,
        targetMonth: selectedMonth,
        workoutExerciseKeysByTab
      })
    : 0;

  const scopeLabel =
    period === 'all'
      ? `Todos os 12 meses (@${username})`
      : `${effectiveWorkoutScope === 'ALL' ? 'Treinos A, B e C' : `Treino ${effectiveWorkoutScope}`} • ${
          period === 'week' ? 'Semana atual' : selectedMonth
        }`;

  const canDelete = period === 'all' || matchingCount > 0;

  const handleSelectPeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    setArmedConfirm(false);
  };

  const handleSelectWorkoutScope = (nextScope) => {
    setWorkoutScope(nextScope);
    setArmedConfirm(false);
  };

  const handleDeleteClick = () => {
    if (!canDelete) return;
    if (!armedConfirm) {
      setArmedConfirm(true);
      return;
    }
    onConfirmDeleteHistory({
      period,
      workoutScope: effectiveWorkoutScope
    });
  };

  const isHistoryTab = activeTab === 'history';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 touch-none ui-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Reiniciar status ou apagar histórico"
    >
      <div
        className="w-full max-w-md max-h-[90dvh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-4 pt-3.5 pb-3 border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl flex-shrink-0 border ${
                isHistoryTab
                  ? 'bg-red-950/80 border-red-800/70 text-red-400'
                  : 'bg-sky-950 border-sky-800/70 text-sky-400'
              }`}
            >
              {isHistoryTab ? <Trash2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white leading-tight truncate">
                {isHistoryTab ? 'Apagar Histórico' : 'Reiniciar Status'}
              </h3>
              <p className="text-xs text-zinc-400 truncate mt-0.5">
                {selectedMonth} • Treino {selectedWorkout}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de 2 Abas (Seguro vs. Limpeza Granular) */}
        <div className="px-4 pt-3">
          <div
            role="tablist"
            className="grid grid-cols-2 gap-1.5 p-1 bg-black border border-zinc-800 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isHistoryTab}
              onClick={() => {
                setActiveTab('status');
                setArmedConfirm(false);
              }}
              className={`min-h-[42px] px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                !isHistoryTab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Reiniciar Status
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isHistoryTab}
              onClick={() => {
                setActiveTab('history');
                setArmedConfirm(false);
              }}
              className={`min-h-[42px] px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                isHistoryTab
                  ? 'bg-red-600/90 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Apagar Histórico
            </button>
          </div>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3.5">
          {!isHistoryTab ? (
            <>
              <div className="flex items-start gap-2.5 bg-emerald-950/35 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-100 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-emerald-300">Histórico e PRs preservados:</strong> remove apenas as marcações concluídas (verdinhas) e reinicia a contagem para Série #1.
                </span>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onConfirmWorkoutReset}
                  className="w-full min-h-[54px] px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-left flex items-center gap-3 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold leading-tight">
                      Reiniciar apenas Treino {selectedWorkout}
                    </div>
                    <div className="text-xs text-blue-100 leading-snug mt-0.5">
                      Reabre cards concluídos só do Treino {selectedWorkout}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onConfirmWeekReset}
                  className="w-full min-h-[54px] px-3.5 py-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/70 border border-sky-700/70 text-sky-100 text-left flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <CalendarSync className="w-5 h-5 text-sky-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold leading-tight">
                      Reiniciar Semana (Treinos A, B e C)
                    </div>
                    <div className="text-xs text-sky-200/80 leading-snug mt-0.5">
                      Limpa os concluídos de A, B e C em {selectedMonth}
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2.5 bg-red-950/35 border border-red-800/60 rounded-xl p-3 text-xs text-red-100 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-red-300">Ação permanente:</strong> apaga os registros de cargas do escopo escolhido e reabre os cards concluídos correspondentes.
                </span>
              </div>

              {/* 1. Período */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  1. Período
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'week', label: 'Semana' },
                    { id: 'month', label: selectedMonth },
                    { id: 'all', label: 'Tudo' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectPeriod(opt.id)}
                      className={`min-h-[44px] px-2 rounded-xl border text-xs font-bold truncate transition-colors cursor-pointer ${
                        period === opt.id
                          ? opt.id === 'all'
                            ? 'bg-red-950/80 border-red-500 text-red-200'
                            : 'bg-amber-950/70 border-amber-500 text-amber-200'
                          : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Treino (quando não for Reset Total) */}
              {period !== 'all' && (
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    2. Treino
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'A', label: 'Treino A' },
                      { id: 'B', label: 'Treino B' },
                      { id: 'C', label: 'Treino C' },
                      { id: 'ALL', label: 'A+B+C' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectWorkoutScope(opt.id)}
                        className={`min-h-[44px] px-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          workoutScope === opt.id
                            ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                            : 'bg-black border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prévia ao vivo do impacto */}
              <div className="bg-black border border-zinc-800 rounded-xl p-3 text-center">
                <div className="text-xs text-zinc-400">{scopeLabel}</div>
                <div
                  className={`text-sm font-extrabold mt-1 ${
                    matchingCount > 0 ? 'text-red-300' : 'text-zinc-500'
                  }`}
                >
                  {matchingCount > 0
                    ? `${matchingCount} ${
                        matchingCount === 1 ? 'registro será apagado' : 'registros serão apagados'
                      }`
                    : period === 'all'
                    ? 'Limpará todo o progresso e sessões deste aparelho'
                    : 'Nenhum registro encontrado neste escopo'}
                </div>
              </div>

              {onBackupFirst && canDelete && (
                <button
                  type="button"
                  onClick={onBackupFirst}
                  className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Backup (JSON) antes por segurança
                </button>
              )}

              <button
                type="button"
                disabled={!canDelete}
                onClick={handleDeleteClick}
                className={`w-full min-h-[48px] py-2.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                  armedConfirm
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400/60'
                    : 'bg-red-950/70 hover:bg-red-900/80 border border-red-700/80 text-red-200'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {armedConfirm
                    ? period === 'all'
                      ? 'Confirmar Reset Total'
                      : `Confirmar exclusão (${matchingCount})`
                    : period === 'all'
                    ? `Resetar Tudo (${matchingCount})`
                    : `Apagar ${matchingCount} ${matchingCount === 1 ? 'registro' : 'registros'}`}
                </span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-zinc-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
