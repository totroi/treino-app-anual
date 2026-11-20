import React from 'react';

function detectArchetype(exerciseName = '', muscleGroup = '') {
  const n = exerciseName.toLowerCase();
  const g = muscleGroup.toLowerCase();

  if (n.includes('vacuum') || n.includes('vácuo') || n.includes('abdom') || n.includes('leg raise') || g.includes('abdômen')) return 'vacuum';
  if (n.includes('paralela') || n.includes('dip') || n.includes('mergulho')) return 'dips';
  if (n.includes('supino') || n.includes('bench') || n.includes('neck press') || n.includes('crucifixo') || n.includes('pec deck') || n.includes('fly') || n.includes('pull-over') || n.includes('pullover')) return 'bench';
  if (n.includes('leg press')) return 'legpress';
  if (n.includes('agachamento') || n.includes('squat') || n.includes('hack')) return 'squat';
  if (n.includes('terra') || n.includes('deadlift') || n.includes('stiff') || n.includes('hiperextens')) return 'deadlift';
  if (n.includes('barra fixa') || n.includes('chin') || n.includes('puxada') || n.includes('pulldown') || n.includes('pulley frente')) return 'pullup';
  if (n.includes('remada') || n.includes('row') || n.includes('serrote')) return 'row';
  if (n.includes('elevação lateral') || n.includes('elevações laterais') || n.includes('lateral raise') || n.includes('desenvolvimento') || n.includes('arnold press') || n.includes('military') || n.includes('press behind') || g.includes('ombro')) return 'shoulder';
  if (n.includes('tríceps') || n.includes('triceps') || n.includes('testa') || n.includes('francês') || n.includes('french') || n.includes('coice') || n.includes('kickback') || g.includes('tríceps')) return 'triceps';
  if (n.includes('rosca') || n.includes('curl') || n.includes('punho') || g.includes('bíceps') || g.includes('antebraço')) return 'curl';
  if (n.includes('extensora') || n.includes('flexora') || n.includes('leg curl') || n.includes('thigh curl') || n.includes('adutora')) return 'leg_iso';
  if (n.includes('gêmeos') || n.includes('calf') || n.includes('panturrilha') || n.includes('toe press') || g.includes('panturrilha')) return 'calf';

  return 'bench';
}

export default function ExerciseSilhouette({ exerciseName, muscleGroup, accentColor = '#38bdf8' }) {
  const archetype = detectArchetype(exerciseName, muscleGroup);

  const strokeProps = {
    fill: 'none',
    stroke: accentColor,
    strokeWidth: '3',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  const dimStroke = {
    fill: 'none',
    stroke: '#334155',
    strokeWidth: '2.5',
    strokeLinecap: 'round'
  };

  return (
    <div className="w-44 h-44 flex items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 180 180"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
        aria-hidden="true"
      >
        {archetype === 'bench' && (
          <g>
            {/* Banco */}
            <line x1="32" y1="126" x2="148" y2="126" {...dimStroke} />
            <line x1="48" y1="126" x2="48" y2="148" {...dimStroke} />
            <line x1="132" y1="126" x2="132" y2="148" {...dimStroke} />
            {/* Atleta deitado */}
            <circle cx="54" cy="112" r="9" {...strokeProps} />
            <line x1="64" y1="118" x2="118" y2="118" {...strokeProps} />
            <polyline points="118,118 140,126 144,148" {...strokeProps} />
            {/* Braços e barra subindo e descendo sob tensão contínua */}
            <g className="anim-lift-y">
              <line x1="78" y1="115" x2="78" y2="76" {...strokeProps} />
              <line x1="46" y1="76" x2="110" y2="76" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="42" y="66" width="6" height="20" rx="2" fill={accentColor} />
              <rect x="108" y="66" width="6" height="20" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'dips' && (
          <g>
            {/* Barras paralelas */}
            <line x1="56" y1="92" x2="56" y2="152" {...dimStroke} />
            <line x1="124" y1="92" x2="124" y2="152" {...dimStroke} />
            <line x1="48" y1="92" x2="66" y2="92" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <line x1="114" y1="92" x2="132" y2="92" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            {/* Corpo descendo/subindo */}
            <g className="anim-lift-y-deep">
              <circle cx="90" cy="48" r="10" {...strokeProps} />
              <line x1="90" y1="58" x2="90" y2="104" {...strokeProps} />
              <polyline points="90,68 62,88 57,92" {...strokeProps} />
              <polyline points="90,68 118,88 123,92" {...strokeProps} />
              <polyline points="90,104 82,134 94,144" {...strokeProps} />
              <polyline points="90,104 98,134 88,144" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'squat' && (
          <g>
            <line x1="30" y1="152" x2="150" y2="152" {...dimStroke} />
            {/* Pernas fixas no solo com joelhos dobrando */}
            <g className="anim-lift-y-deep">
              <circle cx="90" cy="44" r="10" {...strokeProps} />
              {/* Barra nos ombros */}
              <line x1="42" y1="58" x2="138" y2="58" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" />
              <rect x="38" y="48" width="6" height="20" rx="2" fill={accentColor} />
              <rect x="136" y="48" width="6" height="20" rx="2" fill={accentColor} />
              {/* Tronco e braços */}
              <line x1="90" y1="54" x2="90" y2="100" {...strokeProps} />
              <polyline points="90,62 66,68 60,58" {...strokeProps} />
              <polyline points="90,62 114,68 120,58" {...strokeProps} />
              <polyline points="90,100 72,126 76,148" {...strokeProps} />
              <polyline points="90,100 108,126 104,148" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'legpress' && (
          <g>
            {/* Assento inclinado */}
            <polyline points="34,116 66,138 96,138" {...dimStroke} />
            {/* Atleta */}
            <circle cx="48" cy="108" r="9" {...strokeProps} />
            <line x1="56" y1="116" x2="84" y2="134" {...strokeProps} />
            {/* Plataforma e pernas empurrando em 45° */}
            <g className="anim-press-diag">
              <polyline points="84,134 102,102 126,86" {...strokeProps} />
              <line x1="118" y1="68" x2="144" y2="96" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
              <rect x="132" y="60" width="10" height="22" rx="2" fill={accentColor} transform="rotate(-42 132 60)" />
            </g>
          </g>
        )}

        {archetype === 'deadlift' && (
          <g>
            <line x1="28" y1="152" x2="152" y2="152" {...dimStroke} />
            <g className="anim-lift-y">
              <circle cx="110" cy="64" r="9" {...strokeProps} />
              <line x1="104" y1="73" x2="72" y2="104" {...strokeProps} />
              <polyline points="72,104 82,128 78,150" {...strokeProps} />
              <line x1="98" y1="78" x2="104" y2="132" {...strokeProps} />
              <circle cx="104" cy="138" r="14" stroke="#f8fafc" strokeWidth="3" fill="none" />
              <circle cx="104" cy="138" r="4" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'pullup' && (
          <g>
            {/* Barra fixa no topo */}
            <line x1="34" y1="36" x2="146" y2="36" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            <g className="anim-lift-y">
              <circle cx="90" cy="82" r="10" {...strokeProps} />
              <line x1="90" y1="92" x2="90" y2="132" {...strokeProps} />
              <polyline points="90,98 62,72 56,56" {...strokeProps} />
              <polyline points="90,98 118,72 124,56" {...strokeProps} />
              <polyline points="90,132 82,158" {...strokeProps} />
              <polyline points="90,132 98,158" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'row' && (
          <g>
            <line x1="28" y1="152" x2="152" y2="152" {...dimStroke} />
            {/* Corpo inclinado estável */}
            <circle cx="122" cy="68" r="9" {...strokeProps} />
            <line x1="114" y1="76" x2="66" y2="96" {...strokeProps} />
            <polyline points="66,96 78,124 72,150" {...strokeProps} />
            <polyline points="66,96 92,124 90,150" {...strokeProps} />
            {/* Remada puxando ao abdômen */}
            <g className="anim-lift-y">
              <line x1="104" y1="80" x2="104" y2="128" {...strokeProps} />
              <circle cx="104" cy="132" r="11" stroke="#f8fafc" strokeWidth="3" fill="none" />
              <circle cx="104" cy="132" r="3.5" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'shoulder' && (
          <g>
            {/* Tronco central */}
            <circle cx="90" cy="48" r="10" {...strokeProps} />
            <line x1="90" y1="58" x2="90" y2="112" {...strokeProps} />
            <line x1="90" y1="112" x2="78" y2="152" {...strokeProps} />
            <line x1="90" y1="112" x2="102" y2="152" {...strokeProps} />
            {/* Braço esquerdo elevação lateral */}
            <g style={{ transformOrigin: '90px 68px' }} className="anim-lateral-left">
              <line x1="90" y1="68" x2="90" y2="114" {...strokeProps} />
              <rect x="83" y="112" width="14" height="6" rx="2" fill="#f8fafc" />
            </g>
            {/* Braço direito elevação lateral */}
            <g style={{ transformOrigin: '90px 68px' }} className="anim-lateral-right">
              <line x1="90" y1="68" x2="90" y2="114" {...strokeProps} />
              <rect x="83" y="112" width="14" height="6" rx="2" fill="#f8fafc" />
            </g>
          </g>
        )}

        {archetype === 'curl' && (
          <g>
            <circle cx="84" cy="44" r="10" {...strokeProps} />
            <line x1="84" y1="54" x2="84" y2="110" {...strokeProps} />
            <line x1="84" y1="110" x2="74" y2="154" {...strokeProps} />
            <line x1="84" y1="110" x2="94" y2="154" {...strokeProps} />
            {/* Braço fixo no tronco */}
            <line x1="84" y1="64" x2="90" y2="96" {...strokeProps} />
            {/* Antebraço pivotando no cotovelo */}
            <g style={{ transformOrigin: '90px 96px' }} className="anim-swing-curl">
              <line x1="90" y1="96" x2="124" y2="96" {...strokeProps} />
              <circle cx="128" cy="96" r="7" stroke="#f8fafc" strokeWidth="3" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'triceps' && (
          <g>
            {/* Torre de polia */}
            <line x1="138" y1="28" x2="138" y2="152" {...dimStroke} />
            <circle cx="76" cy="46" r="10" {...strokeProps} />
            <line x1="76" y1="56" x2="76" y2="112" {...strokeProps} />
            <line x1="76" y1="112" x2="66" y2="154" {...strokeProps} />
            <line x1="76" y1="112" x2="86" y2="154" {...strokeProps} />
            {/* Braço colado ao tronco */}
            <line x1="76" y1="66" x2="84" y2="96" {...strokeProps} />
            {/* Antebraço empurrando na polia */}
            <g style={{ transformOrigin: '84px 96px' }} className="anim-swing-pushdown">
              <line x1="84" y1="96" x2="118" y2="96" {...strokeProps} />
              <line x1="118" y1="96" x2="138" y2="34" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="118" cy="96" r="5" fill="#f8fafc" />
            </g>
          </g>
        )}

        {archetype === 'leg_iso' && (
          <g>
            {/* Cadeira */}
            <polyline points="56,64 56,112 104,112" {...dimStroke} />
            <line x1="66" y1="112" x2="66" y2="150" {...dimStroke} />
            {/* Atleta sentado */}
            <circle cx="68" cy="52" r="9" {...strokeProps} />
            <line x1="68" y1="62" x2="68" y2="104" {...strokeProps} />
            <line x1="68" y1="104" x2="104" y2="104" {...strokeProps} />
            {/* Perna estendendo */}
            <g style={{ transformOrigin: '104px 104px' }} className="anim-leg-ext">
              <line x1="104" y1="104" x2="104" y2="144" {...strokeProps} />
              <circle cx="109" cy="138" r="6" fill="#f8fafc" />
            </g>
          </g>
        )}

        {archetype === 'calf' && (
          <g>
            {/* Degrau */}
            <rect x="64" y="144" width="52" height="12" rx="2" {...dimStroke} />
            <g className="anim-lift-y">
              <circle cx="90" cy="42" r="10" {...strokeProps} />
              <line x1="90" y1="52" x2="90" y2="104" {...strokeProps} />
              <line x1="90" y1="64" x2="72" y2="96" {...strokeProps} />
              <line x1="90" y1="64" x2="108" y2="96" {...strokeProps} />
              <line x1="90" y1="104" x2="82" y2="144" {...strokeProps} />
              <line x1="90" y1="104" x2="98" y2="144" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'vacuum' && (
          <g>
            <line x1="30" y1="146" x2="150" y2="146" {...dimStroke} />
            {/* Posição 4 apoios / ajoelhado com contração do transverso */}
            <circle cx="128" cy="84" r="9" {...strokeProps} />
            <line x1="118" y1="88" x2="64" y2="90" {...strokeProps} />
            <line x1="114" y1="90" x2="114" y2="144" {...strokeProps} />
            <polyline points="64,90 64,144 46,144" {...strokeProps} />
            {/* Linha abdominal sugando para dentro */}
            <g style={{ transformOrigin: '90px 90px' }} className="anim-vacuum">
              <path d="M 68 96 Q 90 118 112 96" stroke="#f8fafc" strokeWidth="3" fill="none" strokeDasharray="4 3" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
