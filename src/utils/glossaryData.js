/**
 * Base completa do Glossário Golden Era em Liga Leve + matcher inteligente
 * para deep-link exato a partir de qualquer célula de "Técnica Avançada".
 */

function normalizeForMatch(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const GLOSSARY_ITEMS = [
  {
    id: 'glossario-falha',
    term: 'Falha Muscular Momentânea (Concêntrica Estrita)',
    shortDesc: 'Tentar completar mais uma repetição com técnica íntegra até o músculo travar no trajeto.',
    desc: 'Ponto em que você tenta completar mais uma repetição com técnica estrita e o músculo simplesmente trava na fase concêntrica (subida). Na planilha, as repetições são régua de carga — nunca um freio para parar antes da falha real.',
    matchers: ['falha concentrica', 'falha muscular', 'falha estrita']
  },
  {
    id: 'glossario-cadencia',
    term: 'Cadência E-F-C-T (ex.: 4-0-2-0)',
    shortDesc: 'Segundos de cada fase: Excêntrica (descida), Fundo, Concêntrica (subida) e Topo.',
    desc: 'Indica o tempo em segundos de cada fase da repetição: Excêntrica (descida), Fundo (pausa no alongamento), Concêntrica (subida) e Topo (pausa na contração). Ex.: 4-0-1-0 = 4s descendo controlado e 1s subindo firme sem descansar nos extremos.',
    matchers: ['cadencia', 'e-f-c-t']
  },
  {
    id: 'glossario-tensao',
    term: 'Tensão Contínua & Sobrecarga Progressiva',
    shortDesc: 'Fluxo ininterrupto de carga nas fibras aliado ao aumento gradual de peso ou reps.',
    desc: 'Manter a carga sustentada 100% pelas fibras do início ao fim da série (sem relaxar no fundo nem travar articulações no topo), somado à regra clássica de registrar e superar gradualmente carga ou repetições ao longo das semanas.',
    matchers: ['tensao continua', 'sobrecarga progressiva']
  },
  {
    id: 'glossario-rest-pause',
    term: 'Rest-Pause (Pausa-Descanso)',
    shortDesc: 'Atingiu a falha → apoia o peso por 10s (Mentzer) → extrai mais 1–3 reps até nova falha.',
    desc: 'Ao atingir a falha muscular com carga pesada, apoie o peso, respire por exatamente 10 segundos (protocolo de Mike Mentzer, Cap. 11 p. 94) para ressíntese parcial de fosfocreatina e execute imediatamente mais 1–3 repetições máximas até a nova falha.',
    matchers: ['rest-pause', 'rest pause', 'pausa-descanso', 'pausa descanso']
  },
  {
    id: 'glossario-dropset',
    term: 'Drop-Set / Séries Descendentes (Stripping)',
    shortDesc: 'Ao falhar, reduz a carga em 20–30% sem descanso e continua até falhar de novo.',
    desc: 'Na última série, assim que atingir a falha concêntrica, reduza imediatamente a carga em 20–30% (sem pausa) e siga até nova falha. No método Stripping (Arnold), podem ser feitas 2 a 3 reduções consecutivas de anilhas.',
    matchers: ['drop-set', 'dropset', 'drop set', 'stripping', 'series descendentes']
  },
  {
    id: 'glossario-pre-exaustao',
    term: 'Pré-Exaustão (Pre-Exhaustion — Mentzer)',
    shortDesc: 'Isolador até a falha seguido imediatamente de um exercício composto.',
    desc: 'Executar um exercício monoarticular até a falha (ex.: Pec Deck ou Extensora) e passar sem descanso para um composto (ex.: Supino ou Leg Press). Assim os sinergistas (tríceps/ombros) ainda estão frescos para esgotar totalmente o músculo-alvo.',
    matchers: ['pre-exaustao']
  },
  {
    id: 'glossario-negativas',
    term: 'Repetições Negativas (Excêntricas Lentas / Forçadas)',
    shortDesc: 'Excêntricas Lentas (4s padrão HIT) ou Negativas Forçadas / Somente Negativas (+40%, 5–10s).',
    desc: 'Distingue dois níveis: (1) Excêntricas Lentas (4s) — ritmo controlado padrão do HIT para maximizar tensão mecânica sem impulso; e (2) Negativas Forçadas / Somente Negativas — técnica avançada com sobrecarga (+40% em 5–10s de descida) onde a subida é assistida por parceiro ou feita bilateralmente antes da descida unilateral (Mentzer Cap. 11 pp. 91–93).',
    matchers: ['negativa', 'negative', 'excentrica']
  },
  {
    id: 'glossario-isometria',
    term: 'Contração Isométrica / Estática & Pico de Contração',
    shortDesc: 'Pico de Contração (1–2s em cada rep) vs. Contração Estática até a falha (8–12s sup / 15–30s inf).',
    desc: 'Distingue dois estímulos: (1) Pico de Contração (Peak Contraction, 1–2s) — pausa deliberada no ponto de encurtamento máximo de cada repetição (ex.: 4-0-2-2); e (2) Contração Estática até a Falha (Static Contraction — Mentzer Cap. 11 pp. 97–98) — sustentar carga máxima imóvel no ponto de pico até não conseguir mais segurar (8–12s em superiores, 15–30s em inferiores).',
    matchers: [
      'isometric',
      'isometria',
      'estatica',
      'pico de contracao',
      'peak contraction',
      'contracao de pico',
      'contracao maxima',
      'no pico',
      'pose isometrica'
    ]
  },
  {
    id: 'glossario-cheating',
    term: 'Roubo Consciente (Cheating / Leve Hitch)',
    shortDesc: 'Pequeno impulso controlado apenas nas 1–2 reps finais após a falha estrita.',
    desc: 'Usado exclusivamente após atingir a falha com técnica limpa: aplica-se um leve balanço controlado do corpo (ou pequeno "hitch" no final da puxada/rosca) apenas para vencer o ponto morto e controlar a descida lenta sob tensão. Nunca serve para carregar peso de ego desde a 1ª rep.',
    matchers: ['roubo', 'cheating', 'hitch']
  },
  {
    id: 'glossario-parciais',
    term: 'Movimentos 3/4, Repetições Parciais & Burns',
    shortDesc: 'Cortar o bloqueio articular (3/4) ou pulsar na zona de tensão após a falha (Burns).',
    desc: 'Nos Movimentos 3/4 (estilo Sergio Oliva), interrompe-se a subida antes de travar cotovelos/joelhos para nunca aliviar a tensão. Nas Repetições Parciais / Burns (pós-falha), executam-se micro-pulsos curtos na faixa de maior queimação até a exaustão total.',
    matchers: ['parciais', 'tres quartos', '3/4', 'burns', 'sergio oliva']
  },
  {
    id: 'glossario-superset',
    term: 'Super-Série & Bi-Set',
    shortDesc: 'Dois exercícios executados em sequência imediata, sem descanso entre eles.',
    desc: 'Combinação de dois exercícios seguidos sem intervalo: Super-Série normalmente alterna antagonistas (ex.: Bíceps + Tríceps, acelerando recuperação recíproca e pump brutal) e Bi-Set combina dois movimentos para o mesmo grupo muscular.',
    matchers: ['super-serie', 'super-set', 'superserie', 'bi-set']
  },
  {
    id: 'glossario-igoyougo',
    term: 'I Go / You Go (Alternância Contínua)',
    shortDesc: 'Alternar direto entre um lado/exercício e outro com descanso mínimo.',
    desc: 'Clássico da Golden Era: você executa um braço/lado (ou um exercício do par) e vai imediatamente para o outro sem parar; o "descanso" de um lado é apenas o tempo de execução do outro, gerando densidade metabólica altíssima.',
    matchers: ['i go']
  },
  {
    id: 'glossario-alongamento',
    term: 'Alongamento Profundo, Pausa no Fundo & Forward Bends',
    shortDesc: 'Amplitude máxima com 1–2s de pausa controlada no estiramento (sem quicar).',
    desc: 'Levar o músculo ao estiramento máximo seguro com pausa isométrica de 1–2s no fundo (eliminando reflexo elástico/quique — crucial em Sóleo, Pullover e Hack). Forward Bends pós-treino descomprimem a coluna e alongam posteriores após séries pesadas.',
    matchers: ['alongamento', 'amplitude maxima', 'forward bends', 'no fundo']
  },
  {
    id: 'glossario-breathing',
    term: 'Breathing Squats & Respiração Profunda (McCallum)',
    shortDesc: 'Série única de 20–25 reps com 3 a 10 respirações profundas entre as repetições finais.',
    desc: 'Protocolo lendário de John McCallum: com carga para ~10–12 reps, executa-se 1 série de 20–25 repetições fazendo 3 respirações profundas entre cada rep no início e 6–10 respirações nas últimas, expandindo caixa torácica e disparando estímulo sistêmico brutal.',
    matchers: ['breathing', 'mccallum', 'respiracao profunda', 'respiracao progressiva']
  },
  {
    id: 'glossario-forced-reps',
    term: 'Repetições Forçadas (Forced Reps) & Resistência Manual',
    shortDesc: 'Ajuda mínima de parceiro (ou mão livre) apenas para concluir 1–2 reps pós-falha.',
    desc: 'Quando a barra trava na falha, um parceiro aplica a mínima assistência necessária (ou você usa o braço livre em unilaterais / resistência manual na fase negativa) para extrair mais 1–2 repetições profundas sem roubar a carga.',
    matchers: ['forced reps', 'resistencia manual']
  },
  {
    id: 'glossario-hit',
    term: 'HIT (Heavy Duty — Mike Mentzer)',
    shortDesc: '1–2 séries no limite absoluto com cadência lenta e descanso de 120–180s.',
    desc: 'Filosofia de altíssima intensidade e baixíssimo volume: após aquecimento progressivo, executam-se 1 a 2 séries levadas além da falha com cadência rigorosa e descanso amplo (120–180s) para ressíntese total de fosfocreatina.',
    matchers: ['heavy duty', ' hit ']
  },
  {
    id: 'glossario-mind-muscle',
    term: 'Visualização (Mind-Muscle Connection)',
    shortDesc: 'Foco intencional no encurtamento e alongamento exato da fibra-alvo.',
    desc: 'Em vez de apenas mover peso do ponto A ao B, direcione atenção total para sentir a contração da cabeça muscular alvo (técnica central de Arnold e Frank Zane), maximizando o recrutamento neural do músculo certo.',
    matchers: ['visualizacao', 'mind-muscle']
  },
  {
    id: 'glossario-prioridade',
    term: 'Princípio da Prioridade & Princípio do Choque (Arnold)',
    shortDesc: 'Treinar o ponto fraco primeiro no dia ou variar o estímulo para quebrar platôs.',
    desc: 'Princípio da Prioridade coloca o músculo mais atrasado como 1º exercício da sessão (glicogênio e foco no auge). Princípio do Choque introduz técnicas inesperadas (dropsets, super-séries, ângulos novos) para forçar nova adaptação.',
    matchers: ['prioridade', 'priority', 'principio do choque']
  },
  {
    id: 'glossario-pumping',
    term: 'Pumping 24h, Saturação, Alto Volume & Pausas Curtas',
    shortDesc: 'Alta densidade sanguínea (hiperemia) com descansos curtos (<60s) e alta frequência.',
    desc: 'Estratégias voltadas a saturar o músculo de sangue e metabólitos — seja por pausas curtas (<60s), alto volume controlado ou alta frequência diária (Pumping 24h / Pumpers) para grupos teimosos como panturrilhas e braços.',
    matchers: [
      'pumping',
      'pump/saturacao',
      'saturacao',
      'alto volume',
      'volume brutal',
      'alta frequencia',
      'pausas curtas',
      'under 60s'
    ]
  },
  {
    id: 'glossario-vacuum',
    term: 'Stomach Vacuum (Vácuo Abdominal)',
    shortDesc: 'Expiração total + sucção do umbigo à coluna (15–30s) para ativar o transverso.',
    desc: 'Expire 100% do ar, faça uma "falsa inspiração" sugando o abdômen para dentro e para cima em direção à coluna e sustente 15–30 segundos. Fortalece o transverso abdominal (cinta natural) e afina a linha de cintura.',
    matchers: ['vacuum', 'vacuo']
  },
  {
    id: 'glossario-biomecanica',
    term: 'Ajustes Biomecânicos Golden Era (Alavancas & Alinhamento)',
    shortDesc: 'Microajustes de pegada, cotovelos, retração escapular ou pé para isolar a cabeça muscular certa.',
    desc: 'Diretrizes precisas de alavanca usadas na Golden Era: Retração Escapular / Pegada Neutra no deltoide posterior (evitando rotação interna que pinça o supraespinhal — Delavier pp. 30-31, 35), leve inclinação na Elevação Lateral até a linha das orelhas (Gironda p. 98), Supinação Forçada (girar o mindinho para cima na rosca), Cotovelos Fixos / Tronco Estável, Esterno na Barra, Foco no Dedão / Pés para Fora e Towel Pulls.',
    matchers: [
      'retracao escapular',
      'pegada neutra',
      'rotacao interna',
      'jarra',
      'supinacao',
      'towel pulls',
      'tronco estavel',
      'cotovelos fixos',
      'cotovelos imoveis',
      'esterno toca',
      'dedos dos pes',
      'foco no dedao'
    ]
  },
  {
    id: 'glossario-angulo-q',
    term: 'Ângulo Q & Alinhamento Femoropatelar (Prevenção do Valgo Dinâmico)',
    shortDesc: 'Alinhar joelhos ao 2º metatarso, passo longo nas passadas e 0 lockout para proteger patela e LCA.',
    desc: 'Como a pelve feminina é anatomicamente mais larga (Delavier & Arnold), o ângulo Q entre fêmur e tíbia é maior, elevando as forças de cisalhamento na patela e a tendência de colapso medial do joelho (valgo dinâmico). Alinhe rigorosamente os joelhos com o 2º dedo do pé, dê passos longos nas passadas (canela vertical) e jamais trave os joelhos no topo.',
    matchers: ['angulo q', 'valgo dinamico', 'alinhamento femoropatelar', '2o metatarso']
  },
  {
    id: 'glossario-gluteo-medio',
    term: 'Glúteo Médio & Mínimo ("Deltoide do Quadril" — Delavier)',
    shortDesc: 'Inclinar o tronco à frente na abdutora ou abduzir no cabo para projetar a lateral do quadril e afinar a cintura.',
    desc: 'Frédéric Delavier classifica o glúteo médio e mínimo como o "deltoide do quadril". Na cadeira abdutora com tronco inclinado à frente ou na abdução no cabo, séries de 15–25 repetições até a queimação esculpem a porção lateral-superior do quadril, criando a ilusão óptica clássica de cintura muito mais fina.',
    matchers: ['gluteo medio', 'deltoide do quadril', 'tronco inclinado']
  },
  {
    id: 'glossario-variacao-pes',
    term: 'Variação de Pés (Arnold & Zane — Gastrocnêmio & Vastos)',
    shortDesc: 'Alternar a posição e abertura dos pés para direcionar o estímulo às cabeças laterais ou mediais.',
    desc: 'Diretriz clássica de Arnold Schwarzenegger e Frank Zane: em panturrilhas (Gêmeos em pé ou no Leg Press), pontas dos pés levemente para dentro focam a cabeça lateral externa e pontas para fora focam a cabeça medial interna; no Leg Press e Hack Squat, pés próximos e paralelos priorizam o vasto lateral (outer sweep), enquanto pés mais afastados com pontas para fora enfatizam o vasto medial (VMO) e adutores.',
    matchers: ['variacao de pes', 'pes alternados', 'arnold & zane']
  }
];

/**
 * Encontra todos os itens do glossário correspondentes a um texto de "Técnica Avançada".
 * Suporta células compostas (ex.: "Pré-Exaustão e Dropset" retorna ambos os termos!).
 */
export function findGlossaryEntriesForTechnique(rawTechniqueText = '') {
  const norm = ` ${normalizeForMatch(rawTechniqueText)} `;
  if (!norm.trim()) return [];

  const matches = GLOSSARY_ITEMS.filter((item) =>
    item.matchers.some((m) => norm.includes(m))
  );

  return matches;
}
