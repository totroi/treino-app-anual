import React, { useState } from 'react';
import {
  Save,
  History,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Check,
  Trash2,
  Timer,
  Moon
} from 'lucide-react';
import {
  isOptionalExercise,
  getDisplayExerciseName,
  getCanonicalExerciseKey,
  getRepsPlaceholder,
  parseRestSeconds,
  cleanAdvancedTechnique
} from '../utils/exerciseNormalizer';
import { unlockTimerAudio } from '../utils/timerAudio';

export default function ExerciseCard({
  data,
  onSaveLog,
  onToggleComplete,
  onDeleteLog,
  onTriggerTimer,
  onFocusExercise,
  onOpenScreensaver,
  isFocused = false,
  history,
  isCompleted,
  uiScale = 'normal'
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

  const handleSave = () => {
    if (!weight && weight !== '0') return;
    onSaveLog(canonicalKey, displayTitle, weight, reps);
    setWeight('');
    setReps('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1800);
  };

  const handleQuickFillLast = () => {
    if (!lastLog) return;
    setWeight(String(lastLog.weight));
    if (lastLog.reps) setReps(String(lastLog.reps));
  };

  // --- MODO COMPACTO (EXERCÍCIO CONCLUÍDO) ---
  if (isCompleted) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-3 mb-2 flex items-center justify-between gap-2 shadow-sm transition-all">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
          <div className="bg-emerald-800/80 p-1.5 rounded-full flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[0.65rem] font-bold text-emerald-400 uppercase tracking-wider truncate">
                {data['Grupo muscular']}
              </span>
              {isOptional && (
                <span className="text-[0.6rem] font-bold bg-purple-900/60 text-purple-300 px-1.5 py-0.2 rounded-full uppercase">
                  Opcional
                </span>
              )}
            </div>
            <h3 className={`text-sm font-bold text-emerald-100 ${isScaledUp ? 'leading-snug' : 'truncate'}`}>
              {displayTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {lastLog && (
            <span className="text-xs font-bold text-emerald-200 bg-emerald-900/70 border border-emerald-700/60 px-2.5 py-1 rounded-lg">
              {lastLog.weight}kg{lastLog.reps ? ` • ${lastLog.reps}r` : ''}
            </span>
          )}
          <button
            onClick={() => onToggleComplete(canonicalKey)}
            className="p-1.5 rounded-lg bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 hover:text-white border border-emerald-700/50 transition-colors cursor-pointer"
            title="Reabrir exercício"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- MODO EXPANDIDO (NORMAL) ---
  const cardStyles = isOptional
    ? isFocused
      ? "bg-purple-950/20 border-sky-500/80 border-dashed ring-1 ring-sky-500/30"
      : "bg-purple-950/15 border-purple-800/70 border-dashed"
    : isFocused
    ? "bg-slate-900 border-sky-500/80 ring-1 ring-sky-500/30 shadow-md shadow-sky-950/40"
    : "bg-slate-900 border-slate-800 shadow-sm";

  const headerStyles = isOptional
    ? "bg-purple-950/30 border-purple-800/60"
    : "bg-slate-900/80 border-slate-800";

  // Em fonte Grande (A++), ou se os textos de Séries/Cadência forem muito longos no modo Médio (A+), empilha em 1 coluna
  const hasLongMetricsText =
    (data['Séries/Reps'] || '').length > 16 || (data['Cadência'] || '').length > 16;
  const stackMetrics = isExtraLarge || (isScaledUp && hasLongMetricsText);

  return (
    <div
      onClick={() => onFocusExercise && onFocusExercise(data)}
      className={`rounded-xl border overflow-hidden mb-4 transition-all hover:border-slate-700 ${cardStyles}`}
    >
      {/* Cabeçalho */}
      <div className={`p-4 border-b flex justify-between items-start gap-2 ${headerStyles}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
              {data['Grupo muscular']}
            </span>
            {isOptional && (
              <span className="flex items-center gap-1 text-[0.65rem] font-bold bg-purple-900/70 text-purple-200 border border-purple-700/50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Opcional
              </span>
            )}
          </div>
          <h3 className={`text-lg font-bold leading-snug ${isOptional ? 'text-slate-200' : 'text-white'}`}>
            {displayTitle}
          </h3>
          {data['Especificação do grupo muscular'] && (
            <span className="text-xs text-slate-400 block mt-0.5">
              {data['Especificação do grupo muscular']}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {lastLog && (
            <button
              type="button"
              onClick={handleQuickFillLast}
              className="text-right bg-slate-950/70 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Clique para preencher com a última carga"
            >
              <div className="text-[0.65rem] text-slate-400 uppercase tracking-wider">Última</div>
              <div className="font-bold text-xs text-emerald-400">
                {lastLog.weight}kg{lastLog.reps ? ` × ${lastLog.reps}` : ''}
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
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isFocused
                ? 'border-sky-700/80 bg-sky-950/50 text-sky-300 hover:bg-sky-900/60'
                : 'border-slate-700/80 bg-slate-800/50 text-slate-400 hover:bg-sky-950/40 hover:text-sky-300'
            }`}
            title="Abrir Modo Foco OLED (Screensaver)"
          >
            <Moon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(canonicalKey);
            }}
            className="p-2 rounded-lg border border-slate-700/80 bg-slate-800/50 hover:bg-emerald-900/40 hover:border-emerald-700 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Marcar exercício como concluído"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detalhes: Séries/Reps, Cadência, Descanso e Técnica Avançada (se houver) */}
      <div className={`p-4 grid ${stackMetrics ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 text-sm`}>
        <div className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <span className="block text-slate-400 text-[0.7rem]">Séries / Reps</span>
            <span className="font-semibold text-slate-100 text-xs">{data['Séries/Reps']}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <Clock className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <span className="block text-slate-400 text-[0.7rem]">Cadência</span>
            <span className="font-semibold text-slate-100 text-xs">{data['Cadência']}</span>
          </div>
        </div>

        {/* Linha de Descanso Contextualizado + Botão Rápido do Cronômetro */}
        <div
          className={`${stackMetrics ? 'col-span-1' : 'col-span-2'} flex ${
            isExtraLarge ? 'flex-col items-stretch' : 'items-center justify-between'
          } gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60`}
        >
          <div className="flex items-start gap-2 min-w-0">
            <Timer className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isOptional ? 'text-purple-400' : 'text-blue-400'}`} />
            <div className="min-w-0">
              <span className="block text-slate-400 text-[0.65rem] font-bold uppercase tracking-wider">
                Descanso Recomendado
              </span>
              <span className="text-slate-200 text-xs font-medium">{restDescription}</span>
            </div>
          </div>

          {onTriggerTimer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                unlockTimerAudio();
                if (onFocusExercise) onFocusExercise(data);
                onTriggerTimer(restSeconds);
              }}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 border border-blue-700/60 text-blue-300 hover:text-white text-xs font-bold flex-shrink-0 transition-colors cursor-pointer"
              title={`Iniciar cronômetro de ${restSeconds}s`}
            >
              <Timer className="w-3.5 h-3.5" />
              Iniciar {restSeconds}s
            </button>
          )}
        </div>

        {/* Técnica Avançada: exibida APENAS se não estiver em branco na planilha */}
        {advancedTechnique && (
          <div className={`${stackMetrics ? 'col-span-1' : 'col-span-2'} flex items-start gap-2 bg-amber-950/25 p-2.5 rounded-lg border border-amber-800/40`}>
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="block text-amber-400 text-[0.65rem] font-bold uppercase tracking-wider">
                Técnica Avançada
              </span>
              <span className="text-amber-200 text-xs font-medium">{advancedTechnique}</span>
            </div>
          </div>
        )}
      </div>

      {/* Execução e Observação */}
      <div className="px-4 pb-4 text-sm text-slate-300 space-y-2">
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-100">Execução:</span> {data['Modo de execução']}
        </p>
        {data['Observação'] && (
          <p className="text-xs italic text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
            <span className="font-semibold text-slate-300 not-italic">Nota:</span> {data['Observação']}
          </p>
        )}
      </div>

      {/* Área de Registro de Carga e Histórico (Com Relayout Adaptativo para Fontes Maiores) */}
      <div className={`p-4 border-t ${isOptional ? 'bg-purple-950/20 border-purple-800/60' : 'bg-slate-950/60 border-slate-800'}`}>
        {isScaledUp ? (
          /* RELAYOUT ADAPTATIVO (2 LINHAS) PARA FONTES MÉDIA (A+) E GRANDE (A++) */
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Carga (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder={lastLog ? `Última: ${lastLog.weight}kg` : "ex: 20"}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block font-medium">Reps</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={`ex: ${defaultRepsPlaceholder}`}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={!weight && weight !== '0'}
                title="Salvar carga e concluir exercício"
                className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{savedSuccess ? 'Salvo!' : 'Salvar e Concluir'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                title="Ver histórico de cargas"
                className={`py-2.5 px-3.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all relative cursor-pointer ${
                  showHistory
                    ? 'bg-blue-950/60 border-blue-500/70 text-blue-300'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Histórico</span>
                {history && history.length > 0 && (
                  <span className="bg-blue-600 text-white text-[0.6rem] font-bold px-1.5 py-0.2 rounded-full">
                    {history.length > 9 ? '9+' : history.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* LAYOUT COMPACTO (1 LINHA) PARA FONTE PADRÃO (A) */
          <div className="flex items-end gap-2.5">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block font-medium">Carga (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                placeholder={lastLog ? `Última: ${lastLog.weight}kg` : "ex: 20"}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="w-24">
              <label className="text-xs text-slate-400 mb-1 block font-medium">Reps</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder={`ex: ${defaultRepsPlaceholder}`}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                className="w-full p-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!weight && weight !== '0'}
              title="Salvar carga e concluir exercício"
              className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              title="Ver histórico de cargas"
              className={`p-2.5 rounded-lg border transition-all relative cursor-pointer ${
                showHistory
                  ? 'bg-blue-950/60 border-blue-500/70 text-blue-300'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <History className="w-5 h-5" />
              {history && history.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[0.6rem] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Histórico Expandido */}
        {showHistory && (
          <div className="mt-4 pt-3 border-t border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Histórico Unificado ({history?.length || 0})
              </h4>
              <span className="text-[0.65rem] text-slate-500">Sincronizado entre meses</span>
            </div>

            {history && history.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {history.map((log, idx) => {
                  const prevLog = history[idx + 1];
                  const diff = prevLog ? parseFloat(log.weight) - parseFloat(prevLog.weight) : 0;
                  return (
                    <div
                      key={log.id || idx}
                      className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded-lg border border-slate-800"
                    >
                      <span className="text-slate-400">
                        {new Date(log.date).toLocaleDateString('pt-BR')}
                      </span>

                      <div className="flex items-center gap-2.5">
                        {diff !== 0 && !Number.isNaN(diff) && (
                          <span
                            className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded ${
                              diff > 0
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            }`}
                          >
                            {diff > 0 ? `+${diff}kg` : `${diff}kg`}
                          </span>
                        )}
                        <span className="font-mono font-bold text-slate-100">{log.weight}kg</span>
                        {log.reps && <span className="text-slate-400">{log.reps} reps</span>}
                        {onDeleteLog && (
                          <button
                            type="button"
                            onClick={() => onDeleteLog(canonicalKey, log.id, idx)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                            title="Excluir este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Nenhum registro salvo para este exercício ainda.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
