import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  Zap,
  Sparkles,
  Timer,
  Moon,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  isOptionalExercise,
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  getRepsPlaceholder,
  parseRestSeconds,
  cleanAdvancedTechnique
} from '../utils/exerciseNormalizer';
import { formatWeightDisplay } from '../utils/numberFormat';
import { unlockTimerAudio } from '../utils/timerAudio';
import ExerciseCardCompleted from './ExerciseCardCompleted';
import ExerciseLogForm from './ExerciseLogForm';
import ExerciseHistoryList from './ExerciseHistoryList';

function explainCadence(cadenceText) {
  const m = (cadenceText || '').trim().match(/^(\d+)-(\d+)-(\d+)-(\d+)$/);
  if (!m) {
    return 'Controle a fase de descida e subida sob tensão contínua sem pausar nos extremos.';
  }
  return `${m[1]}s descendo (excêntrica) • ${m[2]}s no fundo • ${m[3]}s subindo (concêntrica) • ${m[4]}s no topo.`;
}

export default function ExerciseCard({
  data,
  onSaveSet,
  onToggleComplete,
  onDeleteLog,
  onTriggerTimer,
  onOpenScreensaver,
  onOpenPrincipleSection,
  isFocused = false,
  history,
  todaySetsCount = 0,
  isCompleted,
  uiScale = 'normal'
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showCadenceHelp, setShowCadenceHelp] = useState(false);
  const [expandNotes, setExpandNotes] = useState(false);

  const rawExerciseName = data['Exercício'] || '';
  const isOptional = isOptionalExercise(rawExerciseName);
  const displayTitle = getDisplayExerciseName(rawExerciseName);
  const canonicalKey = getCanonicalExerciseKey(rawExerciseName);

  const isScaledUp = uiScale === 'large' || uiScale === 'xlarge';
  const isExtraLarge = uiScale === 'xlarge';

  const lastLog = history && history.length > 0 ? history[0] : null;
  const advancedTechnique = cleanAdvancedTechnique(data['Técnica Avançada']);
  const restDescription = (data['Descanso'] || '').trim() || '60-75s (Hipertrofia controlada)';
  const restSeconds = parseRestSeconds(restDescription, advancedTechnique, data['Grupo muscular']);
  const defaultRepsPlaceholder = getRepsPlaceholder(data['Séries/Reps']);

  const handleQuickFillLast = (e) => {
    e.stopPropagation();
    if (!lastLog) return;
    setWeight(formatWeightDisplay(lastLog.weight));
    if (lastLog.reps) setReps(String(lastLog.reps));
  };

  if (isCompleted) {
    return (
      <ExerciseCardCompleted
        data={data}
        displayTitle={displayTitle}
        isOptional={isOptional}
        canonicalKey={canonicalKey}
        lastLog={lastLog}
        todaySetsCount={todaySetsCount}
        onToggleComplete={onToggleComplete}
        isScaledUp={isScaledUp}
      />
    );
  }

  const cardStyles = isOptional
    ? isFocused
      ? 'bg-purple-950/20 border-sky-500/80 border-dashed ring-1 ring-sky-500/30'
      : 'bg-purple-950/15 border-purple-800/70 border-dashed'
    : isFocused
    ? 'bg-zinc-950 border-sky-500/80 ring-1 ring-sky-500/30'
    : 'bg-zinc-950 border-zinc-800/90';

  const headerStyles = isOptional
    ? 'bg-purple-950/30 border-purple-800/60'
    : 'bg-zinc-900/50 border-zinc-800/80';

  const hasLongMetricsText =
    (data['Séries/Reps'] || '').length > 16 || (data['Cadência'] || '').length > 14;
  const stackMetrics = isExtraLarge || (isScaledUp && hasLongMetricsText);

  const execText = (data['Modo de execução'] || '').trim();
  const obsText = (data['Observação'] || '').trim();
  const isLongText = execText.length + obsText.length > 170;

  return (
    <article className={`rounded-2xl border overflow-hidden mb-4 transition-all ${cardStyles}`}>
      {/* Cabeçalho */}
      <div className={`p-3.5 border-b flex justify-between items-start gap-2 ${headerStyles}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            {data['Ordem'] && data['Ordem'] !== '99' && (
              <span className="text-xs font-extrabold bg-zinc-800 text-zinc-200 border border-zinc-700 px-1.5 py-0.5 rounded-md font-mono">
                #{data['Ordem']}
              </span>
            )}
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              {data['Grupo muscular']}
            </span>
            {todaySetsCount > 0 && (
              <span className="text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/70 px-2 py-0.5 rounded-full">
                {todaySetsCount} {todaySetsCount === 1 ? 'série' : 'séries'}
              </span>
            )}
            {isOptional && (
              <span className="flex items-center gap-1 text-xs font-bold bg-purple-900/70 text-purple-200 border border-purple-700/60 px-2 py-0.5 rounded-full uppercase">
                <Sparkles className="w-3 h-3" />
                Opcional
              </span>
            )}
          </div>
          <h3 className="text-lg font-extrabold leading-snug text-white">
            {displayTitle}
          </h3>
          {data['Especificação do grupo muscular'] && (
            <span className="text-xs text-zinc-400 block mt-0.5">
              {data['Especificação do grupo muscular']}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {lastLog && (
            <button
              type="button"
              onClick={handleQuickFillLast}
              className="min-h-[44px] px-2.5 py-1 text-right bg-black hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-colors cursor-pointer"
              title="Toque para preencher com a última carga"
            >
              <div className="text-[0.65rem] text-zinc-400 uppercase tracking-wider leading-none">
                Última
              </div>
              <div className="font-bold text-xs text-emerald-400 font-mono mt-0.5">
                {formatWeightDisplay(lastLog.weight)}kg{lastLog.reps ? `×${lastLog.reps}` : ''}
              </div>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockTimerAudio();
              if (onOpenScreensaver) onOpenScreensaver(data, restSeconds);
            }}
            aria-label={`Abrir Modo Foco OLED para ${displayTitle}`}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              isFocused
                ? 'border-sky-600 bg-sky-950/60 text-sky-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-sky-950/50 hover:text-sky-300'
            }`}
            title="Modo Foco OLED (Screensaver)"
          >
            <Moon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Métricas: Séries/Reps, Cadência Tocável, Descanso + Timer e Técnica Avançada */}
      <div className={`p-3.5 grid ${stackMetrics ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 text-sm`}>
        <div className="flex items-start gap-2 bg-black/70 p-2.5 rounded-xl border border-zinc-800/80">
          <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <span className="block text-zinc-400 text-xs">Séries / Reps</span>
            <span className="font-bold text-zinc-100 text-sm">{data['Séries/Reps']}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowCadenceHelp((prev) => !prev);
          }}
          className="text-left flex items-start justify-between gap-2 bg-black/70 hover:bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/80 transition-colors cursor-pointer"
          aria-expanded={showCadenceHelp}
        >
          <div className="flex items-start gap-2 min-w-0">
            <Clock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
            <div className="min-w-0">
              <span className="block text-zinc-400 text-xs">Cadência</span>
              <span className="font-bold text-zinc-100 text-sm">{data['Cadência']}</span>
            </div>
          </div>
          <HelpCircle className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
        </button>

        {showCadenceHelp && (
          <div className={`${stackMetrics ? 'col-span-1' : 'col-span-2'} bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-200 flex items-center justify-between gap-2 ui-fade-in`}>
            <span>{explainCadence(data['Cadência'])}</span>
            {onOpenPrincipleSection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPrincipleSection('principio-2');
                }}
                className="min-h-[36px] px-2.5 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-800/60 font-bold whitespace-nowrap cursor-pointer"
              >
                Ler Regra
              </button>
            )}
          </div>
        )}

        {/* Descanso Recomendado + Botão Iniciar >= 44px */}
        <div
          className={`${stackMetrics ? 'col-span-1' : 'col-span-2'} flex ${
            isExtraLarge ? 'flex-col items-stretch' : 'items-center justify-between'
          } gap-2.5 bg-black/70 p-2.5 rounded-xl border border-zinc-800/80`}
        >
          <div className="flex items-start gap-2 min-w-0">
            <Timer className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
            <div className="min-w-0">
              <span className="block text-zinc-400 text-xs font-semibold">Descanso</span>
              <span className="text-zinc-200 text-xs font-medium leading-snug">{restDescription}</span>
            </div>
          </div>

          {onTriggerTimer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unlockTimerAudio();
                onTriggerTimer(restSeconds, data, displayTitle);
              }}
              className="min-h-[44px] px-3.5 py-2 flex items-center justify-center gap-1.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-700/70 text-blue-200 hover:text-white text-xs font-extrabold flex-shrink-0 transition-colors cursor-pointer"
              title={`Iniciar cronômetro de ${restSeconds}s`}
            >
              <Timer className="w-4 h-4" />
              <span>Iniciar {restSeconds}s</span>
            </button>
          )}
        </div>

        {/* Técnica Avançada (apenas quando preenchida) com deep-link '?' */}
        {advancedTechnique && (
          <div className={`${stackMetrics ? 'col-span-1' : 'col-span-2'} flex items-center justify-between gap-2 bg-amber-950/25 p-2.5 rounded-xl border border-amber-800/50`}>
            <div className="flex items-start gap-2 min-w-0">
              <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="block text-amber-400 text-xs font-bold uppercase tracking-wider">
                  Técnica Avançada
                </span>
                <span className="text-amber-100 text-sm font-medium">{advancedTechnique}</span>
              </div>
            </div>
            {onOpenPrincipleSection && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPrincipleSection('glossario');
                }}
                aria-label="Entender esta técnica no glossário"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-amber-300 hover:bg-amber-900/40 flex-shrink-0 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Execução & Nota (Colapsável para manter altura ergonômica durante o treino — Item 4.5) */}
      <div className="px-3.5 pb-3.5 text-sm text-zinc-200 space-y-2">
        <p className={`leading-relaxed ${isLongText && !expandNotes ? 'line-clamp-2' : ''}`}>
          <span className="font-bold text-white">Execução:</span> {execText}
        </p>
        {obsText && (!isLongText || expandNotes) && (
          <p className="text-xs text-zinc-300 bg-black/70 p-2.5 rounded-xl border border-zinc-800/80 leading-relaxed">
            <span className="font-bold text-zinc-200">Nota:</span> {obsText}
          </p>
        )}
        {isLongText && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandNotes((prev) => !prev);
            }}
            className="min-h-[40px] px-2 -ml-2 text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
          >
            {expandNotes ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Recolher detalhes
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Ver execução completa e nota
              </>
            )}
          </button>
        )}
      </div>

      {/* Registro de Série & Histórico */}
      <div className={`p-3.5 border-t ${isOptional ? 'bg-purple-950/20 border-purple-800/60' : 'bg-zinc-900/40 border-zinc-800/80'}`}>
        <ExerciseLogForm
          exerciseId={`${canonicalKey}-${data['Ordem'] || '0'}`}
          weight={weight}
          reps={reps}
          onWeightChange={setWeight}
          onRepsChange={setReps}
          lastLog={lastLog}
          defaultRepsPlaceholder={defaultRepsPlaceholder}
          todaySetsCount={todaySetsCount}
          historyCount={history?.length || 0}
          showHistory={showHistory}
          onSaveSet={() => {
            onSaveSet(canonicalKey, displayTitle, weight, reps, restSeconds, data);
            setReps('');
          }}
          onToggleComplete={() => onToggleComplete(canonicalKey, displayTitle)}
          onToggleHistory={() => setShowHistory((prev) => !prev)}
        />

        {showHistory && (
          <ExerciseHistoryList
            history={history}
            canonicalKey={canonicalKey}
            onDeleteLog={onDeleteLog}
          />
        )}
      </div>
    </article>
  );
}
