import React, { useState, useEffect, useMemo } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  ChevronDown, 
  Save, 
  History, 
  Info, 
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  FileText,
  Sparkles // Ícone para itens opcionais
} from 'lucide-react';

/**
 * LINKS DOS DOCUMENTOS MENSAIS
 */
const MONTHLY_DOCS = {
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

/**
 * DADOS INICIAIS (Backup Offline)
 */
const INITIAL_CSV_DATA = `Mês,Grupo muscular,Especificação do grupo muscular,Treino,Exercício,Séries/Reps,Cadência,Técnica Avançada,Modo de execução,Observação
Janeiro,Pernas,Quadríceps,C,Agachamento (Squat),5 x 8-12,2-1-2,Método de Stripping,Agachar abaixo da paralela; calcanhares elevados se necessário.,A base para pernas massivas. Referência: Tom Platz.
Janeiro,Pernas,Quadríceps e Glúteos,C,Leg Press,4 x 10-15,2-1-2,Repetições Parciais,Trazer os joelhos o mais próximo possível dos ombros.,Pode ser feito em máquinas angulares ou horizontais.
Janeiro,Pernas,Panturrilhas,C,Elevação de Gêmeos em Pé,5 x 15-20,2-2-2,Princípio da Prioridade,Subir o máximo possível nas pontas dos pés.,Prioridade de Arnold para transformar fraqueza em força.
Janeiro,Pernas,Panturrilhas,C,OPCIONAL Reeves Toe Press (Leg Press),1 x 20+,Rápida com Pico,Foco no dedão,Calcanhares para dentro; executar até a falha neuromuscular.,Executar até a falha absoluta.
Janeiro,Tríceps,Cabeça Lateral,C,Tríceps Pulley,4 x 12,Excêntrica controlada,Cotovelos imóveis,Focar na contração máxima e tempo sob tensão.,Carga moderada.
Janeiro,Tríceps,Cabeça Longa,C,Tríceps Testa,4 x 10,Lenta e deliberada,Alongamento profundo,Manter a integridade biomecânica para isolar o tríceps.,Cuidado com a articulação do cotovelo.
Fevereiro,Peitoral,Massa Geral e Tríceps,A,Bench Press (Supino Reto),4-5 x 5-12,2-2,Repetições Parciais / Até a falha,"Executar movimentos de três quartos, tirando a barra do peito mas não subindo até o bloqueio total para manter tensão constante. Controle a excêntrica e exploda na concêntrica.",Inspirado na técnica de Sergio Oliva. Progredir 2-5kg por semana.
Fevereiro,Pernas,Quadríceps e Glúteos,C,Squats (Agachamento),5 x 8-12 / 1 x 25,2-2,Método McCallum (Respiração Profunda),"Barra sobre os ombros, pés na largura dos ombros. Desça até abaixo da linha paralela. No método de respiração: 3 respirações entre reps 1-10, 6 entre 11-20 e 10 entre 21-25.",Usar bloco sob calcanhares se necessário. Foco total na carga e resistência mental.
Fevereiro,Costas,Lombar e Cadeia Posterior,A/B,Deadlifts (Levantamento Terra),3-5 x 5-10,2-2,Até a falha,"Grasp a barra no chão, mantenha a coluna selada e firme. Levante o peso usando a força das costas e pernas. Ancoragem total como catalisador do treino.",Treinar pesado é mandatório.`;

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0/export?format=csv";

// --- Utilitários ---

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    let currentLine = lines[i];
    
    const matches = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    let values = [];
    if (currentLine.includes('"')) {
        let inQuote = false;
        let buffer = '';
        for(let char of currentLine) {
            if(char === '"') { inQuote = !inQuote; continue; }
            if(char === ',' && !inQuote) { values.push(buffer); buffer = ''; }
            else { buffer += char; }
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
        result.push(obj);
    }
  }
  return result;
};

// Componente de Card de Exercício
const ExerciseCard = ({ data, onSaveLog, history }) => {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Lógica de Opcional
  const rawExerciseName = data['Exercício'] || "";
  const isOptional = rawExerciseName.trim().toUpperCase().startsWith("OPCIONAL");
  
  // Nome limpo para exibição (Remove o "OPCIONAL" do título)
  const displayTitle = isOptional 
    ? rawExerciseName.replace(/^OPCIONAL\s*/i, '') 
    : rawExerciseName;

  const handleSave = () => {
    if (!weight) return;
    // Salva com o nome original (com ou sem OPCIONAL) para garantir integridade dos dados
    onSaveLog(rawExerciseName, weight, reps);
    setWeight('');
    setReps('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const lastLog = history && history.length > 0 ? history[0] : null;

  // Estilos Condicionais
  const cardStyles = isOptional
    ? "bg-purple-50/80 dark:bg-purple-900/10 border-purple-300 dark:border-purple-800 border-dashed"
    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm";

  const headerStyles = isOptional
    ? "bg-purple-100/50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800"
    : "bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700";

  return (
    <div className={`rounded-xl border overflow-hidden mb-4 transition-all hover:shadow-md ${cardStyles}`}>
      
      {/* Cabeçalho do Card */}
      <div className={`p-4 border-b flex justify-between items-start ${headerStyles}`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              {data['Grupo muscular']}
            </span>
            {isOptional && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Opcional
              </span>
            )}
          </div>
          <h3 className={`text-lg font-bold leading-tight ${isOptional ? 'text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-slate-100'}`}>
            {displayTitle}
          </h3>
          <span className="text-xs text-slate-500">{data['Especificação do grupo muscular']}</span>
        </div>
        {lastLog && (
          <div className="text-right hidden sm:block ml-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">Última</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400">{lastLog.weight}kg</div>
          </div>
        )}
      </div>

      {/* Detalhes Técnicos */}
      <div className="p-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-start gap-2">
          <TrendingUp className={`w-4 h-4 mt-0.5 ${isOptional ? 'text-purple-400' : 'text-slate-400'}`} />
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">Séries / Reps</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{data['Séries/Reps']}</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className={`w-4 h-4 mt-0.5 ${isOptional ? 'text-purple-400' : 'text-slate-400'}`} />
          <div>
            <span className="block text-slate-500 dark:text-slate-400 text-xs">Cadência</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{data['Cadência']}</span>
          </div>
        </div>
        {data['Técnica Avançada'] && (
          <div className="col-span-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
            <Zap className="w-4 h-4 text-amber-500 mt-0.5" />
            <div>
              <span className="block text-amber-600 dark:text-amber-400 text-xs font-bold">Técnica Avançada</span>
              <span className="text-amber-800 dark:text-amber-200">{data['Técnica Avançada']}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modo de Execução & Obs */}
      <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
        <p><span className="font-semibold text-slate-700 dark:text-slate-200">Execução:</span> {data['Modo de execução']}</p>
        {data['Observação'] && (
            <p className="text-xs italic text-slate-500"><span className="font-semibold">Nota:</span> {data['Observação']}</p>
        )}
      </div>

      {/* Área de Registro de Carga */}
      <div className={`p-4 border-t ${isOptional ? 'bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
        <div className="flex items-end gap-3">
            <div className="flex-1">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Carga (kg)</label>
                <input 
                    type="number" 
                    placeholder="ex: 20"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <div className="w-20">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Reps</label>
                <input 
                    type="number" 
                    placeholder={data['Séries/Reps'].split('x')[1] || "12"}
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            <button 
                onClick={handleSave}
                disabled={!weight}
                className={`p-2.5 rounded-lg flex items-center justify-center transition-all ${
                    savedSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
                {savedSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </button>
            <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-lg border transition-all ${
                    showHistory 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-slate-700 dark:border-slate-600 dark:text-blue-300' 
                    : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
            >
                <History className="w-5 h-5" />
            </button>
        </div>

        {showHistory && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Histórico Recente</h4>
                {history && history.length > 0 ? (
                    <div className="space-y-2">
                        {history.map((log, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700">
                                <span className="text-slate-500 text-xs">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                                <div className="flex gap-4">
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{log.weight}kg</span>
                                    {log.reps && <span className="text-slate-500 text-xs mt-0.5">{log.reps} reps</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum registro ainda.</p>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('Janeiro');
  const [selectedWorkout, setSelectedWorkout] = useState('A');
  
  const [workoutLogs, setWorkoutLogs] = useState(() => {
    const saved = localStorage.getItem('gym_tracker_logs');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error('Falha na rede');
        const text = await response.text();
        const parsed = parseCSV(text);
        if(parsed.length > 0) setRawData(parsed);
        else throw new Error('CSV Vazio');
      } catch (err) {
        console.log("Usando dados de backup offline devido a:", err);
        const parsed = parseCSV(INITIAL_CSV_DATA);
        setRawData(parsed);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('gym_tracker_logs', JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  const availableMonths = useMemo(() => {
    const months = new Set(rawData.map(d => d['Mês']));
    return Array.from(months);
  }, [rawData]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
        setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const filteredExercises = useMemo(() => {
    return rawData.filter(item => {
        const itemMonth = item['Mês']?.trim();
        const itemWorkout = item['Treino']?.trim();
        
        const isMonthMatch = itemMonth === selectedMonth;
        const isWorkoutMatch = itemWorkout && (itemWorkout === selectedWorkout || itemWorkout.includes(selectedWorkout));

        return isMonthMatch && isWorkoutMatch;
    });
  }, [rawData, selectedMonth, selectedWorkout]);

  const handleSaveLog = (exerciseName, weight, reps) => {
    const newLog = {
        date: new Date().toISOString(),
        weight: weight,
        reps: reps
    };
    setWorkoutLogs(prev => {
        const currentLogs = prev[exerciseName] || [];
        return { ...prev, [exerciseName]: [newLog, ...currentLogs] };
    });
  };

  const getExerciseHistory = (exerciseName) => {
    return workoutLogs[exerciseName] || [];
  };

  const syncData = async () => {
      setLoading(true);
      try {
        const response = await fetch(SHEET_CSV_URL);
        if(!response.ok) throw new Error("Erro de conexão");
        const text = await response.text();
        const parsed = parseCSV(text);
        setRawData(parsed);
        alert("Dados sincronizados!");
      } catch (e) {
        alert("Não foi possível sincronizar automaticamente. Usando dados locais.");
      } finally {
        setLoading(false);
      }
  };

  const currentDocLink = MONTHLY_DOCS[selectedMonth];

  if (loading && rawData.length === 0) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-slate-500">Carregando plano de treino...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                    <Dumbbell className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-lg leading-none">IronTracker</h1>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hipertrofia Anual</p>
                </div>
            </div>
            <button onClick={syncData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Sincronizar Planilha">
                <RefreshCw className="w-5 h-5" />
            </button>
        </div>

        {/* Month Selector & Doc Link */}
        <div className="max-w-md mx-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative mb-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                >
                    {availableMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {currentDocLink && (
              <a
                href={currentDocLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full p-2 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ler Guia de {selectedMonth}
              </a>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4">
        
        {/* Workout Tabs */}
        <div className="flex p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            {['A', 'B', 'C'].map((workout) => (
                <button
                    key={workout}
                    onClick={() => setSelectedWorkout(workout)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                        selectedWorkout === workout
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    Treino {workout}
                </button>
            ))}
        </div>

        {/* Exercise List */}
        <div className="space-y-4">
            {filteredExercises.length > 0 ? (
                filteredExercises.map((exercise, idx) => (
                    <ExerciseCard 
                        key={`${exercise['Exercício']}-${idx}`} 
                        data={exercise} 
                        onSaveLog={handleSaveLog}
                        history={getExerciseHistory(exercise['Exercício'])}
                    />
                ))
            ) : (
                <div className="text-center py-12">
                    <div className="bg-slate-200 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Info className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-slate-600 dark:text-slate-300 font-medium">Nenhum treino encontrado</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Não há registros para o Treino {selectedWorkout} em {selectedMonth}.
                    </p>
                </div>
            )}
        </div>

        <div className="mt-8 text-center pb-8">
            <p className="text-xs text-slate-400 mb-2">
                Os dados de carga são salvos automaticamente.
            </p>
        </div>
      </main>
    </div>
  );
}