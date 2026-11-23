import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownGuide, parseInlineTokens } from '../src/utils/markdownParser.js';

const ROOT = process.cwd();
const MONTHS = [
  ['Fevereiro', 'fevereiro'],
  ['Março', 'marco'],
  ['Abril', 'abril'],
  ['Maio', 'maio'],
  ['Junho', 'junho'],
  ['Julho', 'julho'],
  ['Agosto', 'agosto'],
  ['Setembro', 'setembro'],
  ['Outubro', 'outubro'],
  ['Novembro', 'novembro'],
  ['Dezembro', 'dezembro'],
  ['Janeiro', 'janeiro']
];

function collectPlainFromTokens(tokens) {
  let out = '';
  for (const tok of tokens) {
    if (tok.type === 'text' || tok.type === 'code') {
      out += tok.value;
    } else if (tok.children) {
      out += collectPlainFromTokens(tok.children);
    }
  }
  return out;
}

function collectRenderedText(parsed) {
  const parts = [];
  for (const block of parsed.blocks) {
    if (block.type === 'heading') {
      parts.push(collectPlainFromTokens(parseInlineTokens(block.rawText)));
    } else if (block.type === 'paragraph') {
      for (const ln of block.lines) {
        parts.push(collectPlainFromTokens(parseInlineTokens(ln.rawText)));
      }
    } else if (block.type === 'list') {
      for (const item of block.items) {
        parts.push(collectPlainFromTokens(parseInlineTokens(item.rawText)));
        for (const sub of item.subItems) {
          parts.push(collectPlainFromTokens(parseInlineTokens(sub)));
        }
      }
    } else if (block.type === 'table') {
      for (const row of block.rows) {
        for (const cell of row) {
          parts.push(collectPlainFromTokens(parseInlineTokens(cell)));
        }
      }
    }
  }
  return parts.join('\n');
}

const RAW_ESCAPE_RE = /\\([.#+~=|])/;
let failures = 0;

for (const [gender, expectedTotalWorkoutRows] of [
  ['male', 227],
  ['female', 252]
]) {
  let totalWorkoutRows = 0;

  for (const [monthLabel, slug] of MONTHS) {
    const filePath = path.join(ROOT, 'src', 'content', 'guides', gender, `${slug}.md`);
    if (!fs.existsSync(filePath)) {
      console.error(`MISSING: ${filePath}`);
      failures += 1;
      continue;
    }

    const md = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseMarkdownGuide(md);
    const tables = parsed.blocks.filter((b) => b.type === 'table');
    const workoutTables = tables.filter((b) => b.variant === 'workout');
    const standardTables = tables.filter((b) => b.variant === 'standard');
    const headings = parsed.blocks.filter((b) => b.type === 'heading');
    const monthWorkoutRows = workoutTables.reduce((acc, t) => acc + t.rows.length, 0);
    totalWorkoutRows += monthWorkoutRows;

    const renderedText = collectRenderedText(parsed);
    const escapeMatch = renderedText.match(RAW_ESCAPE_RE);

    if (
      tables.length !== 5 ||
      workoutTables.length !== 3 ||
      standardTables.length !== 2 ||
      headings.length < 8 ||
      parsed.toc.length < 7 ||
      escapeMatch
    ) {
      console.error(
        `FAIL [${gender}/${monthLabel}]: tables=${tables.length} (workout=${workoutTables.length}, std=${standardTables.length}), headings=${headings.length}, toc=${parsed.toc.length}, rawEscape=${escapeMatch ? escapeMatch[0] : 'none'}`
      );
      failures += 1;
    }
  }

  if (totalWorkoutRows !== expectedTotalWorkoutRows) {
    console.error(
      `FAIL [${gender}]: totalWorkoutRows=${totalWorkoutRows}, expected=${expectedTotalWorkoutRows}`
    );
    failures += 1;
  } else {
    console.log(`OK [${gender}]: 12 guides, 60 tables (36 workout + 24 standard), ${totalWorkoutRows} workout rows, 0 raw escapes.`);
  }
}

if (failures > 0) {
  process.exit(1);
}
console.log('ALL 24 GUIDES PARITY CHECK PASSED!');
