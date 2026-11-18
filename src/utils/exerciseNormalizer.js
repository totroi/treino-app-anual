export const MONTHS_ORDER = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

export const MONTHLY_DOCS = {
  "Janeiro": "https://docs.google.com/document/d/1Rk8MvsPW_Es8weZ6yNiPvLK2IF1ZSc9KuwvRcQNMk0g/edit?usp=sharing",
  "Fevereiro": "https://docs.google.com/document/d/1KNjq9QURk1pzOzyA3TQ5dRaEY--NCSVuSrUHFeS0QDE/edit?usp=sharing",
  "Março": "https://docs.google.com/document/d/1YVTyj-h4feR2bnJvVTBVWnWIZ8pHkLsbyZESM-0Wnhs/edit?usp=sharing",
  "Abril": "https://docs.google.com/document/d/1o9iy8_NCTCRqgqqUouBNst73NQb3OW2ueKNx_dIM--M/edit?usp=sharing",
  "Maio": "https://docs.google.com/document/d/1_XfwEkvWvjLlfQ4ZcJdBIvZms7oK8XPIkMUECpefvDM/edit?usp=sharing",
  "Junho": "https://docs.google.com/document/d/1tBsZ71SC0evH-dYJmTzY4ri-TkGL2fsiAcX2QYyRsPs/edit?usp=sharing",
  "Julho": "https://docs.google.com/document/d/1_0BYS5HXXacYImF4Jod4RaYHP037uem5iqJN_om4zC0/edit?usp=sharing",
  "Agosto": "https://docs.google.com/document/d/1ElFv93J8FlCfp2hVWUStZDxhZTymIawPcSWgsS20YqU/edit?usp=sharing",
  "Setembro": "https://docs.google.com/document/d/1aGe-gluyurse9bjSenC7qhm6R_W4wVgTFmbEfiHz-wo/edit?usp=sharing",
  "Outubro": "https://docs.google.com/document/d/1YqeM3g5DoDof-w0VEDpcbaiiHMbxtU7geDVlXcWG1R4/edit?usp=sharing",
  "Novembro": "https://docs.google.com/document/d/1jDvZX8JuHVzrr72b85On6OP1gMobn0tBmQEYGg3ieaU/edit?usp=sharing",
  "Dezembro": "https://docs.google.com/document/d/1DB7OcpfK0iHNC2tq9DVEczigXBCTYpL7J6_xf-JcjpM/edit?usp=sharing"
};

export const getCurrentMonthName = () => {
  return MONTHS_ORDER[new Date().getMonth()];
};

export const sortMonthsChronologically = (months) => {
  return [...months].sort((a, b) => {
    const idxA = MONTHS_ORDER.indexOf(a);
    const idxB = MONTHS_ORDER.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b, 'pt-BR');
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });
};

const MUSCLE_GROUP_MAP = {
  "Peito": "Peitoral",
  "Peitoral / Deltoide": "Peitoral",
  "Dorsais": "Costas",
  "Costas/Geral": "Costas",
  "Membros Inferiores": "Pernas",
  "Pernas (Posterior)": "Pernas",
  "Adutores": "Pernas",
  "Abdominais": "Abdômen",
  "Braços (Completo)": "Braços",
  "Bíceps / Antebraço": "Bíceps",
  "Tríceps / Peito": "Tríceps"
};

export const normalizeMuscleGroup = (rawGroup) => {
  if (!rawGroup) return "Outros";
  const trimmed = rawGroup.trim();
  return MUSCLE_GROUP_MAP[trimmed] || trimmed;
};

export const isOptionalExercise = (rawName) => {
  if (!rawName) return false;
  return rawName.trim().toUpperCase().startsWith("OPCIONAL");
};

export const getDisplayExerciseName = (rawName) => {
  if (!rawName) return "";
  return rawName.trim().replace(/^OPCIONAL\s+/i, "").trim();
};

const stripAccentsAndLower = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const CANONICAL_EXERCISE_ALIASES = {
  // Peitoral
  "supino reto (barra)": "supino_reto_barra",
  "supino reto (bench press)": "supino_reto_barra",
  "supino reto com barra": "supino_reto_barra",
  "bench press (supino reto)": "supino_reto_barra",
  "supino com barra": "supino_reto_barra",
  "supino reto": "supino_reto_barra",
  "supino inclinado (halter)": "supino_inclinado_halteres",
  "supino inclinado com halteres": "supino_inclinado_halteres",
  "supino inclinado (halteres)": "supino_inclinado_halteres",
  "supino inclinado (barra ou halteres)": "supino_inclinado",
  "supino inclinado (barra ou maquina)": "supino_inclinado",
  "supino inclinado": "supino_inclinado",
  "pec deck (voador)": "pec_deck",
  "crucifixo em maquina (pec deck)": "pec_deck",
  "crucifixo em maquina (machine flys)": "pec_deck",
  "pec deck": "pec_deck",
  "crucifixo (maquina ou halteres)": "pec_deck",
  "crucifixo reto / machine flys": "pec_deck",
  "crucifixo reto (halteres)": "crucifixo_reto",
  "crucifixo reto": "crucifixo_reto",
  "paralelas (dips)": "paralelas_dips",
  "mergulho em paralelas (dips)": "paralelas_dips",
  "dips (paralelas)": "paralelas_dips",

  // Costas
  "deadlifts (levantamento terra)": "levantamento_terra",
  "levantamento terra (deadlift)": "levantamento_terra",
  "wide-grip chins to the front": "barra_fixa_frontal",
  "barra fixa com pegada larga para frente": "barra_fixa_frontal",
  "barra fixa com pegada larga (wide-grip chins)": "barra_fixa_frontal",
  "barra fixa (wide-grip chins)": "barra_fixa_frontal",
  "barra fixa com pegada larga ao peito": "barra_fixa_frontal",
  "wide-grip chins (barra fixa pegada aberta)": "barra_fixa_frontal",
  "barra fixa frontal (wide-grip chins to the front)": "barra_fixa_frontal",
  "barra fixa (pegada larga pela frente)": "barra_fixa_frontal",
  "barra fixa (behind neck)": "barra_fixa_nuca",
  "barra fixa (chins behind neck)": "barra_fixa_nuca",
  "puxada alta (lat pulldown)": "puxada_alta",
  "pulley frente": "puxada_alta",
  "puxada alta (pulley)": "puxada_alta",
  "puxada alta": "puxada_alta",
  "puxada alta (pulldown)": "puxada_alta",
  "remada curvada": "remada_curvada",
  "remada curvada com barra": "remada_curvada",
  "remada curvada (barra)": "remada_curvada",
  "remada curvada (barbell rows)": "remada_curvada",
  "remada baixa (triangulo)": "remada_baixa",
  "remada baixa": "remada_baixa",

  // Ombros
  "heavy upright rows": "remada_alta_pesada",
  "remada alta pesada (heavy upright rows)": "remada_alta_pesada",
  "remada alta pesada (heavy upright row)": "remada_alta_pesada",
  "remada alta (heavy upright rows)": "remada_alta_pesada",
  "elevacao lateral": "elevacao_lateral",
  "elevacoes laterais": "elevacao_lateral",
  "elevacao lateral com halteres": "elevacao_lateral",
  "lateral raises (elevacao lateral)": "elevacao_lateral",
  "elevacoes laterais pesadas": "elevacao_lateral",
  "desenvolvimento com halteres (sentado)": "desenvolvimento_halteres",
  "desenvolvimento com halteres": "desenvolvimento_halteres",
  "desenvolvimento (military press)": "desenvolvimento_militar",
  "desenvolvimento militar": "desenvolvimento_militar",

  // Braços
  "rosca direta (barra)": "rosca_direta_barra",
  "rosca direta com barra reta": "rosca_direta_barra",
  "rosca direta (barra reta/e-z)": "rosca_direta_barra",
  "rosca direta (barra w ou reta)": "rosca_direta_barra",
  "rosca direta (refinamento)": "rosca_direta_barra",
  "rosca direta (barra w)": "rosca_direta_barra_w",
  "rosca direta com barra w": "rosca_direta_barra_w",
  "rosca martelo": "rosca_martelo",
  "rosca martelo (hammer curls)": "rosca_martelo",
  "triceps testa": "triceps_testa",
  "triceps testa (skull crushers)": "triceps_testa",
  "rosca testa": "triceps_testa",
  "triceps no pulley (barra reta)": "triceps_pulley",
  "triceps pulley (refinamento)": "triceps_pulley",
  "triceps no pulley (cabo)": "triceps_pulley",
  "extensao de triceps no pulley": "triceps_pulley",
  "triceps pulley": "triceps_pulley",
  "extensao de triceps (cabo/maquina)": "triceps_pulley",
  "triceps kickback (coice)": "triceps_coice",
  "kickbacks com halteres": "triceps_coice",
  "coice com halteres (triceps kickbacks)": "triceps_coice",

  // Pernas & Panturrilhas
  "squats (agachamento)": "agachamento_livre",
  "agachamento (squats)": "agachamento_livre",
  "agachamento livre": "agachamento_livre",
  "agachamento (squat)": "agachamento_livre",
  "agachamento livre (barra)": "agachamento_livre",
  "squats (agachamento livre)": "agachamento_livre",
  "agachamento livre (squats)": "agachamento_livre",
  "leg press": "leg_press",
  "mesa flexora": "mesa_flexora",
  "leg curl": "mesa_flexora",
  "thigh curl (mesa flexora)": "mesa_flexora",
  "stiff (rdl)": "stiff",
  "stiff": "stiff",
  "mesa flexora ou stiff": "stiff_ou_mesa_flexora",
  "stiff ou mesa flexora": "stiff_ou_mesa_flexora",
  "stiff ou leg curl": "stiff_ou_mesa_flexora",
  "calf raises (standing)": "elevacao_gemeos",
  "gemeos sentado ou em pe": "elevacao_gemeos",
  "elevacao de gemeos (calf raises)": "elevacao_gemeos",
  "gemeos em pe": "elevacao_gemeos",
  "calf raise (gemeos) em pe ou sentado": "elevacao_gemeos",
  "elevacao de gemeos": "elevacao_gemeos",
  "elevacao de gemeos em pe": "elevacao_gemeos",
  "standing calf raise": "elevacao_gemeos",
  "elevacao de gemeos em pe / toe presses": "elevacao_gemeos",
  "elevacao de gemeos (pe)": "elevacao_gemeos",
  "donkey / standing calf raises": "elevacao_gemeos",

  // Abdômen
  "vacuum (vacuo)": "stomach_vacuum",
  "vacuo abdominal": "stomach_vacuum",
  "stomach vacuum": "stomach_vacuum",
  "vacuo abdominal (stomach vacuum)": "stomach_vacuum",
  "vacuo de estomago (vacuum)": "stomach_vacuum",
  "vacuum (vacuo estomacal)": "stomach_vacuum",
  "stomach vacuum (tecnica twin)": "stomach_vacuum",
  "vacuo abdominal (vacuum)": "stomach_vacuum",
  "stomach vacuum (vacuo)": "stomach_vacuum",
  "vacuum (vacuo abdominal)": "stomach_vacuum"
};

export const getCanonicalExerciseKey = (rawName) => {
  const display = getDisplayExerciseName(rawName);
  const normalized = stripAccentsAndLower(display);
  return CANONICAL_EXERCISE_ALIASES[normalized] || normalized.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
};

export const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentLine = lines[i];
    if (!currentLine.trim()) continue;

    let values = [];
    if (currentLine.includes('"')) {
      let inQuote = false;
      let buffer = '';
      for (let j = 0; j < currentLine.length; j++) {
        const char = currentLine[j];
        if (char === '"') {
          if (inQuote && currentLine[j + 1] === '"') {
            buffer += '"';
            j++;
          } else {
            inQuote = !inQuote;
          }
          continue;
        }
        if (char === ',' && !inQuote) {
          values.push(buffer);
          buffer = '';
        } else {
          buffer += char;
        }
      }
      values.push(buffer);
    } else {
      values = currentLine.split(',');
    }

    headers.forEach((header, index) => {
      let val = values[index] ? values[index].trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      obj[header] = val;
    });

    if (obj['Exercício']) {
      obj['Grupo muscular'] = normalizeMuscleGroup(obj['Grupo muscular']);
      result.push(obj);
    }
  }
  return result;
};
