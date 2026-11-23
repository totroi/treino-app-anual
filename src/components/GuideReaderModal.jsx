import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Minus,
  Plus,
  Loader2,
  Link2,
  Clock
} from 'lucide-react';
import { MONTHS_ORDER, getMonthlyDocs } from '../utils/exerciseNormalizer';
import { loadMonthGuide } from '../utils/guideLoader';
import { parseInlineTokens, parseMarkdownGuide } from '../utils/markdownParser';

const FONT_STORAGE_KEY = 'irontracker_reader_font_size';
const FONT_SIZES = ['sm', 'base', 'lg'];
const FONT_CLASS_MAP = {
  sm: 'text-[13px] leading-relaxed',
  base: 'text-sm sm:text-[15px] leading-relaxed',
  lg: 'text-base sm:text-[17px] leading-7'
};

function readSavedFontSize() {
  try {
    const saved = localStorage.getItem(FONT_STORAGE_KEY);
    if (FONT_SIZES.includes(saved)) return saved;
  } catch {
    // ignore storage errors
  }
  return 'base';
}

function InlineRichText({ text }) {
  const tokens = useMemo(() => parseInlineTokens(text), [text]);
  return <RenderTokens tokens={tokens} />;
}

function RenderTokens({ tokens }) {
  return tokens.map((tok, idx) => {
    if (tok.type === 'text') {
      return <React.Fragment key={idx}>{tok.value}</React.Fragment>;
    }
    if (tok.type === 'code') {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-sky-300 font-mono text-[0.88em] font-semibold"
        >
          {tok.value}
        </code>
      );
    }
    if (tok.type === 'strong') {
      return (
        <strong key={idx} className="font-bold text-white">
          <RenderTokens tokens={tok.children} />
        </strong>
      );
    }
    if (tok.type === 'em') {
      return (
        <em key={idx} className="italic text-zinc-300">
          <RenderTokens tokens={tok.children} />
        </em>
      );
    }
    return null;
  });
}

function WorkoutTableBlock({ block }) {
  const metaList = block.workoutMeta || [];

  return (
    <div className="my-3">
      {/* Mobile (< sm): Cards empilhados de leitura rápida — zero scroll horizontal */}
      <div className="space-y-2.5 sm:hidden">
        {metaList.map((item, idx) => {
          const isVacuum = /99/i.test(item.orderBadge);
          return (
            <div
              key={idx}
              className={`rounded-2xl border p-3.5 space-y-2.5 ${
                isVacuum
                  ? 'bg-zinc-950 border-emerald-900/60'
                  : item.pairBadge
                    ? 'bg-zinc-950 border-amber-900/50'
                    : 'bg-zinc-950 border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {item.orderBadge && (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold font-mono border ${
                          isVacuum
                            ? 'bg-emerald-950/70 border-emerald-800/70 text-emerald-300'
                            : 'bg-sky-950/70 border-sky-800/70 text-sky-300'
                        }`}
                      >
                        {item.orderBadge}
                      </span>
                    )}
                    {item.pairBadge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-950/60 border border-amber-800/60 text-amber-300">
                        <Link2 className="w-3 h-3 flex-shrink-0" />
                        <span>{item.pairBadge}</span>
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-white leading-snug">
                    {item.exerciseTitle}
                  </h4>
                  {item.muscleFocus && (
                    <p className="text-xs text-zinc-400 mt-0.5">{item.muscleFocus}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-white">
                  {item.seriesReps}
                </span>
                {item.cadence && (
                  <span className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-sky-300">
                    Cadência {item.cadence}
                  </span>
                )}
              </div>

              {item.restText && (
                <div className="flex items-start gap-1.5 text-xs text-zinc-300 bg-black/70 border border-zinc-800/80 rounded-xl px-2.5 py-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>{item.restText}</span>
                </div>
              )}

              <div className="space-y-1.5 text-zinc-200">
                <p>
                  {item.technique && (
                    <strong className="text-sky-300 font-bold">{item.technique}: </strong>
                  )}
                  <InlineRichText text={item.executionRaw} />
                </p>
                {item.obsRaw && (
                  <p className="text-xs text-zinc-400 italic border-l-2 border-zinc-800 pl-2.5">
                    Obs.: <InlineRichText text={item.obsRaw} />
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop (>= sm): Tabela Dark OLED de 4 colunas */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-zinc-800 bg-black">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sky-950/60 border-b border-zinc-800">
              {block.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-sky-200"
                >
                  <InlineRichText text={header} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {block.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="odd:bg-black even:bg-zinc-950/80 hover:bg-zinc-900/50 transition-colors align-top"
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-3.5 py-3 text-zinc-200 ${
                      cIdx === 0
                        ? 'w-[24%]'
                        : cIdx === 1
                          ? 'w-[16%] whitespace-nowrap'
                          : cIdx === 2
                            ? 'w-[42%]'
                            : 'w-[18%] text-zinc-300'
                    }`}
                  >
                    <InlineRichText text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StandardTableBlock({ block }) {
  return (
    <div className="my-3 overflow-x-auto rounded-2xl border border-zinc-800 bg-black">
      <table className="w-full text-left border-collapse min-w-[420px]">
        <thead>
          <tr className="bg-sky-950/60 border-b border-zinc-800">
            {block.headers.map((header, idx) => (
              <th
                key={idx}
                className="px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-sky-200"
              >
                <InlineRichText text={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/80">
          {block.rows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className="odd:bg-black even:bg-zinc-950/80 align-top"
            >
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-2.5 text-zinc-200">
                  <InlineRichText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuideReaderModal({
  isOpen,
  onClose,
  initialMonth = 'Fevereiro',
  sexo = 'M'
}) {
  const isFemale = String(sexo || 'M').trim().toUpperCase() === 'F';
  const [activeMonth, setActiveMonth] = useState(initialMonth);
  const [guideState, setGuideState] = useState({ key: '', markdown: '', error: '' });
  const [fontSize, setFontSize] = useState(readSavedFontSize);
  const [offlineDocNotice, setOfflineDocNotice] = useState(false);
  const scrollRef = useRef(null);

  const requestKey = `${isFemale ? 'F' : 'M'}:${activeMonth}`;
  const isLoading = isOpen && guideState.key !== requestKey;
  const markdown = guideState.key === requestKey ? guideState.markdown : '';
  const loadError = guideState.key === requestKey ? guideState.error : '';

  // Carrega o chunk lazy do sexo ativo (~33–38 KB gzip, 1x/ano + cache SW offline)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    loadMonthGuide(sexo, activeMonth)
      .then((content) => {
        if (cancelled) return;
        setGuideState({ key: requestKey, markdown: content, error: '' });
        if (scrollRef.current) {
          scrollRef.current.scrollTop = 0;
        }
      })
      .catch(() => {
        if (cancelled) return;
        setGuideState({
          key: requestKey,
          markdown: '',
          error:
            'Não foi possível carregar este guia sem internet antes da primeira sincronização.'
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, sexo, activeMonth, requestKey]);

  // Captura Escape com prioridade sobre o PrinciplesModal de fundo
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const parsed = useMemo(() => parseMarkdownGuide(markdown), [markdown]);
  const externalDocUrl = getMonthlyDocs(sexo)[activeMonth];

  const changeFontSize = (delta) => {
    setFontSize((prev) => {
      const idx = FONT_SIZES.indexOf(prev);
      const next = FONT_SIZES[Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta))];
      try {
        localStorage.setItem(FONT_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const scrollToAnchor = (id) => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector(`#${id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isOpen) return null;

  const fontIdx = FONT_SIZES.indexOf(fontSize);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm p-0 sm:p-4 ui-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Leitor do Guia Mensal de ${activeMonth}`}
    >
      <div
        className="w-full max-w-3xl h-[96vh] sm:h-[90vh] bg-black border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Fixo do Leitor */}
        <div className="px-4 pt-3 pb-3 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-20 space-y-2.5">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto sm:hidden" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-sky-950 border border-sky-800/80 p-2 rounded-xl text-sky-400 flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                    {isFemale ? 'Guia Feminino • Chun-Li' : 'Guia Masculino • Golden Era'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-bold text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>100% Offline</span>
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-white leading-tight truncate">
                  {activeMonth} — Leitura Interna Dark OLED
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Leitor de Guia"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              title="Fechar leitor (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Controles: Seletor de Mês + A-/A+ + Link externo discreto */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={activeMonth}
                onChange={(e) => {
                  setActiveMonth(e.target.value);
                  setOfflineDocNotice(false);
                }}
                aria-label="Selecionar mês no leitor de guia"
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                {MONTHS_ORDER.map((m, idx) => (
                  <option key={m} value={m} className="bg-zinc-950 text-white">
                    {String(idx + 1).padStart(2, '0')}/12 • {m}
                  </option>
                ))}
              </select>

              <div
                className="inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden"
                role="group"
                aria-label="Tamanho da fonte do leitor"
              >
                <button
                  type="button"
                  onClick={() => changeFontSize(-1)}
                  disabled={fontIdx === 0}
                  aria-label="Diminuir fonte"
                  className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center text-xs font-extrabold text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Minus className="w-3.5 h-3.5 mr-0.5" />A
                </button>
                <div className="w-px h-5 bg-zinc-800" />
                <button
                  type="button"
                  onClick={() => changeFontSize(1)}
                  disabled={fontIdx === FONT_SIZES.length - 1}
                  aria-label="Aumentar fonte"
                  className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center text-xs font-extrabold text-zinc-200 hover:bg-zinc-800 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5 mr-0.5" />A
                </button>
              </div>
            </div>

            {externalDocUrl && (
              <a
                href={externalDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    e.preventDefault();
                    setOfflineDocNotice(true);
                  } else {
                    setOfflineDocNotice(false);
                  }
                }}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Google Docs</span>
              </a>
            )}
          </div>

          {offlineDocNotice && (
            <p
              role="status"
              className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 rounded-xl px-3 py-1.5"
            >
              Sem sinal para abrir o Google Docs externo — continue lendo normalmente aqui no leitor offline.
            </p>
          )}

          {/* Sumário Horizontal Sticky */}
          {parsed.toc.length > 0 && (
            <nav
              aria-label="Sumário do guia mensal"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5"
            >
              {parsed.toc.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToAnchor(sec.id)}
                  className="min-h-[36px] px-3 rounded-xl bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/60 text-sky-200 text-xs font-bold whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
                >
                  {sec.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Área de Leitura Formatada Dark OLED */}
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 pb-10 space-y-4 text-zinc-200 bg-black ${FONT_CLASS_MAP[fontSize]}`}
        >
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs font-semibold">Carregando guia de {activeMonth}...</span>
            </div>
          ) : loadError ? (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-sm">
              {loadError}
            </div>
          ) : (
            <article className="space-y-4">
              {parsed.blocks.map((block, bIdx) => {
                if (block.type === 'hr') {
                  return <hr key={bIdx} className="border-zinc-800/90 my-5" />;
                }

                if (block.type === 'heading') {
                  if (block.level === 1) {
                    return (
                      <h1
                        key={block.id}
                        id={block.id}
                        className="text-xl sm:text-2xl font-extrabold text-white leading-tight tracking-tight pb-2 border-b border-sky-900/60 scroll-mt-4"
                      >
                        <InlineRichText text={block.rawText} />
                      </h1>
                    );
                  }
                  if (block.level === 2) {
                    return (
                      <h2
                        key={block.id}
                        id={block.id}
                        className="text-lg sm:text-xl font-extrabold text-sky-300 leading-snug pt-3 scroll-mt-4"
                      >
                        <InlineRichText text={block.rawText} />
                      </h2>
                    );
                  }
                  return (
                    <h3
                      key={block.id}
                      id={block.id}
                      className="text-base sm:text-lg font-extrabold text-white leading-snug pt-2 flex items-center gap-2 scroll-mt-4"
                    >
                      <span className="w-1.5 h-5 rounded-full bg-sky-500 flex-shrink-0" />
                      <span>
                        <InlineRichText text={block.rawText} />
                      </span>
                    </h3>
                  );
                }

                if (block.type === 'paragraph') {
                  return (
                    <p key={bIdx} className="text-zinc-200">
                      {block.lines.map((ln, lIdx) => (
                        <React.Fragment key={lIdx}>
                          <InlineRichText text={ln.rawText} />
                          {lIdx < block.lines.length - 1 &&
                            (ln.hardBreak ? <br /> : ' ')}
                        </React.Fragment>
                      ))}
                    </p>
                  );
                }

                if (block.type === 'list') {
                  const ListTag = block.ordered ? 'ol' : 'ul';
                  return (
                    <ListTag
                      key={bIdx}
                      className={`space-y-2 pl-5 ${
                        block.ordered
                          ? 'list-decimal marker:text-sky-400 marker:font-bold'
                          : 'list-disc marker:text-sky-400'
                      }`}
                    >
                      {block.items.map((item, iIdx) => (
                        <li key={iIdx} className="text-zinc-200 pl-1">
                          <InlineRichText text={item.rawText} />
                          {item.subItems.length > 0 && (
                            <ul className="mt-1.5 space-y-1 pl-4 list-disc marker:text-zinc-500">
                              {item.subItems.map((sub, sIdx) => (
                                <li key={sIdx} className="text-zinc-300">
                                  <InlineRichText text={sub} />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ListTag>
                  );
                }

                if (block.type === 'table') {
                  return block.variant === 'workout' ? (
                    <WorkoutTableBlock key={bIdx} block={block} />
                  ) : (
                    <StandardTableBlock key={bIdx} block={block} />
                  );
                }

                return null;
              })}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
