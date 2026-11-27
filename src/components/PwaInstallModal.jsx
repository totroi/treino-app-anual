import React, { useEffect } from 'react';
import {
  X,
  Smartphone,
  Share,
  PlusSquare,
  Check,
  MoreVertical,
  Copy,
  Download,
  ExternalLink
} from 'lucide-react';

export default function PwaInstallModal({ isOpen, onClose, pwaInstall }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !pwaInstall) return null;

  const {
    platformKind,
    platformLabel,
    isIOS,
    canPromptNative,
    promptInstall,
    copyAppLink,
    linkCopied
  } = pwaInstall;

  const handleNativeInstall = async () => {
    const res = await promptInstall();
    if (res?.outcome === 'accepted') {
      onClose();
    }
  };

  const renderSteps = () => {
    if (platformKind === 'in_app_browser') {
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 leading-relaxed">
            Você abriu o IronTracker dentro de um aplicativo (ex.: WhatsApp ou Instagram).
            Navegadores internos não permitem adicionar o ícone na Tela de Início diretamente.
          </div>

          <button
            type="button"
            onClick={copyAppLink}
            className={`w-full min-h-[48px] px-4 py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              linkCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{linkCopied ? 'Link copiado!' : 'Copiar Link do App (1 clique)'}</span>
          </button>

          <div className="space-y-2 text-xs text-zinc-300">
            <div className="p-2.5 rounded-xl bg-black border border-zinc-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-sky-400 font-extrabold flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="leading-relaxed">
                {isIOS ? (
                  <>
                    Toque no botão <strong className="text-white">⋯</strong> ou no ícone do{' '}
                    <strong className="text-white">Safari</strong> no canto da tela e escolha{' '}
                    <strong className="text-white">Abrir no Safari</strong> (ou cole o link copiado no Safari).
                  </>
                ) : (
                  <>
                    Toque nos <strong className="text-white">3 pontinhos (⋮)</strong> no canto superior e escolha{' '}
                    <strong className="text-white">Abrir no Chrome</strong> / navegador (ou cole o link no Chrome).
                  </>
                )}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-black border border-zinc-800 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-sky-400 font-extrabold flex items-center justify-center flex-shrink-0">
                2
              </span>
              <span className="leading-relaxed">
                Lá, toque no aviso de instalação para adicionar o ícone na Tela de Início em 1 toque.
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (platformKind === 'ios_safari') {
      return (
        <div className="space-y-2.5 text-xs text-zinc-200">
          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Share className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">1. Toque em Compartilhar</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Na barra inferior do Safari (ou em <strong className="text-zinc-200">⋯ → Compartilhar</strong>), toque no ícone do quadrado com seta para cima.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">2. Adicionar à Tela de Início</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Role a lista para baixo e toque em <strong className="text-zinc-200">Adicionar à Tela de Início</strong>.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">3. Toque em Adicionar</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Abra o IronTracker pelo novo ícone para ter tela cheia OLED, alarme confiável e modo offline.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (platformKind === 'ios_other_browser') {
      return (
        <div className="space-y-3 text-xs text-zinc-200">
          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Share className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">1. Toque em Compartilhar (canto superior direito)</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                No <strong className="text-zinc-200">{platformLabel}</strong>, o ícone de compartilhar fica ao lado da barra de endereço (ou no menu inferior).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">2. Adicionar à Tela de Início → Adicionar</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Dica: no iPhone, instalar pelo <strong className="text-zinc-200">Safari</strong> oferece a experiência mais estável em segundo plano.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={copyAppLink}
            className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {linkCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
            <span>{linkCopied ? 'Link copiado para colar no Safari!' : 'Copiar Link (se preferir abrir no Safari)'}</span>
          </button>
        </div>
      );
    }

    if (platformKind === 'android_manual') {
      return (
        <div className="space-y-2.5 text-xs text-zinc-200">
          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <MoreVertical className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">1. Abra o menu do navegador (⋮)</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Toque nos 3 pontinhos no canto da tela do navegador.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-white">2. Instalar aplicativo / Adicionar à tela inicial</div>
              <p className="text-zinc-400 mt-0.5 leading-relaxed">
                Confirme para criar o atalho em tela cheia na sua tela inicial.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2.5 text-xs text-zinc-200">
        {canPromptNative && (
          <button
            type="button"
            onClick={handleNativeInstall}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Instalar App Agora (1 clique)</span>
          </button>
        )}
        <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
            <ExternalLink className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-white">Adicionar ao Desktop / Dock</div>
            <p className="text-zinc-400 mt-0.5 leading-relaxed">
              No Chrome ou Edge, clique no ícone de instalação na extremidade direita da barra de endereço. No Safari (Mac), vá em <strong className="text-zinc-200">Compartilhar → Adicionar ao Dock</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 ui-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar IronTracker à Tela de Início"
      data-testid="pwa-install-modal"
    >
      <div
        className="w-full max-w-sm bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black border border-zinc-800 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white truncate">
                Instalar IronTracker
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">{platformLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar guia de instalação"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {renderSteps()}
        </div>
      </div>
    </div>
  );
}
