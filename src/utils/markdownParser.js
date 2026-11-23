// Parser Markdown-para-AST leve e seguro (zero dependências externas, sem dangerouslySetInnerHTML)
// Suporta 100% da gramática dos 24 Guias Mensais IronTracker (H1-H3, bold/italic/code,
// quebras suaves, listas com sub-itens, separadores, escapes Markdown e tabelas GFM).

const ESCAPE_RE = /\\([.#+~\-()|>=*_`[\]])/g;

export function unescapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(ESCAPE_RE, '$1');
}

export function stripMarkdownFormatting(text) {
  if (!text) return '';
  return unescapeMarkdown(
    String(text)
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
  ).trim();
}

/**
 * Tokeniza formatação inline (`code`, **bold**, *italic*) de forma recursiva e segura.
 */
export function parseInlineTokens(rawText) {
  if (!rawText) return [];
  const tokens = [];
  const text = String(rawText);
  const pattern = /(`[^`]+`|\*\*[\s\S]+?\*\*|\*(?!\s)[^*\n]+?(?<!\s)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: unescapeMarkdown(text.slice(lastIndex, match.index))
      });
    }

    const tokenStr = match[0];
    if (tokenStr.startsWith('`') && tokenStr.endsWith('`')) {
      tokens.push({
        type: 'code',
        value: tokenStr.slice(1, -1)
      });
    } else if (tokenStr.startsWith('**') && tokenStr.endsWith('**')) {
      tokens.push({
        type: 'strong',
        children: parseInlineTokens(tokenStr.slice(2, -2))
      });
    } else if (tokenStr.startsWith('*') && tokenStr.endsWith('*')) {
      tokens.push({
        type: 'em',
        children: parseInlineTokens(tokenStr.slice(1, -1))
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: 'text',
      value: unescapeMarkdown(text.slice(lastIndex))
    });
  }

  return tokens;
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);

  const cells = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '|') {
      current += '\\|';
      i += 1;
    } else if (ch === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isTableSeparatorLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  const cells = splitTableRow(trimmed);
  return cells.length >= 2 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function deriveTocLabel(plainText) {
  const lower = plainText.toLowerCase();
  if (lower.includes('visão geral')) return 'Visão Geral';
  if (lower.includes('organização semanal') || lower.includes('ciclo móvel')) return 'Calendário';
  if (/treino\s+a\b/i.test(plainText)) return 'Treino A';
  if (/treino\s+b\b/i.test(plainText)) return 'Treino B';
  if (/treino\s+c\b/i.test(plainText)) return 'Treino C';
  if (lower.includes('nutrição')) return 'Nutrição';
  if (lower.includes('recuperação') || lower.includes('sono')) return 'Recuperação';
  if (lower.includes('adendo metodológico')) return 'Adendo';
  if (lower.includes('5 princípios')) return '5 Princípios';
  if (lower.includes('revisão metodológica')) return 'Auditoria';
  return plainText.length > 22 ? `${plainText.slice(0, 20).trim()}…` : plainText;
}

/**
 * Extrai metadados estruturados de uma linha de tabela de treino (4 colunas)
 * para renderização em Card ergonômico no mobile.
 */
function parseWorkoutRowMeta(cells) {
  const [col1 = '', col2 = '', col3 = '', col4 = ''] = cells;

  // Col 1: **\#1 — Supino Reto (Barra)** *(Peitoral: ...)*  OU  **99 (A/B/C) — Stomach Vacuum** *(...)*
  const col1Plain = stripMarkdownFormatting(col1);
  let orderBadge = '';
  let exerciseTitle = col1Plain;
  let muscleFocus = '';

  const col1Match = col1.match(/^\*\*(.+?)\*\*(?:\s*\*\((.+)\)\*)?$/);
  if (col1Match) {
    const titlePart = unescapeMarkdown(col1Match[1]).trim();
    muscleFocus = col1Match[2] ? unescapeMarkdown(col1Match[2]).trim() : '';
    const dashMatch = titlePart.match(/^(.+?)\s+[—–-]\s+(.+)$/);
    if (dashMatch) {
      orderBadge = dashMatch[1].trim();
      exerciseTitle = dashMatch[2].trim();
    } else {
      exerciseTitle = titlePart;
    }
  }

  // Col 2: **3 x 12-15** (Cadência `2-0-2-1`)
  let seriesReps = stripMarkdownFormatting(col2);
  let cadence = '';
  const col2Match = col2.match(/^\*\*(.+?)\*\*\s*\(Cadência\s+`([^`]+)`\)/i);
  if (col2Match) {
    seriesReps = unescapeMarkdown(col2Match[1]).trim();
    cadence = col2Match[2].trim();
  }

  // Col 3: **Técnica:** Execução... *Obs.: ...*
  let technique = '';
  let executionRaw = col3;
  let obsRaw = '';
  const obsMatch = col3.match(/\s*\*Obs\.:\s*([\s\S]+?)\*\s*$/);
  if (obsMatch) {
    obsRaw = obsMatch[1].trim();
    executionRaw = col3.slice(0, obsMatch.index).trim();
  }
  const tecMatch = executionRaw.match(/^\*\*([^*]+?):\*\*\s*([\s\S]*)$/);
  if (tecMatch) {
    technique = unescapeMarkdown(tecMatch[1]).trim();
    executionRaw = tecMatch[2].trim();
  }

  // Col 4: 0s no par (...) **(PAR-1 / Bi-Set (1/2))**
  let restText = stripMarkdownFormatting(col4);
  let pairBadge = '';
  const pairMatch = col4.match(/\s*\*\*\((PAR-\d+[^)]*)\)\*\*\s*$/i);
  if (pairMatch) {
    pairBadge = unescapeMarkdown(pairMatch[1]).trim();
    restText = stripMarkdownFormatting(col4.slice(0, pairMatch.index)).trim();
  }

  return {
    orderBadge,
    exerciseTitle,
    muscleFocus,
    seriesReps,
    cadence,
    technique,
    executionRaw,
    obsRaw,
    restText,
    pairBadge
  };
}

/**
 * Converte um guia Markdown completo em uma árvore de blocos estruturados + sumário.
 */
export function parseMarkdownGuide(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  const toc = [];
  let title = '';
  let headingCounter = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Separador horizontal
    if (/^-{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawText = headingMatch[2].trim();
      const plainText = stripMarkdownFormatting(rawText);
      const id = `guide-sec-${headingCounter++}`;

      if (level === 1 && !title) {
        title = plainText;
      }

      if (level >= 2) {
        const tocLabel = deriveTocLabel(plainText);
        if (
          tocLabel === 'Visão Geral' ||
          tocLabel === 'Calendário' ||
          tocLabel === 'Treino A' ||
          tocLabel === 'Treino B' ||
          tocLabel === 'Treino C' ||
          tocLabel === 'Nutrição' ||
          tocLabel === 'Recuperação' ||
          tocLabel === 'Adendo'
        ) {
          toc.push({ id, label: tocLabel, fullTitle: plainText });
        }
      }

      blocks.push({ type: 'heading', level, id, rawText, plainText });
      i += 1;
      continue;
    }

    // Tabela GFM
    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2; // pula header e separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const isWorkout =
        headers.length === 4 &&
        /ordem/i.test(headers[0]) &&
        /exerc[ií]cio/i.test(headers[0]);

      blocks.push({
        type: 'table',
        variant: isWorkout ? 'workout' : 'standard',
        headers,
        rows,
        workoutMeta: isWorkout ? rows.map((r) => parseWorkoutRowMeta(r)) : null
      });
      continue;
    }

    // Lista ordenada (1. ...) ou não-ordenada (- ... / * ...)
    const orderedStart = line.match(/^\d+\.\s+(.+)$/);
    const unorderedStart = line.match(/^[-*]\s+(.+)$/);
    if (orderedStart || unorderedStart) {
      const ordered = Boolean(orderedStart);
      const items = [];

      while (i < lines.length) {
        const curLine = lines[i];
        const curTrimmed = curLine.trim();
        if (!curTrimmed) break;

        // Sub-item indentado (ex: "   - Fórmula: ...")
        const subMatch = curLine.match(/^\s{2,}[-*]\s+(.+)$/);
        if (subMatch && items.length > 0) {
          items[items.length - 1].subItems.push(subMatch[1].trim());
          i += 1;
          continue;
        }

        const itemMatch = ordered
          ? curLine.match(/^\d+\.\s+(.+)$/)
          : curLine.match(/^[-*]\s+(.+)$/);

        if (!itemMatch) break;
        items.push({ rawText: itemMatch[1].trim(), subItems: [] });
        i += 1;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // Parágrafo (agrupa linhas consecutivas que não iniciam outro bloco)
    const paraLines = [];
    while (i < lines.length) {
      const curLine = lines[i];
      const curTrimmed = curLine.trim();
      if (!curTrimmed) break;
      if (
        /^-{3,}$/.test(curTrimmed) ||
        /^#{1,3}\s+/.test(curTrimmed) ||
        (curTrimmed.startsWith('|') &&
          i + 1 < lines.length &&
          isTableSeparatorLine(lines[i + 1])) ||
        /^\d+\.\s+/.test(curLine) ||
        /^[-*]\s+/.test(curLine)
      ) {
        break;
      }
      const hasHardBreak = / {2}$/.test(curLine);
      paraLines.push({ rawText: curTrimmed, hardBreak: hasHardBreak });
      i += 1;
    }

    blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return { title, toc, blocks };
}
