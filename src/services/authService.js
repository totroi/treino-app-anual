const SESSION_KEY = "irontracker_auth_session";
const FEMALE_SEXO_VALUES = new Set(["f", "fem", "feminino", "feminina", "female", "mulher"]);

export function normalizeSexo(raw) {
  if (typeof raw !== "string") return "M";
  const cleaned = raw.trim().toLowerCase();
  return FEMALE_SEXO_VALUES.has(cleaned) ? "F" : "M";
}

export function getCurrentSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session || !session.user || !session.user.username) return null;

    let tokenSexo = undefined;
    if (session.token) {
      const [payloadB64] = session.token.split('.');
      if (payloadB64) {
        const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        if (payload.exp && Date.now() > payload.exp) {
          logoutUser();
          return null;
        }
        tokenSexo = payload.sexo;
      }
    }
    session.user.sexo = normalizeSexo(session.user.sexo ?? tokenSexo);
    return session;
  } catch {
    return null;
  }
}

export async function loginUser(username, password, rememberMe = true) {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || "Não foi possível autenticar. Verifique usuário e senha."
      };
    }

    const normalizedUser = {
      ...data.user,
      sexo: normalizeSexo(data.user?.sexo)
    };

    const sessionData = {
      user: normalizedUser,
      token: data.token,
      loggedInAt: new Date().toISOString()
    };

    // Limpa qualquer sessão anterior em ambos os storages para evitar vazamento entre rememberMe=true/false
    logoutUser();

    const targetStorage = rememberMe ? localStorage : sessionStorage;
    targetStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    return { ok: true, user: normalizedUser };
  } catch {
    return {
      ok: false,
      error: "Erro de conexão com o servidor. Verifique sua internet."
    };
  }
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
