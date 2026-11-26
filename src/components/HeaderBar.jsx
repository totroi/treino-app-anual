import React from 'react';
import { Dumbbell, RefreshCw, User, ChevronDown, Trophy } from 'lucide-react';

export default function HeaderBar({
  currentUser,
  selectedMonth,
  isOfflineFallback,
  loading,
  showUserMenu,
  onSync,
  onToggleUserMenu,
  onOpenResults,
  hasBackupAlert,
  hasPwaUpdate = false
}) {
  return (
    <header className="bg-black/95 backdrop-blur-md sticky top-0 z-20 border-b border-zinc-800/90 pt-safe-header">
      <div className="max-w-md mx-auto px-safe pb-1.5 flex items-center justify-between gap-2 min-h-[52px]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-600/20 flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-base leading-none tracking-tight text-white truncate">
                IronTracker
              </h1>
              {isOfflineFallback && (
                <span className="text-[0.65rem] bg-amber-950 text-amber-300 border border-amber-800/70 px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">
                  Offline
                </span>
              )}
            </div>
            <p className="text-[0.7rem] text-zinc-400 font-semibold leading-tight truncate mt-0.5">
              {selectedMonth} • Hipertrofia
            </p>
          </div>
        </div>

        {/* Controles compactos e seguros (>= 44x44px, sem Reset destrutivo no topo!) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenResults}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-amber-300 hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
            aria-label="Meus Resultados e PRs"
            title="Meus Resultados e PRs"
          >
            <Trophy className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onSync}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-300 hover:text-blue-400 hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
            aria-label="Sincronizar Planilha"
            title="Sincronizar Planilha"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onToggleUserMenu}
            aria-expanded={showUserMenu}
            aria-label="Abrir menu do perfil"
            className="min-h-[44px] px-2.5 flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-100 transition-colors relative cursor-pointer"
          >
            <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="max-w-[70px] truncate">{currentUser.name.split(' ')[0]}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            {hasPwaUpdate ? (
              <span
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse ring-2 ring-zinc-900"
                title="Nova atualização do app disponível"
                data-testid="pwa-update-dot"
              />
            ) : hasBackupAlert ? (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400"
                title="Recomendado exportar backup JSON"
              />
            ) : null}
          </button>
        </div>
      </div>
    </header>
  );
}
