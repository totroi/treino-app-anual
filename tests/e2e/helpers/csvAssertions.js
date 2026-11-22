export const EXPECTED_HEADERS_13 = [
  'Mês',
  'Grupo muscular',
  'Especificação do grupo muscular',
  'Treino',
  'Exercício',
  'Séries/Reps',
  'Cadência',
  'Técnica Avançada',
  'Modo de execução',
  'Observação',
  'Descanso',
  'Ordem',
  'Conexão',
];

export const MONTHS_ORDER = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function parseCsvRows(csvText) {
  const lines = String(csvText || '').trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [], lineCount: 0 };

  const splitLine = (line) => {
    const values = [];
    if (line.includes('"')) {
      let inQuote = false;
      let buf = '';
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (ch === '"') {
          if (inQuote && line[j + 1] === '"') {
            buf += '"';
            j++;
          } else {
            inQuote = !inQuote;
          }
          continue;
        }
        if (ch === ',' && !inQuote) {
          values.push(buf);
          buf = '';
        } else {
          buf += charOrEmpty(ch);
        }
      }
      values.push(buf);
    } else {
      values.push(...line.split(','));
    }
    return values.map((v) => {
      let t = (v || '').trim();
      if (t.startsWith('"') && t.endsWith('"')) t = t.slice(1, -1);
      return t;
    });
  };

  function charOrEmpty(c) {
    return c || '';
  }

  const headers = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(obj);
  }
  return { headers, rows, lineCount: lines.length };
}

export function parseConnection(rawConnection = '') {
  const txt = String(rawConnection || '').trim();
  if (!txt) return null;
  const match = txt.match(/^(PAR-\d+)\s*\|\s*(.+?)\s*\((\d+)\s*\/\s*(\d+)\)$/i);
  if (!match) return { invalid: true, raw: txt };
  return {
    pairId: match[1].toUpperCase(),
    pairType: match[2].trim(),
    step: parseInt(match[3], 10),
    total: parseInt(match[4], 10),
  };
}

export function validateWorkoutsCsv(csvText, { expectFemale = true } = {}) {
  const errors = [];
  const { headers, rows, lineCount } = parseCsvRows(csvText);

  if (JSON.stringify(headers) !== JSON.stringify(EXPECTED_HEADERS_13)) {
    errors.push(`Header mismatch: got ${JSON.stringify(headers)}`);
  }

  if (lineCount !== rows.length + 1) {
    errors.push(`Embedded newline or blank line detected: lineCount=${lineCount}, rows=${rows.length}`);
  }

  const validTreinos = new Set(['A', 'B', 'C', 'A/B/C']);
  const validMonths = new Set(MONTHS_ORDER);
  const monthsSeen = new Set();
  const vacuumMonths = new Set();
  const pairBuckets = new Map();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!validMonths.has(r['Mês'])) {
      errors.push(`Row ${i + 2}: invalid Mês "${r['Mês']}"`);
    } else {
      monthsSeen.add(r['Mês']);
    }
    if (!validTreinos.has(r['Treino'])) {
      errors.push(`Row ${i + 2}: invalid Treino "${r['Treino']}"`);
    }
    if (!r['Exercício']) {
      errors.push(`Row ${i + 2}: empty Exercício`);
    }

    const isVacuum =
      r['Ordem'] === '99' &&
      r['Treino'] === 'A/B/C' &&
      /vacuum|v[aá]cuo/i.test(r['Exercício'] || '');
    if (isVacuum) {
      vacuumMonths.add(r['Mês']);
    }

    if (r['Conexão']) {
      const parsed = parseConnection(r['Conexão']);
      if (!parsed || parsed.invalid || parsed.total !== 2) {
        errors.push(`Row ${i + 2}: invalid Conexão "${r['Conexão']}"`);
      } else {
        const key = `${r['Mês']}::${r['Treino']}::${parsed.pairId}`;
        if (!pairBuckets.has(key)) pairBuckets.set(key, []);
        pairBuckets.get(key).push(parsed);
      }
    }

    if (expectFemale) {
      const descanso = (r['Descanso'] || '').toLowerCase();
      if (descanso.includes('15s')) {
        const techAndExec = `${r['Técnica Avançada'] || ''} ${r['Modo de execução'] || ''}`.toLowerCase();
        if (!techAndExec.includes('rest-pause') && !techAndExec.includes('rest pause')) {
          errors.push(`Row ${i + 2} (${r['Exercício']}): "15s" in Descanso without Rest-Pause context`);
        }
      }
      const exName = (r['Exercício'] || '').toLowerCase();
      if (/wrestler|heavy upright|remada alta pesada|neck press|supino reto \(barra\)/i.test(exName)) {
        errors.push(`Row ${i + 2}: male-only disqualifying exercise "${r['Exercício']}"`);
      }
    }
  }

  for (const m of MONTHS_ORDER) {
    if (!monthsSeen.has(m)) errors.push(`Missing month: ${m}`);
  }

  if (expectFemale) {
    for (const m of MONTHS_ORDER) {
      if (!vacuumMonths.has(m)) {
        errors.push(`Missing Ordem=99 Vacuum (Treino A/B/C) in month ${m}`);
      }
    }
  }

  for (const [bucketKey, entries] of pairBuckets.entries()) {
    if (entries.length !== 2) {
      errors.push(`Orphan/malformed pair ${bucketKey}: count=${entries.length}`);
      continue;
    }
    const steps = entries.map((e) => e.step).sort((a, b) => a - b);
    if (steps[0] !== 1 || steps[1] !== 2) {
      errors.push(`Invalid steps in ${bucketKey}: ${JSON.stringify(steps)}`);
    }
    if (entries[0].pairType !== entries[1].pairType) {
      errors.push(`Mismatched pairType in ${bucketKey}`);
    }
  }

  const glutesCount = rows.filter((r) => (r['Grupo muscular'] || '').trim() === 'Glúteos').length;
  const lowerBodyCount = rows.filter((r) =>
    ['Glúteos', 'Pernas', 'Panturrilhas'].includes((r['Grupo muscular'] || '').trim())
  ).length;

  if (expectFemale && glutesCount === 0) {
    errors.push('Female CSV has 0 Glúteos rows');
  }

  return {
    ok: errors.length === 0,
    errors,
    rows,
    headers,
    lineCount,
    glutesCount,
    lowerBodyCount,
    lowerBodyRatio: rows.length > 0 ? lowerBodyCount / rows.length : 0,
    vacuumMonthsCount: vacuumMonths.size,
    pairCount: pairBuckets.size,
  };
}
