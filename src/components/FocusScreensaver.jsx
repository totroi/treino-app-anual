import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  BellOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  Zap,
  Save,
  Check,
  CheckCircle2,
  HelpCircle,
  Link2,
  ArrowRight,
  Trophy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ExerciseSilhouette from './ExerciseSilhouette';
import {
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  getRepsPlaceholder,
  parseRestSeconds,
  cleanAdvancedTechnique
} from '../utils/exerciseNormalizer';
import { findGlossaryEntriesForTechnique } from '../utils/glossaryData';
import { formatWeightDisplay, parsePtBrNumber } from '../utils/numberFormat';
import { TIMER_VOLUME_LEVELS } from '../utils/timerAudio';

const ULTRA_ECO_IDLE_MS = 12 * 1000;
const WAKELOCK_IDLE_RELEASE_MS = 90 * 1000;

function FocusScreensaverContent({
  exercise,
  pairContext = null,
  lastLog,
  prLog = null,
  todaySetsCount = 0,
  isCompleted = false,
  timer,
  onSaveSet,
  onToggleComplete,
  onExit,
  isFemale,
  isUltraEco,
  setIsUltraEco,
  setIsInputFocused
}) {
  // Pré-preenche carga se já houver série ativa nesta sessão (continuidade rápida entre séries)
  const [weight, setWeight] = useState(() =>
    todaySetsCount > 0 && lastLog ? formatWeightDisplay(lastLog.weight) : ''
  );
  const [reps, setReps] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showTechTip, setShowTechTip] = useState(false);
  const [showExecNotes, setShowExecNotes] = useState(false);
  const savedFeedbackRef = useRef(null);

  useEffect(() => {
    return () => {
      if (savedFeedbackRef.current) clearTimeout(savedFeedbackRef.current);
    };
  }, []);

  const rawName = exercise['Exercício'] || '';
  const displayName = getDisplayExerciseName(rawName);
  const canonicalKey = getCanonicalExerciseKey(rawName);
  const ordem = String(exercise['Ordem'] || '').trim();
  const showOrdem = Boolean(ordem) && ordem !== '99';
  const muscleSpec = String(exercise['Especificação do grupo muscular'] || '').trim();
  const executionText = String(exercise['Modo de execução'] || '').trim();
  const noteText = String(exercise['Observação'] || '').trim();
  const cadence = String(exercise['Cadência'] || '').trim();

  const advancedTechnique = cleanAdvancedTechnique(exercise['Técnica Avançada']);
  const restDescription = (exercise['Descanso'] || '').trim() || '60-75s (Hipertrofia controlada)';
  const isPairFirstStep = Boolean(pairContext && pairContext.step === 1 && pairContext.onSwitchToPartner);
  const restSeconds = parseRestSeconds(
    restDescription,
    advancedTechnique,
    exercise['Grupo muscular'],
    pairContext?.step || null
  );
  const defaultRepsPlaceholder = getRepsPlaceholder(exercise['Séries/Reps']);
  const canSave = !Number.isNaN(parsePtBrNumber(weight));

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveSeconds =
    timer.isRunning || timer.isAlarmRinging || timer.justFinished || timer.secondsLeft > 0
      ? timer.secondsLeft
      : restSeconds;

  const progressPct =
    timer.totalSeconds > 0 && (timer.isRunning || timer.justFinished || timer.isAlarmRinging)
      ? Math.min(100, Math.round(((timer.totalSeconds - timer.secondsLeft) / timer.totalSeconds) * 100))
      : 0;

  const handleQuickFillLast = () => {
    if (!lastLog) return;
    setWeight(formatWeightDisplay(lastLog.weight));
    if (lastLog.reps) setReps(String(lastLog.reps));
  };

  const handleQuickFillPr = () => {
    if (!prLog) return;
    setWeight(formatWeightDisplay(prLog.weight));
    if (prLog.reps) setReps(String(prLog.reps));
  };

  const lastLogLabel = lastLog
    ? `${formatWeightDisplay(lastLog.weight)}kg${lastLog.reps ? `×${lastLog.reps}` : ''}`
    : '';
  const prLogLabel = prLog
    ? `${formatWeightDisplay(prLog.weight)}kg${prLog.reps ? `×${prLog.reps}` : ''}`
    : '';
  const isSameLastAndPr = Boolean(
    lastLog &&
      prLog &&
      formatWeightDisplay(lastLog.weight) === formatWeightDisplay(prLog.weight) &&
      String(lastLog.reps || '') === String(prLog.reps || '')
  );

  const handleSaveSetInFocus = (e) => {
    if (e) e.preventDefault();
    if (!canSave || !onSaveSet) return;
    const saved = onSaveSet(canonicalKey, displayName, weight, reps, restSeconds, exercise);
    if (!saved) return;
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setIsInputFocused(false);

    if (isPairFirstStep) {
      setReps('');
      pairContext.onSwitchToPartner();
      return;
    }

    timer.startTimer(restSeconds, false, displayName);
    setReps('');
    setSavedSuccess(true);
    if (savedFeedbackRef.current) clearTimeout(savedFeedbackRef.current);
    savedFeedbackRef.current = setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleCompleteInFocus = () => {
    if (onToggleComplete && !isCompleted) {
      onToggleComplete(canonicalKey, displayName);
    }
    onExit(true);
  };

  const techniqueMatches = advancedTechnique
    ? findGlossaryEntriesForTechnique(advancedTechnique)
    : [];

  const showUltraEcoView = isUltraEco && !timer.isAlarmRinging;
  const volumeLabel = TIMER_VOLUME_LEVELS[timer.volumeLevel]?.label || 'Alto';

  // ESTÁGIO 2: ULTRA ECO OLED (>92–95% pixels #000000 desligados + luminância reduzida + dados essenciais R7)
  if (showUltraEcoView) {
    const ultraEcoStatus = timer.isRunning
      ? 'Descansando'
      : timer.justFinished
      ? 'Pronto'
      : isPairFirstStep && restSeconds === 0
      ? 'Transição 0s → 2/2'
      : 'Aguardando série';

    return (
      <div
        onClick={() => setIsUltraEco(false)}
        className="fixed inset-0 z-50 min-h-[100dvh] bg-black text-zinc-500 flex flex-col items-center justify-between px-safe pt-safe-screen pb-safe-screen select-none cursor-pointer"
        role="dialog"
        aria-modal="true"
        aria-label="Modo Foco Ultra Eco OLED — toque para acordar controles"
      >
        <div className="w-full max-w-sm flex items-center justify-between gap-2 text-[0.7rem] text-zinc-700 uppercase tracking-widest">
          <span className="truncate">
            Eco OLED • {showOrdem ? `#${ordem} • ` : ''}
            {pairContext
              ? `${pairContext.pairType} ${pairContext.step}/${pairContext.total}`
              : exercise['Grupo muscular']}
          </span>
          <span className="flex-shrink-0">
            {todaySetsCount > 0 ? `${todaySetsCount} ${todaySetsCount === 1 ? 'série' : 'séries'}` : 'True Black'}
          </span>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center text-center my-auto anim-oled-drift opacity-60">
          <ExerciseSilhouette
            exerciseName={displayName}
            muscleGroup={exercise['Grupo muscular']}
            accentColor={isFemale ? '#be185d' : '#0369a1'}
            sizeClass="w-32 h-32"
            lowPower
            paused={!timer.isRunning}
          />

          <h2 className="text-base font-bold text-zinc-400 leading-snug mt-2 px-4">
            {displayName}
          </h2>
          {muscleSpec && (
            <span className="text-xs text-zinc-600 truncate max-w-[92%] mt-0.5">{muscleSpec}</span>
          )}

          {/* Faixa de telemetria R7 em 3 pílulas True Black (Séries/Reps + Cadência obrigatória + Descanso) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs">
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-400">
              {exercise['Séries/Reps']}
            </span>
            <span
              data-testid="ultra-eco-cadence"
              className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full font-mono text-zinc-300"
            >
              {cadence ? `Cad. ${cadence}` : 'Cad. Livre'}
            </span>
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-500">
              {isPairFirstStep && restSeconds === 0 ? 'Par 0s' : `Desc. ${restSeconds}s`}
            </span>
          </div>

          {/* Referência compacta de Carga (Última & PR) */}
          {(lastLogLabel || prLogLabel) && (
            <div className="font-mono text-xs text-zinc-500 mt-2 px-3 truncate max-w-full">
              {isSameLastAndPr ? (
                <span>Última/PR: {lastLogLabel}</span>
              ) : (
                <>
                  {lastLogLabel && <span>Última: {lastLogLabel}</span>}
                  {lastLogLabel && prLogLabel && <span> • </span>}
                  {prLogLabel && <span>PR: {prLogLabel}</span>}
                </>
              )}
            </div>
          )}

          {/* Técnica Avançada (quando existir) */}
          {advancedTechnique && (
            <div className="mt-2 max-w-[92%] bg-black border border-amber-950/70 px-2.5 py-0.5 rounded-full text-[11px] text-amber-600/80 truncate">
              {advancedTechnique}
            </div>
          )}

          <div
            className={`text-5xl font-mono font-bold tracking-tight mt-5 ${
              timer.justFinished ? 'text-emerald-500/80' : 'text-zinc-400'
            }`}
          >
            {formatTime(effectiveSeconds)}
          </div>
          <span className="text-xs text-zinc-600 uppercase tracking-widest mt-1.5">
            {ultraEcoStatus}
          </span>
        </div>

        <div className="text-xs text-zinc-700 tracking-wide">
          Toque na tela para registrar série ou sair
        </div>
      </div>
    );
  }

  // ESTÁGIO 1: INTERATIVO DIMMED (fluxo estável justify-start + R7 PR/Descanso/Acordeão + R8 contraste)
  return (
    <div
      className="fixed inset-0 z-50 min-h-[100dvh] bg-black text-zinc-400 flex flex-col items-center justify-start px-safe pt-safe-screen pb-safe-screen overflow-y-auto overscroll-contain ui-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Modo Foco OLED"
    >
      {/* Topo discreto com contraste apagado */}
      <div className="w-full max-w-sm flex items-center justify-between text-xs text-zinc-600 uppercase tracking-widest mb-2">
        <span>Modo Foco • Eco OLED</span>
        {todaySetsCount > 0 ? (
          <span className="text-emerald-500/80 font-bold normal-case tracking-normal">
            {todaySetsCount} {todaySetsCount === 1 ? 'série feita' : 'séries feitas'}
          </span>
        ) : (
          <span className="text-zinc-700">90% True Black</span>
        )}
      </div>

      {/* Conteúdo central em fluxo estável */}
      <div className="w-full max-w-sm flex flex-col items-center text-center py-1 space-y-3">
        <div className="w-full flex flex-col items-center anim-oled-drift select-none">
          <ExerciseSilhouette
            exerciseName={displayName}
            muscleGroup={exercise['Grupo muscular']}
            accentColor={timer.isAlarmRinging ? '#10b981' : isFemale ? '#db2777' : '#0284c7'}
            sizeClass="w-24 h-24"
            lowPower
          />

          {/* R8: text-sky-400 (#f472b6 no Pink OLED / #38bdf8 no Blue OLED) para contraste superior */}
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mt-1">
            {showOrdem ? `#${ordem} • ` : ''}
            {pairContext ? `${pairContext.pairType} ${pairContext.step}/${pairContext.total} • ` : ''}
            {exercise['Grupo muscular']}
          </span>
          <h2 className="text-base font-bold text-zinc-300 leading-snug mt-0.5 px-2">
            {displayName}
          </h2>
          {muscleSpec && (
            <p className="text-xs text-zinc-500 mt-0.5 px-2 leading-snug">{muscleSpec}</p>
          )}

          {pairContext && pairContext.onSwitchToPartner && (
            <button
              type="button"
              onClick={pairContext.onSwitchToPartner}
              className="mt-1.5 min-h-[34px] inline-flex items-center gap-1.5 bg-black hover:border-amber-700 border border-amber-950 px-3 py-1 rounded-full text-xs text-amber-400/90 max-w-full transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {pairContext.step === 1
                  ? `Próximo (0s): ${pairContext.partnerName}`
                  : `Voltar p/ 1/2: ${pairContext.partnerName}`}
              </span>
              <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
          )}

          {/* Badges ultra-dim (R7: Séries/Reps, Cadência, Descanso, Última e PR) */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-xs font-medium">
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-400">
              {exercise['Séries/Reps']}
            </span>
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full font-mono text-zinc-300">
              Cadência {cadence || 'Livre'}
            </span>
            <span className="bg-black border border-zinc-900 px-2.5 py-1 rounded-full text-zinc-500">
              Descanso {isPairFirstStep && restSeconds === 0 ? '0s (ir p/ 2/2)' : `${restSeconds}s`}
            </span>
            {lastLog && (
              <button
                type="button"
                onClick={handleQuickFillLast}
                title="Toque para preencher carga e reps da última série"
                className="bg-black hover:border-emerald-800 border border-emerald-950 px-2.5 py-1 rounded-full text-emerald-500/85 font-mono transition-colors cursor-pointer"
              >
                Última: {lastLogLabel}
              </button>
            )}
            {prLog && (
              <button
                type="button"
                onClick={handleQuickFillPr}
                title="Toque para preencher carga e reps do seu Recorde Pessoal (PR)"
                className="inline-flex items-center gap-1 bg-black hover:border-amber-700 border border-amber-950 px-2.5 py-1 rounded-full text-amber-400/90 font-mono transition-colors cursor-pointer"
              >
                <Trophy className="w-3 h-3 flex-shrink-0" />
                <span>PR: {prLogLabel}</span>
              </button>
            )}
          </div>

          {advancedTechnique && (
            <div className="mt-2 w-full flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowTechTip((prev) => !prev)}
                aria-expanded={showTechTip}
                className="min-h-[36px] inline-flex items-center gap-1.5 bg-black hover:border-amber-700 border border-amber-950/90 px-3 py-1 rounded-full text-xs text-amber-500/85 max-w-full transition-colors cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span className="truncate">{advancedTechnique}</span>
                <HelpCircle className="w-3.5 h-3.5 text-amber-600/80 flex-shrink-0" />
              </button>

              {showTechTip && techniqueMatches.length > 0 && (
                <div className="mt-2 w-full bg-black border border-amber-950 rounded-xl p-2.5 text-left space-y-1.5 ui-fade-in">
                  {techniqueMatches.map((entry) => (
                    <div key={entry.id} className="text-xs leading-relaxed">
                      <span className="font-bold text-amber-500/90">{entry.term}: </span>
                      <span className="text-zinc-400">{entry.shortDesc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Acordeão Colapsável R7: Execução & Nota (fechado por padrão para manter o form acima da dobra) */}
          {(executionText || noteText) && (
            <div className="mt-2 w-full">
              <button
                type="button"
                onClick={() => setShowExecNotes((prev) => !prev)}
                aria-expanded={showExecNotes}
                className="w-full min-h-[36px] px-3 py-1.5 rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-xs font-semibold text-zinc-400 flex items-center justify-between gap-2 transition-colors cursor-pointer"
              >
                <span>Execução &amp; Nota</span>
                {showExecNotes ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </button>
              {showExecNotes && (
                <div className="mt-1.5 bg-black border border-zinc-900 rounded-xl p-2.5 text-left text-xs space-y-1.5 ui-fade-in">
                  {executionText && (
                    <p className="text-zinc-300 leading-relaxed">
                      <strong className="text-zinc-200">Execução: </strong>
                      {executionText}
                    </p>
                  )}
                  {noteText && (
                    <p className="text-zinc-400 italic leading-relaxed border-l-2 border-zinc-800 pl-2">
                      <strong className="not-italic text-zinc-300">Nota: </strong>
                      {noteText}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Registro Rápido True Black em <form> real (preserva #focus-weight, #focus-reps e exatamente 1 submit) */}
        <form
          onSubmit={handleSaveSetInFocus}
          className="w-full bg-black border border-zinc-900 rounded-2xl p-3 text-left space-y-2.5"
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="focus-weight"
                className="text-xs text-zinc-500 font-semibold block mb-1"
              >
                Carga (kg)
              </label>
              <input
                id="focus-weight"
                type="text"
                inputMode="decimal"
                enterKeyHint="next"
                placeholder={lastLog ? `${formatWeightDisplay(lastLog.weight)}` : 'ex: 80'}
                value={weight}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800/90 bg-black text-zinc-200 text-base placeholder-zinc-700 focus:border-sky-700 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="focus-reps"
                className="text-xs text-zinc-500 font-semibold block mb-1"
              >
                Reps
              </label>
              <input
                id="focus-reps"
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                placeholder={`ex: ${defaultRepsPlaceholder}`}
                value={reps}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={(e) => setReps(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-800/90 bg-black text-zinc-200 text-base placeholder-zinc-700 focus:border-sky-700 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!canSave}
              onPointerDown={(e) => {
                if (canSave) e.preventDefault();
              }}
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs sm:text-sm border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-black border-emerald-700 text-emerald-400'
                  : 'bg-black border-sky-800/80 hover:border-sky-600 text-sky-400/90 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {savedSuccess
                  ? 'Salva • Descansando!'
                  : isPairFirstStep
                  ? todaySetsCount > 0
                    ? `Salvar #${todaySetsCount + 1} & Ir p/ 2/2`
                    : 'Salvar & Ir p/ 2/2 (0s)'
                  : todaySetsCount > 0
                  ? `Salvar #${todaySetsCount + 1} & Descansar`
                  : 'Salvar & Descansar'}
              </span>
            </button>

            {!isCompleted && onToggleComplete && (
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleCompleteInFocus}
                aria-label="Concluir exercício e sair do modo foco"
                title="Marcar exercício como concluído"
                className="min-h-[44px] px-3 rounded-xl border border-emerald-900/80 bg-black hover:border-emerald-700 text-emerald-500/85 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer flex-shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Concluir</span>
              </button>
            )}
          </div>

          {todaySetsCount > 0 && lastLog && (
            <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-emerald-500/80">
              <span className="flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">
                  Série #{todaySetsCount} registrada ({formatWeightDisplay(lastLog.weight)}kg
                  {lastLog.reps ? ` × ${lastLog.reps}` : ''})
                </span>
              </span>
            </div>
          )}
        </form>

        {/* Cronômetro Ultra-Low-APL (mantém -15s, +15s, Iniciar/Pausar e Reiniciar sempre renderizados) */}
        <div className="w-full bg-black border border-zinc-900 rounded-2xl p-3.5 select-none">
          <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden mb-2.5">
            <div
              className={`h-full transition-all duration-300 ${
                timer.isAlarmRinging || timer.justFinished ? 'bg-emerald-600/80' : 'bg-sky-700/80'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {timer.isAlarmRinging ? (
            <button
              type="button"
              onClick={() => {
                setIsUltraEco(false);
                timer.dismissAlarm();
              }}
              className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-black hover:bg-emerald-950/40 text-emerald-400 font-extrabold text-sm flex items-center justify-center gap-2 border-2 border-emerald-600/80 animate-pulse cursor-pointer"
            >
              <BellOff className="w-5 h-5" />
              PARAR ALARME
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {timer.isRunning
                    ? 'Descansando'
                    : timer.justFinished
                    ? 'Pronto para a série!'
                    : isPairFirstStep && restSeconds === 0
                    ? 'Transição 0s → 2/2'
                    : 'Aguardando série'}
                </span>
                <div className="flex items-center gap-1 -my-2 -mr-2">
                  {timer.soundEnabled && timer.cycleVolumeLevel && (
                    <button
                      type="button"
                      onClick={timer.cycleVolumeLevel}
                      aria-label={`Alternar volume do alarme (atual: ${volumeLabel})`}
                      className="min-h-[36px] px-2 rounded-lg bg-black border border-zinc-900 hover:border-zinc-700 text-[11px] font-bold text-sky-400/90 cursor-pointer"
                      title="Trocar volume do toque (Baixo / Médio / Alto)"
                    >
                      Vol: {volumeLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={timer.toggleSound}
                    aria-label={timer.soundEnabled ? 'Silenciar alarme' : 'Ativar alarme'}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer"
                  >
                    {timer.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-sky-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-700" />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`text-3xl font-mono font-bold tracking-tight mb-3 ${
                  timer.justFinished
                    ? 'text-emerald-400/85'
                    : timer.isRunning
                    ? 'text-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                {formatTime(effectiveSeconds)}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => timer.addSeconds(-15)}
                  aria-label="Subtrair 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={() => timer.addSeconds(15)}
                  aria-label="Adicionar 15 segundos"
                  className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>15s</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!timer.isRunning && timer.secondsLeft === 0) {
                      timer.startTimer(restSeconds || 60, false, displayName);
                    } else {
                      timer.togglePlayPause();
                    }
                  }}
                  className={`flex-1 min-h-[44px] px-3 rounded-xl font-bold text-xs bg-black border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    timer.isRunning
                      ? 'border-amber-900/80 text-amber-500/90 hover:border-amber-700'
                      : 'border-sky-900/80 text-sky-400/90 hover:border-sky-700'
                  }`}
                >
                  {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timer.isRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  type="button"
                  onClick={timer.resetTimer}
                  aria-label="Reiniciar cronômetro"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-500 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão explícito de saída em outline True Black */}
      <div className="w-full max-w-sm mt-auto pt-3">
        <button
          type="button"
          onClick={() => onExit(false)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-black hover:border-zinc-700 border border-zinc-900 text-zinc-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Sair do Modo Foco</span>
        </button>
      </div>
    </div>
  );
}

export default function FocusScreensaver(props) {
  const { isOpen, exercise, timer, onExit, sexo = 'M' } = props;
  const isFemale = String(sexo || 'M').trim().toUpperCase() === 'F';
  const [isUltraEco, setIsUltraEco] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const wakeLockRef = useRef(null);
  const graceTimeoutRef = useRef(null);

  // Trava o scroll da tela principal enquanto o Modo Foco está aberto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Auto-Dim em 2 estágios (12s sem toque e sem input focado -> Ultra Eco OLED)
  useEffect(() => {
    if (!isOpen || isUltraEco || isInputFocused || timer.isAlarmRinging) return;

    let idleId = null;
    const armIdleTimer = () => {
      if (idleId) clearTimeout(idleId);
      idleId = setTimeout(() => {
        setIsUltraEco(true);
      }, ULTRA_ECO_IDLE_MS);
    };

    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, armIdleTimer, { passive: true }));
    window.addEventListener('scroll', armIdleTimer, { capture: true, passive: true });
    armIdleTimer();

    return () => {
      if (idleId) clearTimeout(idleId);
      events.forEach((ev) => window.removeEventListener(ev, armIdleTimer));
      window.removeEventListener('scroll', armIdleTimer, { capture: true });
    };
  }, [isOpen, isUltraEco, isInputFocused, timer.isAlarmRinging]);

  // WakeLock conservador (persiste sem remount ao alternar 1/2 <-> 2/2 — R7/R8)
  useEffect(() => {
    const releaseWakeLock = () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
        graceTimeoutRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    if (!isOpen) {
      releaseWakeLock();
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Fallback silencioso
      }
    };

    const isActiveNeed = timer.isRunning || timer.isAlarmRinging;

    if (isActiveNeed) {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
        graceTimeoutRef.current = null;
      }
      requestWakeLock();
    } else {
      requestWakeLock();
      if (!graceTimeoutRef.current) {
        graceTimeoutRef.current = setTimeout(() => {
          releaseWakeLock();
        }, WAKELOCK_IDLE_RELEASE_MS);
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (timer.isRunning || timer.isAlarmRinging)) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (!isOpen) releaseWakeLock();
    };
  }, [isOpen, timer.isRunning, timer.isAlarmRinging]);

  // Liberação garantida ao desmontar
  useEffect(() => {
    return () => {
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Fecha também com ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onExit]);

  if (!isOpen || !exercise) return null;

  return (
    <FocusScreensaverContent
      key={exercise['Exercício']}
      {...props}
      isFemale={isFemale}
      isUltraEco={isUltraEco}
      setIsUltraEco={setIsUltraEco}
      setIsInputFocused={setIsInputFocused}
    />
  );
}
