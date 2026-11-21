import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Download } from 'lucide-react';

export default function ConfirmResetModal({
  mode, // 'session' | 'full' | null
  username,
  selectedMonth,
  selectedWorkout,
  onBackupFirst,
  onConfirm,
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
              {isFull
                ? 'Resetar Todo o Progresso?'
                : `Nova Sessão (${selectedMonth} • Treino ${selectedWorkout})?`}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Conta: @{username}</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          {isFull ? (
            <>
              Esta ação apagará <strong className="text-red-300">todo o histórico de cargas registradas</strong> e as sessões concluídas neste dispositivo. Essa operação não pode ser desfeita.
            </>
          ) : (
            <>
              Isso reabrirá apenas os exercícios concluídos do <strong className="text-white">Treino {selectedWorkout} de {selectedMonth}</strong>. Todo o seu histórico de cargas continuará salvo.
            </>
          )}
        </p>

        {isFull && onBackupFirst && (
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
            onClick={onConfirm}
            className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-sm font-bold text-white shadow-lg transition-colors cursor-pointer ${
              isFull
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            {isFull ? 'Sim, Resetar Tudo' : 'Iniciar Nova Sessão'}
          </button>
        </div>
      </div>
    </div>
  );
}
