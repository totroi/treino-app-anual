import React, { useState } from 'react';
import { Dumbbell, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { loginUser } from '../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Preencha seu usuário e senha para entrar.');
      return;
    }

    setLoading(true);
    const result = await loginUser(username.trim(), password, rememberMe);
    setLoading(false);

    if (result.ok) {
      onLoginSuccess(result.user);
    } else {
      setError(result.error);
    }
  };

  const handleDemoFill = () => {
    setUsername('convidado');
    setPassword('treino2026');
    setError('');
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-start sm:justify-center items-center px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] overflow-y-auto">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 ui-fade-in">
        {/* Cabeçalho / Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3.5 rounded-2xl shadow-lg shadow-blue-600/25 mb-3">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">IronTracker</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mt-1">
            Periodização & Hipertrofia Anual
          </p>
          <p className="text-xs text-zinc-400 mt-1.5">
            248 exercícios • Timer OLED • Histórico local
          </p>
        </div>

        {/* Mensagem de erro acessível */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800/80 flex items-start gap-2.5 text-red-200 text-sm ui-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulário com inputs >= 16px (text-base) e alvos >= 44px */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Usuário
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                enterKeyHint="next"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-12 py-2.5 rounded-xl bg-black border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded-xl cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-0.5">
            <label
              htmlFor="login-remember"
              className="min-h-[44px] flex items-center gap-3 cursor-pointer select-none text-sm text-zinc-300 hover:text-white"
            >
              <input
                id="login-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-700 bg-black text-blue-600 focus:ring-blue-500"
              />
              <span>Manter conectado neste aparelho</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white font-bold text-base shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Validando acesso...
              </>
            ) : (
              <>
                Acessar Treinos
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Descoberta Demo para iniciantes e avaliadores (Item 1.4) */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDemoFill}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Explorar em Modo Demonstração (convidado)
          </button>
        </div>

        {/* Rodapé informativo */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Acesso restrito a atletas autorizados na planilha</span>
        </div>
      </div>
    </div>
  );
}
