import { getDisplayExerciseName } from './exerciseNormalizer.js';

/**
 * Mapeamento determinístico de precedência estrita (R6 — 47 arquétipos SVG distintos)
 * cobrindo 186/186 exercícios das versões Masculina e Feminina Chun-Li sem colapsos visuais.
 */
export function detectArchetype(exerciseName = '', muscleGroup = '') {
  const n = getDisplayExerciseName(exerciseName).toLowerCase();
  const g = String(muscleGroup || '').toLowerCase();

  // 1. Deltoide posterior ANTES de crucifixo e elevação lateral
  if (
    n.includes('crucifixo inverso') ||
    n.includes('lateral curvado') ||
    n.includes('rear delt') ||
    n.includes('deltoide posterior') ||
    n.includes('face pull') ||
    n.includes('bent-over lateral') ||
    n.includes('bent over lateral')
  ) {
    return 'rear_delt';
  }

  // 2. Remada alta ANTES de remada
  if (n.includes('remada alta') || n.includes('upright row')) {
    return 'upright_row';
  }

  // 3. Abdominais dinâmicos / Hanging Leg Raises
  if (
    n.includes('hanging leg') ||
    n.includes('leg raise') ||
    n.includes('elevação de pernas') ||
    n.includes('abdominais din') ||
    n.includes('sit-up')
  ) {
    return 'hanging_leg';
  }

  // 4. Stomach Vacuum / Abdômen
  if (
    n.includes('vacuum') ||
    n.includes('vácuo') ||
    n.includes('vacuo') ||
    n.includes('abdom') ||
    g.includes('abdômen') ||
    g.includes('abdomen')
  ) {
    return 'vacuum';
  }

  // 5. Pescoço (exceto Neck Press de peitoral)
  if (
    !n.includes('neck press') &&
    (n.includes('wrestler') || n.includes('bridge') || n.includes('pescoço') || g.includes('pescoço'))
  ) {
    return 'neck_bench';
  }

  // 6. Panturrilhas no Leg Press ANTES de leg press e calf_standing
  if (
    (n.includes('gêmeos') || n.includes('gemeos') || n.includes('toe press') || n.includes('panturrilha')) &&
    n.includes('leg press')
  ) {
    return 'calf_legpress';
  }

  // 7. Gêmeos Sentado / Sóleo
  if (n.includes('gêmeos sentado') || n.includes('gemeos sentado') || n.includes('sóleo') || n.includes('soleo')) {
    return 'calf_seated';
  }

  // 8. Demais Panturrilhas em Pé
  if (
    n.includes('gêmeos') ||
    n.includes('gemeos') ||
    n.includes('calf') ||
    n.includes('panturrilha') ||
    n.includes('toe press') ||
    g.includes('panturrilha')
  ) {
    return 'calf_standing';
  }

  // 9. Glúteos & Quadril específicos
  if (n.includes('elevação pélvica') || n.includes('elevacao pelvica') || n.includes('hip thrust')) {
    return 'hip_thrust';
  }
  if (n.includes('abdutora') || n.includes('abdução') || n.includes('abducao')) {
    return 'abduction';
  }
  if (n.includes('adutora') || n.includes('adução') || n.includes('aducao')) {
    return 'adduction';
  }
  if (n.includes('búlgaro') || n.includes('bulgaro')) {
    return 'bulgarian_squat';
  }
  if (n.includes('passada') || n.includes('lunge') || n.includes('afundo')) {
    return 'lunge';
  }
  if (n.includes('4 apoios')) {
    return 'glute_quadruped';
  }
  if (n.includes('hiperextens')) {
    return 'back_extension';
  }
  if (
    (n.includes('coice') ||
      n.includes('kickback') ||
      n.includes('glúteo no cabo') ||
      n.includes('gluteo no cabo') ||
      n.includes('extensão de quadril') ||
      n.includes('extensao de quadril')) &&
    (n.includes('glúteo') || n.includes('gluteo') || g.includes('glúteo') || g.includes('gluteo'))
  ) {
    return 'kickback';
  }

  // 10. Peitoral
  if (n.includes('paralela') || n.includes('dip') || n.includes('mergulho')) return 'dips';
  if (n.includes('pull-over') || n.includes('pullover')) return 'pullover';
  if (n.includes('pec deck') || n.includes('machine fly')) return 'pec_deck';
  if (n.includes('crossover')) return 'crossover';
  if (n.includes('crucifixo')) return 'chest_fly';
  if (n.includes('neck press')) return 'neck_press';
  if (n.includes('supino fechado')) return 'bench_close';
  if (n.includes('supino inclinado')) return 'bench_incline';
  if (n.includes('supino') || n.includes('bench')) return 'bench_flat';

  // 11. Pernas
  if (n.includes('hack')) return 'hack_squat';
  if (n.includes('leg press')) return 'legpress';
  if (n.includes('agachamento') || n.includes('squat')) return 'squat';
  if (n.includes('stiff') && (n.includes('mesa flexora') || n.includes('leg curl'))) return 'stiff_rdl';
  if (n.includes('flexora') || n.includes('leg curl') || n.includes('thigh curl')) return 'leg_curl';
  if (n.includes('extensora')) return 'leg_extension';
  if (n.includes('stiff') || n.includes('rdl')) return 'stiff_rdl';
  if (n.includes('terra') || n.includes('deadlift')) return 'deadlift';

  // 12. Costas
  if (n.includes('barra fixa') || n.includes('chin')) return 'pullup';
  if (n.includes('puxada') || n.includes('pulldown') || n.includes('pulley frente')) return 'lat_pulldown';
  if (n.includes('serrote') || (n.includes('remada') && n.includes('unilateral'))) return 'row_one_arm';
  if (n.includes('remada apoiada')) return 'row_supported';
  if (n.includes('remada baixa')) return 'row_seated';
  if (n.includes('remada') || n.includes('row')) return 'row_bent';

  // 13. Ombros
  if (
    n.includes('desenvolvimento') ||
    n.includes('arnold press') ||
    n.includes('military') ||
    n.includes('press behind')
  ) {
    return 'overhead_press';
  }
  if (
    n.includes('elevação lateral') ||
    n.includes('elevações laterais') ||
    n.includes('lateral raise') ||
    g.includes('ombro')
  ) {
    return 'lateral_raise';
  }

  // 14. Tríceps (ANTES de Bíceps por conta de "Rosca Testa")
  if (n.includes('testa') || n.includes('skull crusher') || n.includes('extensões de tríceps')) {
    return 'triceps_skullcrusher';
  }
  if (n.includes('francês') || n.includes('frances') || n.includes('french press')) {
    return 'triceps_overhead';
  }
  if (n.includes('coice') || n.includes('kickback')) {
    return 'triceps_kickback';
  }
  if (n.includes('tríceps') || n.includes('triceps') || g.includes('tríceps') || g.includes('triceps')) {
    return 'triceps_pushdown';
  }

  // 15. Antebraço & Bíceps
  if (n.includes('punho') || n.includes('pulso')) return 'wrist_curl';
  if (n.includes('scott') || n.includes('preacher') || n.includes('concentrada') || n.includes('concentração')) {
    return 'curl_preacher';
  }
  if (
    n.includes('rosca') ||
    n.includes('curl') ||
    g.includes('bíceps') ||
    g.includes('biceps') ||
    g.includes('antebraço') ||
    g.includes('antebraco')
  ) {
    return 'curl_standing';
  }

  // 16. Fallback seguro
  return 'bench_flat';
}
