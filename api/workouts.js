const DEFAULT_SHEET_ID = "1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0";
const DEFAULT_WORKOUTS_GID = "190965404";

export async function fetchWorkoutsCSV() {
  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const workoutsGid = process.env.WORKOUTS_SHEET_GID || DEFAULT_WORKOUTS_GID;
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${workoutsGid}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar planilha: HTTP ${response.status}`);
  }
  return await response.text();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const csvText = await fetchWorkoutsCSV();
    // Cache de 5 minutos na CDN da Vercel + 10 min stale-while-revalidate (suporta 100+ usuários diários com custo zero)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvText);
  } catch (err) {
    console.error("Erro ao carregar treinos:", err);
    return res.status(502).json({ ok: false, error: "Não foi possível carregar a planilha de treinos." });
  }
}
