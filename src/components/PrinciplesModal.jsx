import React, { useState, useEffect, useRef } from 'react';
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
  Droplets
} from 'lucide-react';

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

const NAV_PRINCIPLES = [
  {
    id: 'principio-1',
    label: '1. Até a Falha',
    span: 'col-span-2',
    color: 'text-rose-300 border-rose-800/70 bg-rose-950/50 hover:bg-rose-900/50'
  },
  {
    id: 'principio-2',
    label: '2. Tensão',
    span: 'col-span-2',
    color: 'text-amber-300 border-amber-800/70 bg-amber-950/50 hover:bg-amber-900/50'
  },
  {
    id: 'principio-3',
    label: '3. Descanso',
    span: 'col-span-2',
    color: 'text-blue-300 border-blue-800/70 bg-blue-950/50 hover:bg-blue-900/50'
  },
  {
    id: 'principio-4',
    label: '4. Alimentação',
    span: 'col-span-3',
    color: 'text-emerald-300 border-emerald-800/70 bg-emerald-950/50 hover:bg-emerald-900/50'
  },
  {
    id: 'principio-5',
    label: '5. Pumpers (Avançado)',
    span: 'col-span-3',
    color: 'text-purple-300 border-purple-800/70 bg-purple-950/50 hover:bg-purple-900/50'
  }
];

export default function PrinciplesModal({ isOpen, onClose }) {
  const [selectedPumperGroup, setSelectedPumperGroup] = useState('Peitoral');
  const scrollContainerRef = useRef(null);

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

  if (!isOpen) return null;

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activePumper = PUMPER_EXAMPLES.find((p) => p.group === selectedPumperGroup) || PUMPER_EXAMPLES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho Fixo do Modal */}
        <div className="px-4 sm:px-5 pt-3.5 pb-3 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          {/* Puxador mobile */}
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2.5 sm:hidden" />

          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-lg shadow-amber-600/20 flex-shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                  Princípios Básicos da Hipertrofia
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Toque em um princípio para ir direto ao tópico
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid de 2 Linhas com os 5 Princípios 100% Visíveis (Zero Scroll Horizontal) */}
          <div className="grid grid-cols-6 gap-1.5 mt-3">
            {NAV_PRINCIPLES.map((nav) => (
              <button
                key={nav.id}
                type="button"
                onClick={() => scrollToSection(nav.id)}
                className={`${nav.span} py-1.5 px-2 rounded-xl text-[0.7rem] font-bold text-center border transition-all active:scale-95 cursor-pointer truncate ${nav.color}`}
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo com Scroll dos 5 Princípios */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5 text-sm text-slate-300"
        >
          {/* PRINCÍPIO 1: ATÉ A FALHA */}
          <section
            id="principio-1"
            className="bg-slate-950/70 border border-rose-900/50 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-rose-950 border border-rose-800/70 p-2 rounded-xl text-rose-400 flex-shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-rose-400">
                  Princípio 01
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Até a Falha: Repetições são Régua, Não Limite
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              Nós contamos repetições apenas para <strong className="text-white">registro histórico e calibração de carga</strong> — nunca como um freio para interromper a série. Se você atingiu o número de repetições-alvo prescrito na planilha e ainda consegue fazer mais, <strong className="text-rose-300">você não para só porque bateu a meta numérica</strong>: continue executando até falhar de verdade.
            </p>

            {/* Régua Visual de Ajuste de Carga */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                  <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Passou do Teto?</span>
                </div>
                <p className="text-[0.7rem] text-slate-300 leading-snug">
                  Fez mais que o limite superior das reps-alvo antes de falhar? <strong className="text-emerald-300">Suba a carga</strong> no próximo treino/série.
                </p>
              </div>

              <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs mb-1">
                  <Target className="w-4 h-4 flex-shrink-0" />
                  <span>Na Faixa-Alvo?</span>
                </div>
                <p className="text-[0.7rem] text-slate-300 leading-snug">
                  A carga está calibrada. Mas lembre-se: <strong className="text-blue-300">vá até a falha real</strong>, mesmo que passe 1 ou 2 reps.
                </p>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1">
                  <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Menos de 3 Reps?</span>
                </div>
                <p className="text-[0.7rem] text-slate-300 leading-snug">
                  Fez menos que 3 repetições bem-feitas? O ego passou da conta: <strong className="text-amber-300">desça a carga</strong> imediatamente.
                </p>
              </div>
            </div>
          </section>

          {/* PRINCÍPIO 2: TENSÃO CONTÍNUA */}
          <section
            id="principio-2"
            className="bg-slate-950/70 border border-amber-900/50 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-950 border border-amber-800/70 p-2 rounded-xl text-amber-400 flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-amber-400">
                  Princípio 02
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Tensão Contínua: Sem Pausa ou "Ginga" nos Picos
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              Especialmente nas transições de <strong className="text-white">pico concêntrico</strong> (topo da contração, onde muitos travam a articulação para descansar o músculo nos ossos) e de <strong className="text-white">pico excêntrico</strong> (fundo do alongamento, onde surge a tentação de relaxar, quicar o peso ou "gingar" o tronco), seu instinto vai querer aliviar o sofrimento.
            </p>

            <div className="bg-amber-950/25 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-100/90 space-y-1.5">
              <p className="font-bold text-amber-300">
                Regra de Execução Ininterrupta:
              </p>
              <p className="leading-relaxed">
                Nunca pause para descansar nas extremidades e nunca "gingue" o corpo, <strong className="text-white">a não ser que a descrição específica do exercício na planilha permita expressamente</strong> esse comportamento (como em técnicas de <em>Rest-Pause</em>, <em>Breathing Squats</em>, <em>Contração Estática</em> ou <em>Cheating planejado</em>). A tensão mecânica não zera só porque você contou uma repetição — ela é um fluxo único do início ao fim da série.
              </p>
            </div>

            {/* Legenda da Cadência Padronizada E-F-C-T */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[0.7rem] text-slate-300">
              <span className="font-bold text-amber-300 block mb-1">
                Como ler a Cadência padronizada (E-F-C-T em segundos):
              </span>
              <span className="font-mono text-white font-bold">2-0-2-0</span> ={' '}
              <strong className="text-slate-100">E</strong>xcêntrica (2s descendo) •{' '}
              <strong className="text-slate-100">F</strong>undo (0s pausa) •{' '}
              <strong className="text-slate-100">C</strong>oncêntrica (2s subindo) •{' '}
              <strong className="text-slate-100">T</strong>opo (0s pausa).{' '}
              <span className="text-slate-400">Ex.: 4-0-1-0 = 4s descida controlada e 1s subida explosiva sem pausas.</span>
            </div>
          </section>

          {/* PRINCÍPIO 3: DESCANSO ADEQUADO */}
          <section
            id="principio-3"
            className="bg-slate-950/70 border border-blue-900/50 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-950 border border-blue-800/70 p-2 rounded-xl text-blue-400 flex-shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-blue-400">
                  Princípio 03
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Descanso Adequado & Rotação de Foco (ABC / CAB / BCA)
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              O treino destrói microfibras; o músculo <strong className="text-white">cresce durante a recuperação</strong>. A arquitetura em três divisões (<strong className="text-blue-300">ABC / CAB / BCA</strong>) existe exatamente para permitir intensidade brutal no dia do estímulo e janela biológica completa de reconstrução nos dias seguintes.
            </p>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              Ao longo dos 12 meses, a periodização é viva: <strong className="text-white">damos foco maior e mais agressivo em determinados grupos musculares em alguns meses</strong> para forçar adaptação, mas nos meses seguintes <strong className="text-blue-300">esse foco muda ou cessa estrategicamente</strong>. Alternar blocos de volume com blocos HIT (1–2 séries com pausas de 120–180s para ressíntese plena de fosfocreatina) estanca o cortisol crônico e abre espaço para a biogênese ribossomal.
            </p>

            {/* Sono Profundo + 5 Sinais Objetivos de Overtraining */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-900 border border-blue-900/50 rounded-xl p-3 space-y-1.5">
                <div className="text-[0.7rem] font-extrabold uppercase tracking-wider text-blue-300">
                  Sono Profundo = Acelerador Anabólico
                </div>
                <p className="text-[0.7rem] text-slate-300 leading-relaxed">
                  A privação de sono mantém o <strong className="text-white">cortisol noturno alto</strong> (proteólise via FOXO), induz <strong className="text-white">resistência aguda à insulina</strong> (queda de GLUT-4 via JNK/PKC), reduz os <strong className="text-blue-200">pulsos de GH em ondas lentas (NREM)</strong> e bloqueia a fosforilação da via mTORC1.
                </p>
              </div>

              <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-3 space-y-1">
                <div className="text-[0.7rem] font-extrabold uppercase tracking-wider text-rose-300">
                  5 Sinais de Esgotamento (Overtraining)
                </div>
                <ul className="text-[0.68rem] text-slate-300 space-y-0.5 leading-snug list-none">
                  <li>• Queda de força nos básicos (fadiga do SNC);</li>
                  <li>• Músculo "murcho" sem pump (glicogênio zerado);</li>
                  <li>• Dor muscular &gt; 72h ou dor persistente em tendões;</li>
                  <li>• Frequência cardíaca de repouso matinal elevada;</li>
                  <li>• Sonolência anormal após refeições com carboidratos.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* PRINCÍPIO 4: ALIMENTAÇÃO CONTEXTUALIZADA */}
          <section
            id="principio-4"
            className="bg-slate-950/70 border border-emerald-900/50 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-emerald-950 border border-emerald-800/70 p-2 rounded-xl text-emerald-400 flex-shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-emerald-400">
                  Princípio 04
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  Alimentação Contextualizada: A Base Anabólica
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              O aspecto nutricional completo é individual e complexo, mas nenhum treino sobrevive sem matéria-prima. Via de regra, siga estas <strong className="text-white">3 diretrizes inegociáveis</strong> todos os dias:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">2g / kg</div>
                <div className="text-[0.7rem] font-bold text-white mt-0.5">Proteína Diária Total</div>
                <p className="text-[0.7rem] text-slate-400 mt-1 leading-snug">
                  Consuma cerca de 2g de proteína por quilo corporal ao dia (ex.: 80kg = ~160g/dia) para manter o balanço nitrogenado positivo.
                </p>
              </div>

              <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">~20 min</div>
                <div className="text-[0.7rem] font-bold text-white mt-0.5">Carbos Amplos Pós-Treino</div>
                <p className="text-[0.7rem] text-slate-400 mt-1 leading-snug">
                  Ingira carboidratos amplos cerca de 20 min após o treino para frear o cortisol, gerar pico de insulina e repor o glicogênio muscular.
                </p>
              </div>

              <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3">
                <div className="text-lg font-extrabold text-emerald-400">Mín. 25g</div>
                <div className="text-[0.7rem] font-bold text-white mt-0.5">Proteína até 1h Depois</div>
                <p className="text-[0.7rem] text-slate-400 mt-1 leading-snug">
                  Garanta ao menos 25g de proteína de alto valor biológico até 1h pós-treino para atingir o limiar de leucina (~2,5–3g) e disparar a via mTORC1.
                </p>
              </div>
            </div>

            {/* Protocolo Pré & Intra-Treino: Água + Sal Integral + Bicarbonato de Sódio */}
            <div className="bg-cyan-950/25 border border-cyan-800/50 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="bg-cyan-950 border border-cyan-700/60 p-1.5 rounded-lg text-cyan-400 flex-shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-cyan-400 block">
                    Protocolo Pré & Intra-Treino
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    800ml–1L Água + 2 Pitadas Generosas de Sal Integral + 1 Colher Rasa de Sopa de Bicarbonato
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Consumida em goles espaçados antes e ao longo da sessão, esta solução hidroeletrolítica e alcalinizante sustenta a <strong className="text-white">força contrátil até a última série</strong> e permite treinar pesado apenas com uma <strong className="text-cyan-300">refeição pré-treino leve</strong>:
              </p>

              <ul className="space-y-1.5 text-[0.7rem] text-slate-300 leading-relaxed list-none">
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold mt-0.5">•</span>
                  <span>
                    <strong className="text-white">Tamponamento de Acidose (Bicarbonato — NaHCO₃):</strong> Em séries até a falha sob tensão contínua, o acúmulo de prótons <strong className="text-cyan-200">H⁺</strong> inibe a glicólise (PFK-1) e compete com o cálcio (Ca²⁺) na troponina C. O bicarbonato eleva o pH extracelular, acelerando o efluxo de H⁺ via transportadores MCT e adiando a fadiga mecânica.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold mt-0.5">•</span>
                  <span>
                    <strong className="text-white">Volume Plasmático & Disparo Neural (Água + Sal Integral):</strong> O sódio e traços minerais expandem a volemia (perfusão capilar e <em>pump</em> denso) e sustentam a <strong className="text-cyan-200">bomba Na⁺/K⁺-ATPase</strong>, mantendo a excitabilidade da membrana muscular e prevenindo quedas de força ou cãibras.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold mt-0.5">•</span>
                  <span>
                    <strong className="text-white">Por que basta uma refeição leve antes:</strong> A energia da musculação intensa vem do <strong className="text-cyan-200">glicogênio muscular pré-estocado (300–700g)</strong> e da fosfocreatina. Uma refeição pesada antes sequestra sangue para o trato digestivo; já a refeição leve somada a esta solução mantém o fluxo sanguíneo 100% voltado aos músculos.
                  </span>
                </li>
              </ul>

              <p className="text-[0.65rem] italic text-cyan-200/80 bg-slate-950/60 p-2 rounded-lg border border-cyan-900/40">
                <strong className="not-italic text-cyan-300">Fracionamento inteligente (zero desconforto gástrico):</strong> Para evitar reação súbita com o HCl estomacal (gases) ou diarreia osmótica, consuma ~60% junto com a refeição pré-treino leve (45–60 min antes) e dilua o restante com o sal integral na garrafa intra-treino em goles espaçados de 100–150ml entre as séries.
              </p>
            </div>

            {/* Shake Hipercalórico "Get Big Drink — Liga Leve" */}
            <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 space-y-1.5">
              <div className="text-[0.7rem] font-extrabold uppercase tracking-wider text-emerald-300">
                Shake Hipercalórico "Get Big Drink — Liga Leve" (Superávit Limpo)
              </div>
              <p className="text-[0.7rem] text-slate-300 leading-relaxed">
                Para quem precisa bater calorias sem degradar a sensibilidade à insulina (evitando a frutose livre do xarope de milho e a gordura saturada do sorvete do shake original de 1968, que ativam lipogênese hepática e bloqueio TLR-4/JNK):{' '}
                <strong className="text-white">60–80g aveia fina</strong> (polímeros de glicose + beta-glucanas) +{' '}
                <strong className="text-white">1 banana</strong> +{' '}
                <strong className="text-white">30–40g Whey/Albumina</strong> (≥3g leucina) +{' '}
                <strong className="text-white">15–20g pasta de amendoim integral</strong> (gorduras mono/poli-insaturadas).
              </p>
            </div>
          </section>

          {/* PRINCÍPIO 5: PUMPERS (PARA AVANÇADOS) */}
          <section
            id="principio-5"
            className="bg-slate-950/70 border border-purple-900/60 rounded-2xl p-4 space-y-3 scroll-mt-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-purple-950 border border-purple-800/70 p-2 rounded-xl text-purple-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[0.65rem] font-extrabold uppercase tracking-widest text-purple-400">
                  Princípio 05 • Avançados
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  PUMPERS: Correção de Pontos Fracos por Saturação Diária
                </h3>
              </div>
            </div>

            {/* Aviso importante */}
            <div className="bg-purple-950/35 border border-purple-700/50 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-100 leading-relaxed">
                <strong className="text-purple-300 uppercase">Filtro de Maturidade:</strong> Esta técnica serve apenas para quem já possui um físico sólido e está com <strong className="text-white">déficit de volume específico</strong> em um grupo isolado comparado ao cenário total (ex.: peito murcho ou braço fino perto do resto do tronco). <em>Se você ainda é iniciante ("frango" no geral), não pense nisso — seu foco é ganhar massa global nos básicos.</em>
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                Protocolo Diário: 4 séries × Máximas Repetições (Todos os Dias)
              </div>
              <p className="text-slate-300 leading-relaxed">
                Ao final do seu treino diário, escolha <strong className="text-purple-300">1 exercício bem isolado</strong> para o grupo em déficit e faça <strong className="text-white">4 séries até a exaustão com repetições curtas (parciais na zona de maior tensão/alongamento)</strong>, sem bloqueio articular, visando <strong className="text-purple-200">fluxo sanguíneo, hiperemia e expansão fascial sem dano excêntrico pesado</strong>.
              </p>
              <div className="bg-slate-950/70 border border-purple-900/50 rounded-lg p-2 text-[0.7rem] text-slate-300 space-y-1">
                <p>
                  <strong className="text-rose-300">Regra de Corte Imediato (Mentzer / Arnold):</strong> Se a força no exercício principal desse músculo cair na sessão primária seguinte, sua reserva de recuperação foi ultrapassada — suspenda os Pumpers imediatamente.
                </p>
                <p>
                  <strong className="text-purple-300">Princípio da Prioridade (Arnold):</strong> Na sessão principal do grupo fraco, você também pode movê-lo para ser o <strong>1º exercício do dia</strong>, com glicogênio e foco neural no máximo.
                </p>
              </div>
            </div>

            {/* Seletor de Grupo Muscular para ver os 2 exemplos de Pumper */}
            <div>
              <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Selecione o Grupo Muscular (2 exemplos de Pumpers Curtos):
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {PUMPER_EXAMPLES.map((item) => (
                  <button
                    key={item.group}
                    type="button"
                    onClick={() => setSelectedPumperGroup(item.group)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      selectedPumperGroup === item.group
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {item.group}
                  </button>
                ))}
              </div>

              {/* Card com os 2 exemplos do grupo selecionado */}
              <div className="bg-slate-900/90 border border-purple-800/40 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-800 pb-2">
                  <span className="text-xs font-extrabold text-purple-300 uppercase tracking-wider">
                    Pumpers para {activePumper.group}
                  </span>
                  <span className="text-[0.7rem] text-slate-400 italic">
                    Alvo: {activePumper.deficit}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activePumper.examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5"
                    >
                      <div className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                        <span className="bg-purple-900/70 text-purple-200 text-[0.65rem] font-extrabold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        {ex.name}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-5">
                        {ex.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé Fixo de Fechamento */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            Entendi • Voltar ao Treino
          </button>
        </div>
      </div>
    </div>
  );
}
