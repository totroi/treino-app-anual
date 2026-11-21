import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Download, ShieldCheck, CalendarSync } from 'lucide-react';

export default function ConfirmResetModal({
  mode, // 'status' | 'full' | null
  username,
  selectedMonth,
  selectedWorkout,
  onBackupFirst,
  onConfirmWorkoutReset,
  onConfirmWeekReset,
  onConfirmFullReset,
  onCancel
}) {
  useEffect(() => {
    if (!mode) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onCancel]);

  if (!mode) return null;

  const isFull = mode === 'full';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 touch-none ui-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={isFull ? 'Confirmar reset total do progresso' : 'Reiniciar status do treino ou da semana'}
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2.5 rounded-xl flex-shrink-0 border ${
              isFull
                ? 'bg-red-950 border-red-800/70 text-red-400'
                : 'bg-sky-950 border-sky-800/70 text-sky-400'
            }`}
          >
            {isFull ? <AlertTriangle className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white leading-tight">
              {isFull ? 'Resetar Todo o Progresso?' : 'Reiniciar Status'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isFull ? `Conta: @${username}` : `${selectedMonth} • Treino ${selectedWorkout}`}
            </p>
          </div>
        </div>

        {isFull ? (
          <>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Esta ação apagará <strong className="text-red-300">todo o histórico de cargas registradas</strong> e as sessões concluídas neste dispositivo. Essa operação não pode ser desfeita.
            </p>

            {onBackupFirst && (
              <button
                type="button"
                onClick={onBackupFirst}
                className="w-full min-h-[44px] mb-3 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-blue-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Baixar Backup (JSON) por Segurança
              </button>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-zinc-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmFullReset}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 text-sm font-bold text-white transition-colors cursor-pointer"
              >
                Sim, Resetar Tudo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2.5 bg-emerald-950/35 border border-emerald-800/60 rounded-xl p-3 mb-4 text-xs text-emerald-100 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-emerald-300">Histórico e PRs preservados:</strong> nenhuma carga registrada será apagada — apenas o status concluído e a contagem de séries da sessão.
              </span>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onConfirmWorkoutReset}
                className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-left flex items-center gap-3 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold leading-tight">
                    Reiniciar apenas Treino {selectedWorkout}
                  </div>
                  <div className="text-xs text-blue-100 leading-snug mt-0.5">
                    Reabre cards e volta para Série #1 só no Treino {selectedWorkout}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onConfirmWeekReset}
                className="w-full min-h-[52px] px-3.5 py-2.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/70 border border-sky-700/70 text-sky-100 text-left flex items-center gap-3 transition-colors cursor-pointer"
              >
                <CalendarSync className="w-5 h-5 text-sky-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold leading-tight">
                    Reiniciar Semana (Treinos A, B e C)
                  </div>
                  <div className="text-xs text-sky-200/80 leading-snug mt-0.5">
                    Inicia um novo ciclo semanal completo em {selectedMonth}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm font-bold text-zinc-300 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
