import React, { useState } from 'react';
import { Smartphone, Download, ExternalLink, X, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallModal from './PwaInstallModal';

export default function PwaInstallBanner() {
  const pwaInstall = usePwaInstall();
  const [showModal, setShowModal] = useState(false);

  const {
    isStandalone,
    isInstalled,
    canPromptNative,
    isInAppBrowser,
    isDismissed,
    dismissForSession,
    promptInstall
  } = pwaInstall;

  if (isStandalone) return null;

  if (isInstalled) {
    return (
      <div
        data-testid="pwa-install-success"
        className="w-full max-w-sm mb-3 px-3.5 py-2.5 rounded-2xl bg-emerald-950/35 border border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-200 ui-fade-in"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>App adicionado! Abra pelo ícone na Tela de Início.</span>
      </div>
    );
  }

  if (isDismissed) return null;

  const handlePrimaryClick = async () => {
    if (canPromptNative) {
      const res = await promptInstall();
      if (res?.outcome === 'unavailable' || res?.outcome === 'error') {
        setShowModal(true);
      }
      return;
    }
    setShowModal(true);
  };

  const title = isInAppBrowser
    ? 'Abra no navegador para instalar'
    : 'Use o IronTracker como App';
  const subtitle = isInAppBrowser
    ? 'Salve na Tela de Início via Safari/Chrome em 2 passos'
    : 'Tela cheia OLED • Offline • Sem barra do navegador';
  const ctaLabel = canPromptNative
    ? 'Instalar App'
    : isInAppBrowser
    ? 'Abrir / Copiar'
    : 'Adicionar';

  return (
    <>
      <div
        data-testid="pwa-install-banner"
        className="w-full max-w-sm mb-3 px-3 py-2.5 rounded-2xl bg-zinc-950 border border-sky-900/60 shadow-lg flex items-center justify-between gap-2 ui-fade-in"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-sky-400 flex-shrink-0">
            {isInAppBrowser ? (
              <ExternalLink className="w-4 h-4" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-white truncate">{title}</div>
            <div className="text-[11px] text-zinc-400 truncate leading-tight">{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrimaryClick}
            data-testid="pwa-install-cta"
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            {canPromptNative && <Download className="w-3.5 h-3.5" />}
            <span>{ctaLabel}</span>
          </button>

          <button
            type="button"
            onClick={dismissForSession}
            aria-label="Dispensar aviso de instalação"
            className="min-w-[36px] min-h-[40px] flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PwaInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        pwaInstall={pwaInstall}
      />
    </>
  );
}
