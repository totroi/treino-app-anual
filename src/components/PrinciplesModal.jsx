import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Flame,
  Zap,
  RefreshCw,
  Utensils,
  Sparkles,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  CheckCircle2,
  BookOpen,
  Droplets,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  HelpCircle,
  Search
} from 'lucide-react';
import { MONTHLY_DOCS, MONTHLY_SUMMARIES } from '../utils/exerciseNormalizer';
import { GLOSSARY_ITEMS } from '../utils/glossaryData';

const PUMPER_EXAMPLES = [
  {
    group: 'Peitoral',
    deficit: 'Peito murcho / sem preenchimento',
    examples: [
      {
        name: 'Paralelas (Dips) Curtíssimas lá embaixo',
        desc: 'Desça até o alongamento máximo do peitoral e suba apenas alguns centímetros (1/4 inferior do movimento), bombeando sem jamais estender os cotovelos.'
      },
      {
        name: 'Flexões de Braço Curtas no Fundo',
        desc: 'Com o peito quase tocando o chão, execute micro-pulsos contínuos apenas na faixa inferior do movimento, mantendo pouquíssima extensão até a falha.'
      }
    ]
  },
  {
    group: 'Costas',
    deficit: 'Falta de expansão lateral (V-Taper curto)',
    examples: [
      {
        name: 'Puxada Alta / Barra Fixa no Terço Inicial',
        desc: 'Com os braços quase estendidos no topo, puxe apenas o primeiro terço do movimento focando em abrir e deprimir as dorsais no alongamento máximo.'
      },
      {
        name: 'Pullover Curto na Zona de Alongamento',
        desc: 'Na polia ou com halter, bombeie apenas na metade superior (atrás da cabeça), mantendo o grande dorsal esticado sem trazer o peso até o quadril.'
      }
    ]
  },
  {
    group: 'Ombros',
    deficit: 'Ombro caído / sem aspecto arredondado 3D',
    examples: [
      {
        name: 'Elevação Lateral Parcial (Zona de Tensão / Burns)',
        desc: 'Movimente os halteres apenas no arco médio-alto (entre 45° e 90°), sem nunca encostar nas coxas para impedir qualquer alívio de tensão no deltoide lateral.'
      },
      {
        name: 'Crucifixo Inverso Curto (Posterior)',
        desc: 'No Pec Deck inverso ou com halteres, execute pulsos curtos apenas no terço final de abertura para saturar de sangue a cabeça posterior do deltoide.'
      }
    ]
  },
  {
    group: 'Bíceps',
    deficit: 'Braço fino / falta de volume frontal',
    examples: [
      {
        name: 'Rosca Scott ou Direta no Arco Médio-Baixo',
        desc: 'Execute pulsos curtos entre quase a extensão total e 90° de flexão, evitando o descanso no topo e mantendo o ventre do bíceps sob tração contínua.'
      },
      {
        name: 'Rosca Inclinada 45° (Pulsos no Alongamento)',
        desc: 'Sentado com os braços pendentes para trás da linha do tronco, bombeie apenas o terço inferior onde a cabeça longa do bíceps está em estiramento máximo.'
      }
    ]
  },
  {
    group: 'Tríceps',
    deficit: 'Tríceps raso / sem a "ferradura" lateral',
    examples: [
      {
        name: 'Tríceps Pulley Curto no Terço Final',
        desc: 'Trabalhe apenas na metade inferior da extensão na polia, esmagando a cabeça lateral e medial sem deixar o antebraço subir acima da linha de 90°.'
      },
      {
        name: 'Tríceps Testa / Francês Curto lá embaixo',
        desc: 'Realize micro-repetições na base do movimento (atrás da cabeça), mantendo a cabeça longa esticada sob tensão mecânica ininterrupta.'
      }
    ]
  },
  {
    group: 'Pernas',
    deficit: 'Coxa fina / sem curvatura externa (Sweep)',
    examples: [
      {
        name: 'Agachamento Hack ou Livre no Terço Inferior',
        desc: 'Desça abaixo da paralela e pulse apenas no 1/3 mais baixo do movimento (estilo Tom Platz), sem subir até o topo para não aliviar a pressão nos quadríceps.'
      },
      {
        name: 'Cadeira Extensora ou Mesa Flexora em Pulsos',
        desc: 'Na Extensora, bombeie apenas no terço final de contração máxima; na Mesa Flexora, bombeie no terço inicial de alongamento profundo dos isquiotibiais.'
      }
    ]
  },
  {
    group: 'Panturrilhas',
    deficit: 'Canela fina / gastrocnêmio alto e teimoso',
    examples: [
      {
        name: 'Gêmeos em Pé (Pulsos no Alongamento Profundo)',
        desc: 'Com os calcanhares abaixo do nível do degrau, bombeie curtíssimo da base máxima até a linha neutra, forçando a expansão da fáscia sob estiramento.'
      },
      {
        name: 'Gêmeos no Pico de Contração (Burns Superiores)',
        desc: 'Na ponta dos pés, execute micro-repetições contínuas apenas no terço superior do movimento, mantendo o gastrocnêmio esmagado sem descer o calcanhar.'
      }
    ]
  }
];

const NAV_ITEMS = [
  { id: 'guia-mes', label: 'Guia Mês', color: 'text-sky-300 border-sky-800/70 bg-sky-950/50' },
  { id: 'principio-1', label: '1. Falha', color: 'text-rose-300 border-rose-800/70 bg-rose-950/50' },
  { id: 'principio-2', label: '2. Tensão', color: 'text-amber-300 border-amber-800/70 bg-amber-950/50' },
  { id: 'principio-3', label: '3. Descanso', color: 'text-blue-300 border-blue-800/70 bg-blue-950/50' },
  { id: 'principio-4', label: '4. Nutrição', color: 'text-emerald-300 border-emerald-800/70 bg-emerald-950/50' },
  { id: 'principio-5', label: '5. Pumpers', color: 'text-purple-300 border-purple-800/70 bg-purple-950/50' },
  { id: 'glossario', label: 'Glossário', color: 'text-zinc-200 border-zinc-700 bg-zinc-900' }
];

function ScienceAccordion({ isExpanded, onToggle, label = 'Aprofundar na Ciência', children }) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
      >
        <span>{isExpanded ? 'Recolher aprofundamento' : label}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>
      {isExpanded && <div className="mt-3 space-y-3 ui-fade-in">{children}</div>}
    </div>
  );
}

export default function PrinciplesModal({
  isOpen,
  onClose,
  initialSection = null,
  highlightIds = [],
  contextLabel = '',
  selectedMonth = 'Fevereiro'
}) {
  const [selectedPumperGroup, setSelectedPumperGroup] = useState('Peitoral');
  const [expandedSections, setExpandedSections] = useState({});
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const scrollContainerRef = useRef(null);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Bloqueia o scroll da página de fundo e fecha com ESC
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Deep-link exato para seção ou termo específico do glossário (ex.: 'glossario-cheating')
  useEffect(() => {
    if (!isOpen || !initialSection) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(initialSection);
      if (el) {
        const isSpecificTerm = initialSection.startsWith('glossario-');
        el.scrollIntoView({
          behavior: 'smooth',
          block: isSpecificTerm ? 'center' : 'start'
        });
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [isOpen, initialSection]);

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    if (!q) return GLOSSARY_ITEMS;
    return GLOSSARY_ITEMS.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [glossaryQuery]);

  if (!isOpen) return null;

  const scrollToSection = (id, block = 'start') => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block });
    }
  };

  const highlightSet = new Set(highlightIds);
  const highlightedEntries = GLOSSARY_ITEMS.filter((item) => highlightSet.has(item.id));

  const activePumper = PUMPER_EXAMPLES.find((p) => p.group === selectedPumperGroup) || PUMPER_EXAMPLES[0];
  const monthSummary = MONTHLY_SUMMARIES[selectedMonth];
  const monthDocLink = MONTHLY_DOCS[selectedMonth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 touch-none ui-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Princípios Básicos da Hipertrofia e Guia do Mês"
    >
      <div
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Fixo do Modal */}
        <div className="px-4 pt-3 pb-3 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
          <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-2.5 sm:hidden" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg shadow-amber-600/20 flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                  Método Golden Era • Liga Leve
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Resumo prático + aprofundamento científico
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Princípios"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra horizontal de navegação rápida (>= 40px altura) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-3 pb-0.5">
            {NAV_ITEMS.map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => scrollToSection(nav.id)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-bold whitespace-nowrap border transition-all active:scale-95 cursor-pointer ${nav.color}`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo com Scroll isolado (overscroll-contain) e tipografia legível >= 14px */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 text-sm text-zinc-200"
        >
          {/* GUIA RESUMIDO OFFLINE DO MÊS ATUAL (Item 7.3) */}
          {monthSummary && (
            <section
              id="guia-mes"
              className="bg-black border border-sky-900/70 rounded-2xl p-4 space-y-3 scroll-mt-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-sky-950 border border-sky-800/70 p-2 rounded-xl text-sky-400 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                    Resumo Offline • {selectedMonth}
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {monthSummary.cycle}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 text-sm leading-relaxed text-zinc-200">
                <p>
                  <strong className="text-white">Escola:</strong> {monthSummary.school}
                </p>
                <p>
                  <strong className="text-white">Ordem do Treino:</strong> {monthSummary.orderRule}
                </p>
                <p className="text-zinc-300">{monthSummary.focus}</p>
              </div>

              {monthDocLink && (
                <a
                  href={monthDocLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-950/70 hover:bg-sky-900/70 border border-sky-700/70 text-sky-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Guia Completo de {selectedMonth} (Google Docs)</span>
                </a>
              )}
            </section>
          )}

          {/* PRINCÍPIO 1: ATÉ A FALHA */}
          <section
            id="principio-1"
            className="bg-black border border-rose-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-rose-950 border border-rose-800/70 p-2 rounded-xl text-rose-400 flex-shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                  Princípio 01
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Até a Falha: Repetições são Régua, Não Limite
                </h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-200">
              Contamos repetições apenas para <strong className="text-white">calibrar a carga</strong>, nunca como freio. Se bateu a meta da planilha e ainda consegue fazer mais, <strong className="text-rose-300">continue até falhar de verdade</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                  <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Passou do Teto?</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Fez mais que o teto das reps antes de falhar? <strong className="text-emerald-300">Suba a carga</strong> no próximo treino.
                </p>
              </div>

              <div className="bg-blue-950/30 border border-blue-800/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-1">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span>Na Faixa-Alvo?</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Carga calibrada. Leve sempre <strong className="text-blue-300">até a falha real</strong> com técnica firme.
                </p>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                  <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Menos de 3 Reps?</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  O ego passou da conta: <strong className="text-amber-300">desça a carga</strong> imediatamente para proteger tendões.
                </p>
              </div>
            </div>
          </section>

          {/* PRINCÍPIO 2: TENSÃO CONTÍNUA */}
          <section
            id="principio-2"
            className="bg-black border border-amber-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-950 border border-amber-800/70 p-2 rounded-xl text-amber-400 flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Princípio 02
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Tensão Contínua & Cadência E-F-C-T
                </h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-200">
              Não trave articulações no topo nem relaxe/quique no fundo. A tensão mecânica deve ser um <strong className="text-white">fluxo único do início ao fim da série</strong>, exceto quando a planilha indicar pausa (ex.: <em>Rest-Pause</em> ou <em>Contração Estática</em>).
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 leading-relaxed">
              <span className="font-bold text-amber-300 block text-xs uppercase tracking-wider mb-1">
                Como ler a Cadência (E-F-C-T em segundos)
              </span>
              <span className="font-mono text-white font-bold">2-0-2-0</span> ={' '}
              <strong className="text-white">E</strong>xcêntrica (2s descendo) •{' '}
              <strong className="text-white">F</strong>undo (0s) •{' '}
              <strong className="text-white">C</strong>oncêntrica (2s subindo) •{' '}
              <strong className="text-white">T</strong>opo (0s).
            </div>

            <ScienceAccordion
              isExpanded={!!expandedSections.p2}
              onToggle={() => toggleSection('p2')}
              label="Aprofundar na Regra de Execução Ininterrupta"
            >
              <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl p-3 text-sm text-amber-100 leading-relaxed">
                No pico concêntrico muitos travam cotovelos ou joelhos para descansar o peso nos ossos; no pico excêntrico surge a tentação de quicar ou &ldquo;gingar&rdquo; o tronco. Eliminar esses micro-descansos mantém o recrutamento de unidades motoras de alto limiar (fibras Tipo II) e potencializa o estresse metabólico local.
              </div>
            </ScienceAccordion>
          </section>

          {/* PRINCÍPIO 3: DESCANSO ADEQUADO */}
          <section
            id="principio-3"
            className="bg-black border border-blue-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-950 border border-blue-800/70 p-2 rounded-xl text-blue-400 flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                  Princípio 03
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Descanso, Sono & Rotação ABC / CAB / BCA
                </h3>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-zinc-200">
              O treino cria o estímulo; o músculo <strong className="text-white">cresce na recuperação</strong>. Alternar meses de volume com blocos HIT (1–2 séries com pausas de 120–180s) evita esgotamento do sistema nervoso central e mantém a força subindo o ano todo.
            </p>

            <ScienceAccordion
              isExpanded={!!expandedSections.p3}
              onToggle={() => toggleSection('p3')}
              label="Aprofundar na Ciência (Sono + 5 Sinais de Overtraining)"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-zinc-950 border border-blue-900/60 rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-blue-300">
                    Sono Profundo = Acelerador Anabólico
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    A privação de sono eleva o <strong className="text-white">cortisol noturno</strong> (proteólise via FOXO), reduz sensibilidade à insulina (GLUT-4 via JNK/PKC), derruba <strong className="text-blue-200">pulsos de GH em ondas lentas (NREM)</strong> e freia a via mTORC1.
                  </p>
                </div>

                <div className="bg-zinc-950 border border-rose-900/60 rounded-xl p-3 space-y-1.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
                    5 Sinais de Overtraining
                  </div>
                  <ul className="text-sm text-zinc-300 space-y-1 leading-snug list-none">
                    <li>• Queda de força nos básicos (fadiga do SNC);</li>
                    <li>• Músculo &ldquo;murcho&rdquo; sem pump (glicogênio baixo);</li>
                    <li>• Dor muscular &gt; 72h ou dor em tendões;</li>
                    <li>• Frequência cardíaca matinal elevada;</li>
                    <li>• Sonolência anormal após refeições com carbo.</li>
                  </ul>
                </div>
              </div>
            </ScienceAccordion>
          </section>

          {/* PRINCÍPIO 4: ALIMENTAÇÃO CONTEXTUALIZADA */}
          <section
            id="principio-4"
            className="bg-black border border-emerald-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-950 border border-emerald-800/70 p-2 rounded-xl text-emerald-400 flex-shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  Princípio 04
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Alimentação & Hidratação Alcalinizante
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-zinc-950 border border-emerald-800/50 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">2g / kg</div>
                <div className="text-xs font-bold text-white mt-0.5">Proteína Diária</div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Ex.: 80kg = ~160g/dia para balanço nitrogenado positivo.
                </p>
              </div>

              <div className="bg-zinc-950 border border-emerald-800/50 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">~20 min</div>
                <div className="text-xs font-bold text-white mt-0.5">Carbos Pós-Treino</div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Freia cortisol, gera pico de insulina e repõe glicogênio.
                </p>
              </div>

              <div className="bg-zinc-950 border border-emerald-800/50 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">Mín. 25g</div>
                <div className="text-xs font-bold text-white mt-0.5">Proteína até 1h</div>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Bate o limiar de leucina (~2,5–3g) e ativa mTORC1.
                </p>
              </div>
            </div>

            {/* Resumo prático da bebida pré/intra */}
            <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
                <Droplets className="w-4 h-4 flex-shrink-0" />
                <span>Protocolo Pré & Intra-Treino</span>
              </div>
              <p className="text-sm font-bold text-white leading-snug">
                800ml–1L Água + 2 Pitadas Generosas de Sal Integral + 1 Colher Rasa de Sopa de Bicarbonato
              </p>
              <p className="text-sm text-zinc-200 leading-relaxed">
                Tome ~60% com uma refeição pré-treino leve (45–60 min antes) e o restante em goles de 100–150ml entre as séries. Sustenta a força até o fim sem pesar no estômago.
              </p>
            </div>

            <ScienceAccordion
              isExpanded={!!expandedSections.p4}
              onToggle={() => toggleSection('p4')}
              label="Aprofundar na Bioquímica (Bicarbonato + Shake Liga Leve)"
            >
              <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-none bg-zinc-950 border border-cyan-900/50 rounded-xl p-3.5">
                <li>
                  <strong className="text-white">Tamponamento de Acidose (NaHCO₃):</strong> Em séries até a falha, o acúmulo de H⁺ inibe a PFK-1 e compete com Ca²⁺ na troponina C. O bicarbonato eleva o pH extracelular e acelera o efluxo de H⁺ via transportadores MCT.
                </li>
                <li>
                  <strong className="text-white">Volume Plasmático & Disparo Neural (Sal Integral):</strong> Expande a volemia (pump denso) e sustenta a bomba Na⁺/K⁺-ATPase, prevenindo quedas de força e cãibras.
                </li>
                <li>
                  <strong className="text-white">Por que basta refeição leve antes:</strong> A força vem do glicogênio já estocado (300–700g) e da PCr. Uma refeição pesada sequestra sangue para o intestino em vez de irrigar o músculo.
                </li>
              </ul>

              <div className="bg-emerald-950/25 border border-emerald-800/50 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Shake &ldquo;Get Big Drink — Liga Leve&rdquo; (Superávit Limpo)
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  Substitui o sorvete/xarope de milho de 1968 sem prejudicar a insulina:{' '}
                  <strong className="text-white">60–80g aveia fina</strong> +{' '}
                  <strong className="text-white">1 banana</strong> +{' '}
                  <strong className="text-white">30–40g Whey/Albumina</strong> +{' '}
                  <strong className="text-white">15–20g pasta de amendoim integral</strong>.
                </p>
              </div>
            </ScienceAccordion>
          </section>

          {/* PRINCÍPIO 5: PUMPERS (PARA AVANÇADOS) */}
          <section
            id="principio-5"
            className="bg-black border border-purple-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-purple-950 border border-purple-800/70 p-2 rounded-xl text-purple-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                  Princípio 05 • Avançados
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  PUMPERS: Correção de Pontos Fracos
                </h3>
              </div>
            </div>

            <div className="bg-purple-950/35 border border-purple-700/60 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-purple-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-100 leading-relaxed">
                <strong className="text-purple-300">Apenas para intermediários/avançados:</strong> serve para corrigir um grupo específico em déficit comparado ao resto do físico. Iniciantes devem focar apenas nos exercícios básicos da planilha.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-1.5">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>4 séries × Máx. Reps Curtas (Todo Dia ao Final)</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Escolha 1 isolador para o músculo em atraso e bombeie em parciais na zona de tensão contínua, visando hiperemia e expansão fascial sem dano excêntrico pesado.
              </p>
            </div>

            {/* Seletor interativo de exemplos de Pumper (>= 40px) */}
            <div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Exemplos de Pumpers Curtos por Grupo:
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {PUMPER_EXAMPLES.map((item) => (
                  <button
                    key={item.group}
                    type="button"
                    onClick={() => setSelectedPumperGroup(item.group)}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedPumperGroup === item.group
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {item.group}
                  </button>
                ))}
              </div>

              <div className="bg-zinc-950 border border-purple-800/50 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-zinc-800 pb-2">
                  <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                    Pumpers • {activePumper.group}
                  </span>
                  <span className="text-xs text-zinc-400 italic">Alvo: {activePumper.deficit}</span>
                </div>

                <div className="space-y-2.5">
                  {activePumper.examples.map((ex, idx) => (
                    <div key={idx} className="bg-black border border-zinc-800 rounded-xl p-3">
                      <div className="text-sm font-bold text-white mb-1">
                        {idx + 1}. {ex.name}
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{ex.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <ScienceAccordion
              isExpanded={!!expandedSections.p5}
              onToggle={() => toggleSection('p5')}
              label="Regra de Corte (Mentzer) & Prioridade (Arnold)"
            >
              <div className="bg-zinc-950 border border-purple-900/60 rounded-xl p-3.5 text-sm text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-rose-300">Regra de Corte Imediato:</strong> Se a força no exercício principal desse grupo cair na sessão primária seguinte, sua recuperação foi ultrapassada — suspenda os Pumpers imediatamente.
                </p>
                <p>
                  <strong className="text-purple-300">Princípio da Prioridade (Arnold):</strong> Na sessão principal do grupo fraco, mova-o para ser o 1º exercício do dia, com glicogênio e foco neural no máximo.
                </p>
              </div>
            </ScienceAccordion>
          </section>

          {/* GLOSSÁRIO COMPLETO DE SIGLAS E TÉCNICAS (100% de cobertura dos 248 exercícios) */}
          <section
            id="glossario"
            className="bg-black border border-zinc-800 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-zinc-900 border border-zinc-700 p-2 rounded-xl text-blue-400 flex-shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                    Referência Completa • {GLOSSARY_ITEMS.length} termos
                  </span>
                  <h3 className="text-base font-bold text-white leading-tight">
                    Glossário de Siglas e Técnicas
                  </h3>
                </div>
              </div>
            </div>

            {/* Banner contextual quando aberto a partir de um card de exercício */}
            {contextLabel && highlightedEntries.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-700/60 rounded-xl p-3 space-y-2">
                <div className="text-xs text-amber-200 leading-snug">
                  <span className="text-amber-400 font-bold uppercase tracking-wider block text-[0.7rem]">
                    Técnica consultada no exercício
                  </span>
                  <strong className="text-white">{contextLabel}</strong>
                </div>
                {highlightedEntries.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {highlightedEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => scrollToSection(entry.id, 'center')}
                        className="min-h-[36px] px-2.5 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 border border-amber-600/60 text-amber-100 text-xs font-bold cursor-pointer"
                      >
                        Ir para: {entry.term.split(' (')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Busca rápida no glossário */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={glossaryQuery}
                onChange={(e) => setGlossaryQuery(e.target.value)}
                placeholder="Buscar técnica (ex.: Cheating, Negativas, Drop-Set...)"
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2.5">
              {filteredGlossary.length > 0 ? (
                filteredGlossary.map((item) => {
                  const isHighlighted = highlightSet.has(item.id);
                  return (
                    <div
                      key={item.id}
                      id={item.id}
                      className={`rounded-xl p-3.5 scroll-mt-6 transition-all border ${
                        isHighlighted
                          ? 'bg-amber-950/30 border-amber-500/80 ring-1 ring-amber-500/35'
                          : 'bg-zinc-950 border-zinc-800/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-bold text-white leading-snug">
                          {item.term}
                        </div>
                        {isHighlighted && (
                          <span className="text-[0.68rem] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                            Seu exercício
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed mt-1">{item.desc}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-zinc-400 text-center py-4">
                  Nenhum termo encontrado para &ldquo;{glossaryQuery}&rdquo;.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Rodapé Fixo de Fechamento com safe-area */}
        <div className="px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-zinc-800 bg-zinc-950">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            Entendi • Voltar ao Treino
          </button>
        </div>
      </div>
    </div>
  );
}
