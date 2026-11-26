import React from 'react';
import { detectArchetype } from '../utils/exerciseSilhouetteMap';

export default function ExerciseSilhouette({
  exerciseName,
  muscleGroup,
  accentColor = '#38bdf8',
  sizeClass = 'w-40 h-40',
  lowPower = false,
  paused = false
}) {
  const archetype = detectArchetype(exerciseName, muscleGroup);

  const strokeProps = {
    fill: 'none',
    stroke: accentColor,
    strokeWidth: lowPower ? '2.2' : '3',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  const dimStroke = {
    fill: 'none',
    stroke: lowPower ? '#27272a' : '#3f3f46',
    strokeWidth: lowPower ? '2' : '2.5',
    strokeLinecap: 'round'
  };

  const barColor = lowPower ? '#52525b' : '#f8fafc';

  return (
    <div
      data-archetype={archetype}
      className={`${sizeClass} flex items-center justify-center select-none pointer-events-none ${
        paused ? 'oled-anim-paused' : ''
      }`}
    >
      <svg
        viewBox="0 0 180 180"
        className="w-full h-full"
        style={lowPower ? undefined : { filter: `drop-shadow(0 0 12px ${accentColor}59)` }}
        aria-hidden="true"
      >
        {/* ======================== PEITORAL (9) ======================== */}
        {archetype === 'bench_flat' && (
          <g>
            <line x1="32" y1="126" x2="148" y2="126" {...dimStroke} />
            <line x1="48" y1="126" x2="48" y2="148" {...dimStroke} />
            <line x1="132" y1="126" x2="132" y2="148" {...dimStroke} />
            <circle cx="54" cy="112" r="9" {...strokeProps} />
            <line x1="64" y1="118" x2="118" y2="118" {...strokeProps} />
            <polyline points="118,118 140,126 144,148" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="78" y1="115" x2="78" y2="76" {...strokeProps} />
              <line x1="46" y1="76" x2="110" y2="76" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="42" y="66" width="6" height="20" rx="2" fill={accentColor} />
              <rect x="108" y="66" width="6" height="20" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'bench_incline' && (
          <g>
            {/* Banco inclinado ~35° */}
            <polyline points="42,88 94,126 138,126" {...dimStroke} />
            <line x1="56" y1="100" x2="56" y2="148" {...dimStroke} />
            <line x1="124" y1="126" x2="124" y2="148" {...dimStroke} />
            <circle cx="58" cy="78" r="8.5" {...strokeProps} />
            <line x1="65" y1="86" x2="98" y2="116" {...strokeProps} />
            <polyline points="98,116 126,120 134,148" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="78" y1="96" x2="90" y2="56" {...strokeProps} />
              <line x1="64" y1="56" x2="116" y2="56" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="60" y="47" width="6" height="18" rx="2" fill={accentColor} />
              <rect x="114" y="47" width="6" height="18" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'bench_close' && (
          <g>
            <line x1="34" y1="128" x2="146" y2="128" {...dimStroke} />
            <line x1="50" y1="128" x2="50" y2="148" {...dimStroke} />
            <line x1="130" y1="128" x2="130" y2="148" {...dimStroke} />
            <circle cx="50" cy="112" r="8.5" {...strokeProps} />
            <line x1="60" y1="120" x2="118" y2="120" {...strokeProps} />
            <polyline points="118,120 138,128 142,148" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="80" y1="118" x2="80" y2="74" {...strokeProps} />
              <line x1="88" y1="118" x2="88" y2="74" {...strokeProps} />
              <line x1="64" y1="74" x2="104" y2="74" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="60" y="65" width="5" height="18" rx="2" fill={accentColor} />
              <rect x="103" y="65" width="5" height="18" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'neck_press' && (
          <g>
            {/* Gironda Neck Press: pés elevados sobre o banco + barra na clavícula */}
            <line x1="30" y1="130" x2="150" y2="130" {...dimStroke} />
            <line x1="46" y1="130" x2="46" y2="150" {...dimStroke} />
            <line x1="134" y1="130" x2="134" y2="150" {...dimStroke} />
            <circle cx="50" cy="116" r="8.5" {...strokeProps} />
            <line x1="60" y1="122" x2="110" y2="122" {...strokeProps} />
            <polyline points="110,122 124,96 140,104" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="66" y1="118" x2="66" y2="76" {...strokeProps} />
              <line x1="38" y1="76" x2="96" y2="76" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="34" y="67" width="6" height="18" rx="2" fill={accentColor} />
              <rect x="94" y="67" width="6" height="18" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'chest_fly' && (
          <g>
            {/* Vista frontal no banco: dois braços abrindo em arco semicircular com halteres */}
            <rect x="74" y="106" width="32" height="10" rx="3" {...dimStroke} />
            <line x1="90" y1="116" x2="90" y2="150" {...dimStroke} />
            <circle cx="90" cy="84" r="9" {...strokeProps} />
            <line x1="76" y1="100" x2="104" y2="100" {...strokeProps} />
            <g style={{ transformOrigin: '76px 100px' }} className="anim-fly-left">
              <polyline points="76,100 52,82 48,60" {...strokeProps} />
              <rect x="41" y="54" width="14" height="6" rx="2" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '104px 100px' }} className="anim-fly-right">
              <polyline points="104,100 128,82 132,60" {...strokeProps} />
              <rect x="125" y="54" width="14" height="6" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'pec_deck' && (
          <g>
            {/* Sentado ereto na máquina Pec Deck: antebraços a 90° fechando à frente */}
            <rect x="78" y="64" width="24" height="58" rx="4" {...dimStroke} />
            <line x1="68" y1="122" x2="112" y2="122" {...dimStroke} />
            <line x1="90" y1="122" x2="90" y2="152" {...dimStroke} />
            <circle cx="90" cy="48" r="9" {...strokeProps} />
            <line x1="90" y1="58" x2="90" y2="116" {...strokeProps} />
            <g style={{ transformOrigin: '80px 72px' }} className="anim-fly-left">
              <polyline points="80,72 54,78 54,54" {...strokeProps} />
              <rect x="50" y="48" width="7" height="22" rx="2" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '100px 72px' }} className="anim-fly-right">
              <polyline points="100,72 126,78 126,54" {...strokeProps} />
              <rect x="123" y="48" width="7" height="22" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'crossover' && (
          <g>
            {/* Duas torres de polia com atleta no centro puxando cabos convergentes */}
            <line x1="26" y1="28" x2="26" y2="154" {...dimStroke} />
            <line x1="154" y1="28" x2="154" y2="154" {...dimStroke} />
            <circle cx="90" cy="48" r="9" {...strokeProps} />
            <line x1="90" y1="58" x2="90" y2="108" {...strokeProps} />
            <line x1="90" y1="108" x2="78" y2="150" {...strokeProps} />
            <line x1="90" y1="108" x2="104" y2="150" {...strokeProps} />
            <g style={{ transformOrigin: '82px 68px' }} className="anim-fly-left">
              <line x1="82" y1="68" x2="54" y2="92" {...strokeProps} />
              <line x1="54" y1="92" x2="26" y2="42" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="54" cy="92" r="4" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '98px 68px' }} className="anim-fly-right">
              <line x1="98" y1="68" x2="126" y2="92" {...strokeProps} />
              <line x1="126" y1="92" x2="154" y2="42" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="126" cy="92" r="4" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'pullover' && (
          <g>
            {/* Banco horizontal + arco do halter atrás da cabeça */}
            <rect x="64" y="114" width="54" height="10" rx="3" {...dimStroke} />
            <line x1="78" y1="124" x2="78" y2="150" {...dimStroke} />
            <line x1="106" y1="124" x2="106" y2="150" {...dimStroke} />
            <circle cx="60" cy="108" r="8.5" {...strokeProps} />
            <line x1="68" y1="112" x2="120" y2="112" {...strokeProps} />
            <polyline points="120,112 138,126 142,150" {...strokeProps} />
            <g style={{ transformOrigin: '76px 110px' }} className="anim-swing-curl">
              <line x1="76" y1="110" x2="48" y2="78" {...strokeProps} />
              <circle cx="44" cy="74" r="7" stroke={barColor} strokeWidth="3" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'dips' && (
          <g>
            <line x1="56" y1="92" x2="56" y2="152" {...dimStroke} />
            <line x1="124" y1="92" x2="124" y2="152" {...dimStroke} />
            <line x1="48" y1="92" x2="66" y2="92" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
            <line x1="114" y1="92" x2="132" y2="92" stroke="#71717a" strokeWidth="4" strokeLinecap="round" />
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

        {/* ======================== COSTAS & LOMBAR (9) ======================== */}
        {archetype === 'pullup' && (
          <g>
            <line x1="34" y1="36" x2="146" y2="36" stroke={barColor} strokeWidth="4" strokeLinecap="round" />
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

        {archetype === 'lat_pulldown' && (
          <g>
            {/* Sentado no pulley alto com trava de coxas e barra puxando para baixo */}
            <line x1="90" y1="22" x2="90" y2="54" stroke="#71717a" strokeWidth="1.8" strokeDasharray="3 3" />
            <rect x="66" y="122" width="48" height="8" rx="3" {...dimStroke} />
            <line x1="90" y1="130" x2="90" y2="154" {...dimStroke} />
            <line x1="60" y1="112" x2="120" y2="112" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
            <circle cx="90" cy="76" r="9" {...strokeProps} />
            <line x1="90" y1="86" x2="90" y2="122" {...strokeProps} />
            <g className="anim-lift-y-deep">
              <line x1="48" y1="54" x2="132" y2="54" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <polyline points="90,92 64,74 54,54" {...strokeProps} />
              <polyline points="90,92 116,74 126,54" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'row_bent' && (
          <g>
            <line x1="28" y1="152" x2="152" y2="152" {...dimStroke} />
            <circle cx="122" cy="68" r="9" {...strokeProps} />
            <line x1="114" y1="76" x2="66" y2="96" {...strokeProps} />
            <polyline points="66,96 78,124 72,150" {...strokeProps} />
            <polyline points="66,96 92,124 90,150" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="104" y1="80" x2="104" y2="128" {...strokeProps} />
              <circle cx="104" cy="132" r="11" stroke={barColor} strokeWidth="3" fill="none" />
              <circle cx="104" cy="132" r="3.5" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'row_seated' && (
          <g>
            {/* Remada baixa sentado puxando cabo horizontal */}
            <line x1="148" y1="36" x2="148" y2="150" {...dimStroke} />
            <line x1="34" y1="132" x2="126" y2="132" {...dimStroke} />
            <circle cx="62" cy="66" r="9" {...strokeProps} />
            <line x1="62" y1="76" x2="62" y2="124" {...strokeProps} />
            <polyline points="62,124 106,124 124,132" {...strokeProps} />
            <g className="anim-row-pull">
              <line x1="62" y1="88" x2="112" y2="94" {...strokeProps} />
              <line x1="112" y1="94" x2="148" y2="94" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 3" />
              <rect x="108" y="88" width="8" height="12" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'row_supported' && (
          <g>
            {/* Remada com peito apoiado no banco inclinado */}
            <polyline points="48,148 86,84 114,84" {...dimStroke} />
            <line x1="40" y1="148" x2="146" y2="148" {...dimStroke} />
            <circle cx="116" cy="70" r="8.5" {...strokeProps} />
            <line x1="108" y1="78" x2="72" y2="114" {...strokeProps} />
            <polyline points="72,114 58,134 52,148" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="100" y1="88" x2="100" y2="132" {...strokeProps} />
              <rect x="92" y="130" width="16" height="7" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'row_one_arm' && (
          <g>
            {/* Remada unilateral serrote apoiado no banco */}
            <rect x="44" y="112" width="76" height="8" rx="3" {...dimStroke} />
            <line x1="54" y1="120" x2="54" y2="150" {...dimStroke} />
            <line x1="110" y1="120" x2="110" y2="150" {...dimStroke} />
            <circle cx="122" cy="76" r="8.5" {...strokeProps} />
            <line x1="114" y1="82" x2="66" y2="86" {...strokeProps} />
            <line x1="110" y1="84" x2="110" y2="112" {...strokeProps} />
            <polyline points="66,86 66,112 52,112" {...strokeProps} />
            <line x1="66" y1="86" x2="42" y2="148" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="94" y1="84" x2="94" y2="132" {...strokeProps} />
              <rect x="86" y="130" width="16" height="7" rx="2" fill={barColor} />
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
              <circle cx="104" cy="138" r="14" stroke={barColor} strokeWidth="3" fill="none" />
              <circle cx="104" cy="138" r="4" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'stiff_rdl' && (
          <g>
            {/* Stiff / RDL: pernas quase estendidas + dobradiça pura de quadril */}
            <line x1="28" y1="152" x2="152" y2="152" {...dimStroke} />
            <g className="anim-lift-y">
              <circle cx="122" cy="70" r="8.5" {...strokeProps} />
              <line x1="113" y1="74" x2="66" y2="88" {...strokeProps} />
              <polyline points="66,88 70,120 72,150" {...strokeProps} />
              <line x1="104" y1="78" x2="104" y2="126" {...strokeProps} />
              <rect x="95" y="124" width="18" height="7" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'back_extension' && (
          <g>
            {/* Banco romano 45° para hiperextensão de quadril */}
            <line x1="28" y1="150" x2="152" y2="150" {...dimStroke} />
            <line x1="56" y1="150" x2="92" y2="96" {...dimStroke} />
            <rect x="84" y="88" width="18" height="8" rx="3" {...dimStroke} />
            <line x1="90" y1="98" x2="54" y2="146" {...strokeProps} />
            <g style={{ transformOrigin: '90px 98px' }} className="anim-neck-nod">
              <line x1="90" y1="98" x2="128" y2="76" {...strokeProps} />
              <circle cx="136" cy="70" r="8.5" {...strokeProps} />
            </g>
          </g>
        )}

        {/* ======================== OMBROS (4) ======================== */}
        {archetype === 'overhead_press' && (
          <g>
            {/* Desenvolvimento vertical acima da cabeça */}
            <circle cx="90" cy="64" r="9" {...strokeProps} />
            <line x1="90" y1="74" x2="90" y2="122" {...strokeProps} />
            <line x1="90" y1="122" x2="78" y2="154" {...strokeProps} />
            <line x1="90" y1="122" x2="102" y2="154" {...strokeProps} />
            <g className="anim-lift-y">
              <polyline points="90,82 64,74 64,46" {...strokeProps} />
              <polyline points="90,82 116,74 116,46" {...strokeProps} />
              <line x1="44" y1="46" x2="136" y2="46" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="40" y="38" width="6" height="16" rx="2" fill={accentColor} />
              <rect x="134" y="38" width="6" height="16" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'lateral_raise' && (
          <g>
            <circle cx="90" cy="48" r="10" {...strokeProps} />
            <line x1="90" y1="58" x2="90" y2="112" {...strokeProps} />
            <line x1="90" y1="112" x2="78" y2="152" {...strokeProps} />
            <line x1="90" y1="112" x2="102" y2="152" {...strokeProps} />
            <g style={{ transformOrigin: '90px 68px' }} className="anim-lateral-left">
              <line x1="90" y1="68" x2="90" y2="114" {...strokeProps} />
              <rect x="83" y="112" width="14" height="6" rx="2" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '90px 68px' }} className="anim-lateral-right">
              <line x1="90" y1="68" x2="90" y2="114" {...strokeProps} />
              <rect x="83" y="112" width="14" height="6" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'upright_row' && (
          <g>
            {/* Remada alta: barra rente ao tronco subindo ao peito superior */}
            <circle cx="90" cy="44" r="9.5" {...strokeProps} />
            <line x1="90" y1="54" x2="90" y2="112" {...strokeProps} />
            <line x1="90" y1="112" x2="78" y2="154" {...strokeProps} />
            <line x1="90" y1="112" x2="102" y2="154" {...strokeProps} />
            <g className="anim-lift-y">
              <polyline points="90,64 62,74 74,98" {...strokeProps} />
              <polyline points="90,64 118,74 106,98" {...strokeProps} />
              <line x1="56" y1="98" x2="124" y2="98" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="52" y="90" width="6" height="16" rx="2" fill={accentColor} />
              <rect x="122" y="90" width="6" height="16" rx="2" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'rear_delt' && (
          <g>
            <line x1="28" y1="152" x2="152" y2="152" {...dimStroke} />
            <circle cx="126" cy="76" r="9" {...strokeProps} />
            <line x1="116" y1="80" x2="66" y2="92" {...strokeProps} />
            <polyline points="66,92 78,122 72,150" {...strokeProps} />
            <polyline points="66,92 92,122 90,150" {...strokeProps} />
            <g style={{ transformOrigin: '108px 82px' }} className="anim-lateral-right">
              <line x1="108" y1="82" x2="108" y2="126" {...strokeProps} />
              <rect x="101" y="124" width="14" height="6" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {/* ======================== BRAÇOS & ANTEBRAÇO (7) ======================== */}
        {archetype === 'curl_standing' && (
          <g>
            <circle cx="84" cy="44" r="10" {...strokeProps} />
            <line x1="84" y1="54" x2="84" y2="110" {...strokeProps} />
            <line x1="84" y1="110" x2="74" y2="154" {...strokeProps} />
            <line x1="84" y1="110" x2="94" y2="154" {...strokeProps} />
            <line x1="84" y1="64" x2="90" y2="96" {...strokeProps} />
            <g style={{ transformOrigin: '90px 96px' }} className="anim-swing-curl">
              <line x1="90" y1="96" x2="124" y2="96" {...strokeProps} />
              <circle cx="128" cy="96" r="7" stroke={barColor} strokeWidth="3" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'curl_preacher' && (
          <g>
            {/* Banco Scott / Concentrada com braço apoiado no pad inclinado */}
            <line x1="48" y1="126" x2="90" y2="126" {...dimStroke} />
            <line x1="66" y1="126" x2="66" y2="152" {...dimStroke} />
            <line x1="94" y1="82" x2="116" y2="116" {...dimStroke} />
            <line x1="104" y1="102" x2="104" y2="152" {...dimStroke} />
            <circle cx="72" cy="64" r="9" {...strokeProps} />
            <line x1="72" y1="74" x2="72" y2="120" {...strokeProps} />
            <polyline points="72,120 96,120 96,150" {...strokeProps} />
            <line x1="72" y1="82" x2="104" y2="104" {...strokeProps} />
            <g style={{ transformOrigin: '104px 104px' }} className="anim-swing-curl">
              <line x1="104" y1="104" x2="132" y2="104" {...strokeProps} />
              <circle cx="136" cy="104" r="6.5" stroke={barColor} strokeWidth="3" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'wrist_curl' && (
          <g>
            {/* Sentado com antebraços apoiados nas coxas flexionando os punhos */}
            <rect x="44" y="114" width="44" height="8" rx="3" {...dimStroke} />
            <line x1="58" y1="122" x2="58" y2="152" {...dimStroke} />
            <circle cx="64" cy="62" r="9" {...strokeProps} />
            <line x1="64" y1="72" x2="64" y2="112" {...strokeProps} />
            <polyline points="64,112 108,112 108,150" {...strokeProps} />
            <polyline points="64,84 82,106 112,106" {...strokeProps} />
            <g style={{ transformOrigin: '112px 106px' }} className="anim-neck-nod">
              <line x1="112" y1="106" x2="132" y2="102" {...strokeProps} />
              <circle cx="134" cy="102" r="6" stroke={barColor} strokeWidth="2.8" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'triceps_pushdown' && (
          <g>
            <line x1="138" y1="28" x2="138" y2="152" {...dimStroke} />
            <circle cx="76" cy="46" r="10" {...strokeProps} />
            <line x1="76" y1="56" x2="76" y2="112" {...strokeProps} />
            <line x1="76" y1="112" x2="66" y2="154" {...strokeProps} />
            <line x1="76" y1="112" x2="86" y2="154" {...strokeProps} />
            <line x1="76" y1="66" x2="84" y2="96" {...strokeProps} />
            <g style={{ transformOrigin: '84px 96px' }} className="anim-swing-pushdown">
              <line x1="84" y1="96" x2="118" y2="96" {...strokeProps} />
              <line x1="118" y1="96" x2="138" y2="34" stroke="#71717a" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="118" cy="96" r="5" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'triceps_skullcrusher' && (
          <g>
            {/* Tríceps testa deitado no banco flexionando atrás da cabeça */}
            <line x1="34" y1="128" x2="146" y2="128" {...dimStroke} />
            <line x1="52" y1="128" x2="52" y2="150" {...dimStroke} />
            <line x1="128" y1="128" x2="128" y2="150" {...dimStroke} />
            <circle cx="60" cy="116" r="8.5" {...strokeProps} />
            <line x1="70" y1="120" x2="120" y2="120" {...strokeProps} />
            <polyline points="120,120 138,128 142,150" {...strokeProps} />
            <line x1="76" y1="118" x2="70" y2="86" {...strokeProps} />
            <g style={{ transformOrigin: '70px 86px' }} className="anim-swing-curl">
              <line x1="70" y1="86" x2="46" y2="96" {...strokeProps} />
              <circle cx="42" cy="98" r="6" stroke={barColor} strokeWidth="2.8" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'triceps_overhead' && (
          <g>
            {/* Tríceps francês com braço vertical atrás da cabeça */}
            <circle cx="88" cy="64" r="9" {...strokeProps} />
            <line x1="88" y1="74" x2="88" y2="120" {...strokeProps} />
            <line x1="88" y1="120" x2="78" y2="154" {...strokeProps} />
            <line x1="88" y1="120" x2="98" y2="154" {...strokeProps} />
            <line x1="88" y1="80" x2="82" y2="46" {...strokeProps} />
            <g style={{ transformOrigin: '82px 46px' }} className="anim-swing-curl">
              <line x1="82" y1="46" x2="108" y2="38" {...strokeProps} />
              <rect x="106" y="31" width="12" height="12" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'triceps_kickback' && (
          <g>
            {/* Tríceps coice inclinado — preserva className="anim-swing-pushdown" para T2-F10-01 */}
            <line x1="28" y1="150" x2="152" y2="150" {...dimStroke} />
            <circle cx="122" cy="70" r="8.5" {...strokeProps} />
            <line x1="112" y1="74" x2="66" y2="88" {...strokeProps} />
            <polyline points="66,88 76,120 72,148" {...strokeProps} />
            <polyline points="66,88 92,120 90,148" {...strokeProps} />
            <line x1="104" y1="78" x2="88" y2="96" {...strokeProps} />
            <g style={{ transformOrigin: '88px 96px' }} className="anim-swing-pushdown">
              <line x1="88" y1="96" x2="60" y2="102" {...strokeProps} />
              <rect x="52" y="98" width="12" height="6" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {/* ======================== PERNAS & PANTURRILHAS (9) ======================== */}
        {archetype === 'squat' && (
          <g>
            <line x1="30" y1="152" x2="150" y2="152" {...dimStroke} />
            <g className="anim-lift-y-deep">
              <circle cx="90" cy="44" r="10" {...strokeProps} />
              <line x1="42" y1="58" x2="138" y2="58" stroke={barColor} strokeWidth="3.5" strokeLinecap="round" />
              <rect x="38" y="48" width="6" height="20" rx="2" fill={accentColor} />
              <rect x="136" y="48" width="6" height="20" rx="2" fill={accentColor} />
              <line x1="90" y1="54" x2="90" y2="100" {...strokeProps} />
              <polyline points="90,62 66,68 60,58" {...strokeProps} />
              <polyline points="90,62 114,68 120,58" {...strokeProps} />
              <polyline points="90,100 72,126 76,148" {...strokeProps} />
              <polyline points="90,100 108,126 104,148" {...strokeProps} />
            </g>
          </g>
        )}

        {archetype === 'hack_squat' && (
          <g>
            {/* Máquina Hack Squat 45° */}
            <line x1="46" y1="42" x2="112" y2="148" {...dimStroke} />
            <line x1="100" y1="148" x2="146" y2="148" {...dimStroke} />
            <g className="anim-press-diag">
              <circle cx="72" cy="54" r="8.5" {...strokeProps} />
              <line x1="78" y1="62" x2="98" y2="98" {...strokeProps} />
              <polyline points="98,98 124,116 122,146" {...strokeProps} />
              <rect x="54" y="64" width="12" height="26" rx="2" fill={barColor} transform="rotate(-32 54 64)" />
            </g>
          </g>
        )}

        {archetype === 'legpress' && (
          <g>
            <polyline points="34,116 66,138 96,138" {...dimStroke} />
            <circle cx="48" cy="108" r="9" {...strokeProps} />
            <line x1="56" y1="116" x2="84" y2="134" {...strokeProps} />
            <g className="anim-press-diag">
              <polyline points="84,134 102,102 126,86" {...strokeProps} />
              <line x1="118" y1="68" x2="144" y2="96" stroke={barColor} strokeWidth="4" strokeLinecap="round" />
              <rect x="132" y="60" width="10" height="22" rx="2" fill={accentColor} transform="rotate(-42 132 60)" />
            </g>
          </g>
        )}

        {archetype === 'leg_extension' && (
          <g>
            {/* Cadeira Extensora — preserva className="anim-leg-ext" para T2-F10-02 */}
            <polyline points="56,64 56,112 104,112" {...dimStroke} />
            <line x1="66" y1="112" x2="66" y2="150" {...dimStroke} />
            <circle cx="68" cy="52" r="9" {...strokeProps} />
            <line x1="68" y1="62" x2="68" y2="104" {...strokeProps} />
            <line x1="68" y1="104" x2="104" y2="104" {...strokeProps} />
            <g style={{ transformOrigin: '104px 104px' }} className="anim-leg-ext">
              <line x1="104" y1="104" x2="104" y2="144" {...strokeProps} />
              <circle cx="109" cy="138" r="6" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'leg_curl' && (
          <g>
            {/* Mesa Flexora (decúbito ventral flexionando joelhos em direção aos glúteos) */}
            <polyline points="32,124 114,124 114,150" {...dimStroke} />
            <line x1="46" y1="124" x2="46" y2="150" {...dimStroke} />
            <circle cx="44" cy="110" r="8.5" {...strokeProps} />
            <line x1="54" y1="116" x2="112" y2="116" {...strokeProps} />
            <g style={{ transformOrigin: '112px 116px' }} className="anim-swing-curl">
              <line x1="112" y1="116" x2="148" y2="116" {...strokeProps} />
              <circle cx="144" cy="110" r="5.5" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'adduction' && (
          <g>
            {/* Cadeira Adutora: vista frontal fechando as coxas para o centro */}
            <rect x="68" y="96" width="44" height="10" rx="3" {...dimStroke} />
            <line x1="76" y1="106" x2="70" y2="148" {...dimStroke} />
            <line x1="104" y1="106" x2="110" y2="148" {...dimStroke} />
            <circle cx="90" cy="46" r="9" {...strokeProps} />
            <line x1="90" y1="56" x2="90" y2="96" {...strokeProps} />
            <g style={{ transformOrigin: '80px 98px' }} className="anim-fly-right">
              <line x1="80" y1="98" x2="62" y2="142" {...strokeProps} />
              <rect x="64" y="122" width="6" height="12" rx="2" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '100px 98px' }} className="anim-fly-left">
              <line x1="100" y1="98" x2="118" y2="142" {...strokeProps} />
              <rect x="110" y="122" width="6" height="12" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'calf_standing' && (
          <g>
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

        {archetype === 'calf_seated' && (
          <g>
            {/* Gêmeos sentado (sóleo a 90° com carga nos joelhos e bloco de 3") */}
            <rect x="46" y="114" width="42" height="8" rx="3" {...dimStroke} />
            <line x1="58" y1="122" x2="58" y2="152" {...dimStroke} />
            <rect x="98" y="144" width="32" height="10" rx="2" {...dimStroke} />
            <circle cx="64" cy="58" r="9" {...strokeProps} />
            <line x1="64" y1="68" x2="64" y2="112" {...strokeProps} />
            <g className="anim-lift-y">
              <polyline points="64,112 108,112 108,144" {...strokeProps} />
              <rect x="96" y="96" width="22" height="10" rx="3" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'calf_legpress' && (
          <g>
            {/* Gêmeos no Leg Press / Reeves Toe Press: joelhos quase estendidos + flexão plantar na borda */}
            <polyline points="30,118 62,140 92,140" {...dimStroke} />
            <circle cx="44" cy="110" r="8.5" {...strokeProps} />
            <line x1="52" y1="118" x2="80" y2="136" {...strokeProps} />
            <line x1="80" y1="136" x2="124" y2="98" {...strokeProps} />
            <g className="anim-press-diag">
              <line x1="120" y1="88" x2="136" y2="104" stroke={barColor} strokeWidth="4" strokeLinecap="round" />
              <circle cx="132" cy="92" r="5" fill={accentColor} />
            </g>
          </g>
        )}

        {/* ======================== GLÚTEOS (6) ======================== */}
        {archetype === 'abduction' && (
          <g>
            <rect x="68" y="96" width="44" height="10" rx="3" {...dimStroke} />
            <line x1="76" y1="106" x2="70" y2="148" {...dimStroke} />
            <line x1="104" y1="106" x2="110" y2="148" {...dimStroke} />
            <circle cx="90" cy="46" r="9" {...strokeProps} />
            <line x1="90" y1="56" x2="90" y2="96" {...strokeProps} />
            <g style={{ transformOrigin: '82px 98px' }} className="anim-lateral-left">
              <line x1="82" y1="98" x2="62" y2="142" {...strokeProps} />
              <circle cx="62" cy="142" r="4.5" fill={barColor} />
            </g>
            <g style={{ transformOrigin: '98px 98px' }} className="anim-lateral-right">
              <line x1="98" y1="98" x2="118" y2="142" {...strokeProps} />
              <circle cx="118" cy="142" r="4.5" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'lunge' && (
          <g>
            <line x1="26" y1="150" x2="154" y2="150" {...dimStroke} />
            <g className="anim-lift-y-deep">
              <circle cx="88" cy="44" r="9" {...strokeProps} />
              <line x1="88" y1="54" x2="88" y2="98" {...strokeProps} />
              <polyline points="88,98 116,114 116,148" {...strokeProps} />
              <polyline points="88,98 58,124 42,148" {...strokeProps} />
              <line x1="88" y1="64" x2="88" y2="108" {...strokeProps} />
              <rect x="80" y="106" width="16" height="7" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'bulgarian_squat' && (
          <g>
            {/* Agachamento Búlgaro: pé traseiro elevado no banco atrás */}
            <rect x="28" y="114" width="32" height="36" rx="3" {...dimStroke} />
            <line x1="24" y1="150" x2="156" y2="150" {...dimStroke} />
            <g className="anim-lift-y-deep">
              <circle cx="96" cy="44" r="9" {...strokeProps} />
              <line x1="96" y1="54" x2="96" y2="96" {...strokeProps} />
              <polyline points="96,96 122,114 122,148" {...strokeProps} />
              <polyline points="96,96 70,122 48,114" {...strokeProps} />
              <line x1="96" y1="66" x2="96" y2="106" {...strokeProps} />
              <rect x="88" y="104" width="16" height="6.5" rx="2" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'hip_thrust' && (
          <g>
            <rect x="28" y="110" width="32" height="36" rx="4" {...dimStroke} />
            <line x1="24" y1="146" x2="156" y2="146" {...dimStroke} />
            <circle cx="48" cy="96" r="9" {...strokeProps} />
            <g className="anim-lift-y">
              <line x1="56" y1="104" x2="104" y2="102" {...strokeProps} />
              <polyline points="104,102 132,114 134,146" {...strokeProps} />
              <circle cx="102" cy="94" r="11" stroke={barColor} strokeWidth="3" fill="none" />
              <circle cx="102" cy="94" r="4" fill={accentColor} />
            </g>
          </g>
        )}

        {archetype === 'kickback' && (
          <g>
            <line x1="42" y1="36" x2="42" y2="150" {...dimStroke} />
            <line x1="28" y1="150" x2="154" y2="150" {...dimStroke} />
            <circle cx="74" cy="56" r="9" {...strokeProps} />
            <line x1="72" y1="66" x2="82" y2="104" {...strokeProps} />
            <line x1="72" y1="74" x2="44" y2="86" {...strokeProps} />
            <line x1="82" y1="104" x2="78" y2="148" {...strokeProps} />
            <g style={{ transformOrigin: '82px 104px' }} className="anim-leg-ext">
              <polyline points="82,104 112,124 134,136" {...strokeProps} />
              <circle cx="134" cy="136" r="5" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'glute_quadruped' && (
          <g>
            {/* Glúteo 4 apoios no colchonete elevando calcanhar ao teto */}
            <line x1="26" y1="148" x2="154" y2="148" {...dimStroke} />
            <circle cx="52" cy="84" r="8.5" {...strokeProps} />
            <line x1="60" y1="88" x2="106" y2="92" {...strokeProps} />
            <line x1="64" y1="90" x2="64" y2="146" {...strokeProps} />
            <polyline points="106,92 106,146 124,146" {...strokeProps} />
            <g style={{ transformOrigin: '106px 92px' }} className="anim-leg-ext">
              <polyline points="106,92 134,84 134,58" {...strokeProps} />
              <circle cx="134" cy="54" r="5" fill={barColor} />
            </g>
          </g>
        )}

        {/* ======================== ABDÔMEN & PESCOÇO (3) ======================== */}
        {archetype === 'vacuum' && (
          <g>
            <line x1="30" y1="146" x2="150" y2="146" {...dimStroke} />
            <circle cx="128" cy="84" r="9" {...strokeProps} />
            <line x1="118" y1="88" x2="64" y2="90" {...strokeProps} />
            <line x1="114" y1="90" x2="114" y2="144" {...strokeProps} />
            <polyline points="64,90 64,144 46,144" {...strokeProps} />
            <g style={{ transformOrigin: '90px 90px' }} className="anim-vacuum">
              <path d="M 68 96 Q 90 118 112 96" stroke={barColor} strokeWidth="3" fill="none" strokeDasharray="4 3" />
            </g>
          </g>
        )}

        {archetype === 'hanging_leg' && (
          <g>
            <line x1="40" y1="30" x2="140" y2="30" stroke={barColor} strokeWidth="4" strokeLinecap="round" />
            <line x1="80" y1="30" x2="80" y2="62" {...strokeProps} />
            <circle cx="84" cy="60" r="9" {...strokeProps} />
            <line x1="82" y1="69" x2="82" y2="106" {...strokeProps} />
            <g style={{ transformOrigin: '82px 106px' }} className="anim-leg-hang">
              <line x1="82" y1="106" x2="82" y2="152" {...strokeProps} />
              <circle cx="86" cy="152" r="4" fill={barColor} />
            </g>
          </g>
        )}

        {archetype === 'neck_bench' && (
          <g>
            {/* Flexão/Extensão de pescoço no banco com anilha acolchoada (seguro — McCallum) */}
            <line x1="62" y1="120" x2="146" y2="120" {...dimStroke} />
            <line x1="74" y1="120" x2="74" y2="148" {...dimStroke} />
            <line x1="132" y1="120" x2="132" y2="148" {...dimStroke} />
            <line x1="68" y1="112" x2="124" y2="112" {...strokeProps} />
            <polyline points="124,112 140,122 144,148" {...strokeProps} />
            <g style={{ transformOrigin: '68px 112px' }} className="anim-neck-nod">
              <line x1="68" y1="112" x2="50" y2="108" {...strokeProps} />
              <circle cx="44" cy="106" r="9" {...strokeProps} />
              <rect x="38" y="92" width="12" height="5" rx="2" fill={barColor} />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
