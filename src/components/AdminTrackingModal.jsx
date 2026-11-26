import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Activity,
  RefreshCw,
  Users,
  Globe2,
  BarChart3,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { fetchAdminTrackingStats } from '../services/trackingService';

function formatShortDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

export default function AdminTrackingModal({ isOpen, onClose, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchAdminTrackingStats();
    if (!res.ok) {
      setError(res.error || 'Erro ao carregar dados de tracking.');
    } else {
      setPayload(res.data);
      if (res.data?.error) setError(res.data.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen, loadData]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || currentUser?.role !== 'admin') return null;

  const summary = payload?.summary || {};
  const regions = payload?.regions || [];
  const topWorkouts = payload?.topWorkouts || [];
  const history = payload?.history || [];
  const genderM = Number(payload?.genderBreakdown?.M || 0);
  const genderF = Number(payload?.genderBreakdown?.F || 0);
  const genderTotal = Math.max(1, genderM + genderF);
  const maxRegionCount = Math.max(1, ...regions.map((r) => Number(r.count) || 0));
  const maxWorkoutCount = Math.max(1, ...topWorkouts.map((w) => Number(w.count) || 0));

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-tracking-title"
      data-testid="admin-tracking-modal"
    >
      <div
        className="w-full sm:max-w-2xl bg-black border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="admin-tracking-title" className="text-base font-extrabold text-white truncate">
                Painel Admin • Tracking
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                Telemetria agregada anônima • Google Sheets (Zero Custo)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              aria-label="Atualizar dados de tracking"
              className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar Dados</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar painel de tracking"
              className="w-11 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {payload && payload.configured === false && (
            <div
              className="p-3.5 rounded-2xl bg-zinc-950 border border-amber-900/60 space-y-2"
              data-testid="tracking-unconfigured-notice"
            >
              <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Coleta em Standby (Variáveis da Service Account Pendentes)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                As abas <code className="text-zinc-100">Tracking_Historico</code> e{' '}
                <code className="text-zinc-100">Tracking_Sessoes_Ativas</code> já estão prontas na planilha.
                Para gravar métricas em produção na Vercel, configure{' '}
                <code className="text-zinc-100">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> e{' '}
                <code className="text-zinc-100">GOOGLE_PRIVATE_KEY</code> nas Environment Variables do projeto
                e compartilhe a planilha como Editor com essa Service Account.
              </p>
            </div>
          )}

          {/* Cards de Resumo (Hoje + Período) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Hoje</span>
              </div>
              <div className="text-xl font-extrabold text-white mt-1 font-mono">
                {summary.todayAccesses ?? 0}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {summary.todayUniqueSessions ?? 0} sessões únicas
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agora (15m)</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
                {summary.simultaneousNow ?? 0}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Pico hoje: {summary.todayPeakSimultaneous ?? 0}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Média Ex./Usuário</span>
              </div>
              <div className="text-xl font-extrabold text-amber-400 mt-1 font-mono">
                {Number(summary.todayAvgExPerUser || 0).toFixed(1)}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Período: {Number(summary.periodAvgExPerUser || 0).toFixed(1)} ex/usuário
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                <span>Séries Hoje</span>
              </div>
              <div className="text-xl font-extrabold text-white mt-1 font-mono">
                {summary.todaySetsLogged ?? 0}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                30d: {summary.periodAccesses ?? 0} acessos
              </div>
            </div>
          </div>

          {/* Regiões de Acesso (via cabeçalhos IP Vercel — sem armazenar IP bruto) */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Globe2 className="w-4 h-4 text-sky-400" />
                <span>Regiões de Acesso (IP de Borda • Anônimo)</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Últimos 30 dias</span>
            </div>

            {regions.length > 0 ? (
              <div className="space-y-2">
                {regions.map((item) => {
                  const pct = Math.max(8, Math.round((item.count / maxRegionCount) * 100));
                  return (
                    <div key={item.region} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200 font-semibold truncate">{item.region}</span>
                        <span className="text-zinc-400 font-mono">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Nenhuma região registrada ainda.</p>
            )}
          </section>

          {/* Distribuição M vs F & Top Treinos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Perfil Masculino vs Feminino
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-200 font-semibold">Masculino (M)</span>
                    <span className="font-mono text-zinc-400">
                      {genderM} ({Math.round((genderM / genderTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.round((genderM / genderTotal) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-200 font-semibold">Feminino (F)</span>
                    <span className="font-mono text-zinc-400">
                      {genderF} ({Math.round((genderF / genderTotal) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.round((genderF / genderTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                Treinos / Meses Mais Acessados
              </h3>
              {topWorkouts.length > 0 ? (
                <div className="space-y-1.5">
                  {topWorkouts.slice(0, 5).map((item) => {
                    const pct = Math.max(10, Math.round((item.count / maxWorkoutCount) * 100));
                    return (
                      <div key={item.workout} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-200 font-semibold truncate">
                            {item.workout.replace('|', ' • Treino ')}
                          </span>
                          <span className="font-mono text-zinc-400">{item.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Sem histórico de treinos registrados.</p>
              )}
            </section>
          </div>

          {/* Histórico Diário (14–30 dias) */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Histórico Diário ({history.length} dias)</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Sem PII • Sem IP salvo</span>
            </div>

            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-2 pr-2 font-bold">Data</th>
                      <th className="py-2 px-2 font-bold text-right">Acessos</th>
                      <th className="py-2 px-2 font-bold text-right">Únicos</th>
                      <th className="py-2 px-2 font-bold text-right">Pico</th>
                      <th className="py-2 px-2 font-bold text-right">Média Ex.</th>
                      <th className="py-2 pl-2 font-bold text-right">Séries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 14).map((row) => (
                      <tr key={row.data} className="border-b border-zinc-900 text-zinc-200 font-mono">
                        <td className="py-2 pr-2 font-sans font-semibold text-zinc-100">
                          {formatShortDate(row.data)}
                        </td>
                        <td className="py-2 px-2 text-right">{row.acessosDia}</td>
                        <td className="py-2 px-2 text-right">{row.sessoesUnicas}</td>
                        <td className="py-2 px-2 text-right text-emerald-400">{row.picoSimultaneo}</td>
                        <td className="py-2 px-2 text-right text-amber-400">
                          {Number(row.mediaExPorUsuario || 0).toFixed(1)}
                        </td>
                        <td className="py-2 pl-2 text-right">{row.seriesRegistradas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Nenhum dia consolidado em <code className="text-zinc-300">Tracking_Historico</code> ainda.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
