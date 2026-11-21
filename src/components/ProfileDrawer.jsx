import React, { useEffect, useRef } from 'react';
import {
  X,
  Type,
  Moon,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  LogOut,
  Trophy,
  Timer
} from 'lucide-react';

export default function ProfileDrawer({
  isOpen,
  onClose,
  currentUser,
  summaryStats,
  backupMeta,
  uiScale,
  onUiScaleChange,
  screensaverDelay,
  onScreensaverDelayChange,
  autoStartTimer,
  onToggleAutoStartTimer,
  onOpenResults,
  onExportBackup,
  onImportBackupFile,
  onRequestResetSession,
  onRequestFullReset,
  onLogout
}) {
  const fileInputRef = useRef(null);

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

  if (!isOpen) return null;

  const lastBackupText = backupMeta?.lastExportedAt
    ? `Último backup: ${new Date(backupMeta.lastExportedAt).toLocaleDateString('pt-BR')}`
    : 'Nenhum backup exportado ainda';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm touch-none ui-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Menu do Perfil e Preferências"
    >
      <div
        className="w-full max-w-md max-h-[88vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador mobile + Cabeçalho */}
        <div className="px-4 pt-3 pb-3 border-b border-zinc-800/90 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white truncate">{currentUser.name}</h2>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {summaryStats.totalLogs} séries registradas • {lastBackupText}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu do perfil"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {/* Controle de Tamanho da Fonte / Interface */}
          <div className="p-3 bg-black border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              <Type className="w-4 h-4 text-blue-400" />
              <span>Tamanho da Fonte / Interface</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'normal', label: 'A', desc: 'Padrão' },
                { id: 'large', label: 'A+', desc: 'Médio' },
                { id: 'xlarge', label: 'A++', desc: 'Grande' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUiScaleChange(opt.id)}
                  className={`min-h-[44px] py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                    uiScale === opt.id
                      ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-sm font-extrabold leading-none">{opt.label}</div>
                  <div className="text-xs opacity-85 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Controle de Screensaver OLED (Auto-Dim) */}
          <div className="p-3 bg-black border border-zinc-800 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              <Moon className="w-4 h-4 text-sky-400" />
              <span>Screensaver OLED (Auto-Dim)</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { val: 0, label: 'Off' },
                { val: 15, label: '15s' },
                { val: 20, label: '20s' },
                { val: 30, label: '30s' },
                { val: 45, label: '45s' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onScreensaverDelayChange(opt.val)}
                  className={`min-h-[42px] rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                    screensaverDelay === opt.val
                      ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Auto-Iniciar Descanso ao Salvar Série */}
          <button
            type="button"
            onClick={() => onToggleAutoStartTimer(!autoStartTimer)}
            className="w-full min-h-[48px] px-3.5 py-2.5 bg-black border border-zinc-800 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Timer className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-zinc-100 leading-tight">
                  Auto-iniciar descanso ao salvar série
                </div>
                <div className="text-xs text-zinc-400">
                  Dispara o cronômetro recomendado automaticamente
                </div>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase flex-shrink-0 ${
                autoStartTimer
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {autoStartTimer ? 'Ativo' : 'Off'}
            </span>
          </button>

          {/* Ações Principais (todas >= 44px) */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResults();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-amber-200 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/50 rounded-xl transition-colors cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Meus Resultados & Recordes (PRs)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestResetSession();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Reiniciar Status (Treino / Semana)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onExportBackup();
                onClose();
              }}
              className="w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Download className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Exportar Histórico (JSON)</span>
              </span>
              {(backupMeta?.logsSinceBackup || 0) >= 10 && (
                <span className="text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full">
                  +{backupMeta.logsSinceBackup} novos
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Importar Histórico (JSON)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                onImportBackupFile(e);
                onClose();
              }}
              className="hidden"
            />
          </div>

          <div className="border-t border-zinc-800 pt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestFullReset();
              }}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-950/30 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              <span>Apagar Histórico / Resetar</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span>Sair da Conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
