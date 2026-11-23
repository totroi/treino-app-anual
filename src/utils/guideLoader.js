// Loader assíncrono por sexo com cache em memória (gera 2 chunks estáticos separados no build Vite)
// Masculino (~33 KB gzip) e Feminino (~38 KB gzip): 1 requisição única/ano + 100% offline via SW Cache-First.

const guidesCache = { M: null, F: null };
const inFlight = { M: null, F: null };

function normalizeKey(sexo) {
  return String(sexo || 'M').trim().toUpperCase() === 'F' ? 'F' : 'M';
}

export async function loadGuidesBundle(sexo) {
  const key = normalizeKey(sexo);
  if (guidesCache[key]) return guidesCache[key];
  if (inFlight[key]) return inFlight[key];

  inFlight[key] = (async () => {
    try {
      const mod =
        key === 'F'
          ? await import('../data/guidesFemale.js')
          : await import('../data/guidesMale.js');
      const bundle = key === 'F' ? mod.FEMALE_GUIDES_MD : mod.MALE_GUIDES_MD;
      guidesCache[key] = bundle;
      return bundle;
    } finally {
      inFlight[key] = null;
    }
  })();

  return inFlight[key];
}

export async function loadMonthGuide(sexo, month) {
  const bundle = await loadGuidesBundle(sexo);
  return bundle?.[month] || '';
}

export function isGuidesCachedInMemory(sexo) {
  return Boolean(guidesCache[normalizeKey(sexo)]);
}

/**
 * Pré-aquece silenciosamente em tempo ocioso apenas o chunk do sexo logado (~33–38 KB gzip),
 * garantindo leitura 100% offline na academia de subsolo sem baixar os guias do sexo oposto.
 */
export function prefetchGuidesForSexo(sexo) {
  const key = normalizeKey(sexo);
  if (guidesCache[key] || inFlight[key]) return;
  if (typeof window === 'undefined') return;

  const run = () => {
    loadGuidesBundle(key).catch(() => {});
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 3500 });
  } else {
    window.setTimeout(run, 1500);
  }
}
