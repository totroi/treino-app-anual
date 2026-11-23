import { normalizeSexo } from './auth.js';

const DEFAULT_SHEET_ID = "1_2aqsSQMa8PdCsNQcTkdBj1hepqruyeaobwVD4OXZL0";
const DEFAULT_WORKOUTS_GID = "190965404";
const DEFAULT_FEMALE_WORKOUTS_GID = "676096017";

export async function fetchWorkoutsCSV(rawSexo = "M") {
  const sheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
  const sexo = normalizeSexo(rawSexo);
  const workoutsGid =
    sexo === "F"
      ? process.env.FEMALE_WORKOUTS_SHEET_GID || DEFAULT_FEMALE_WORKOUTS_GID
      : process.env.WORKOUTS_SHEET_GID || DEFAULT_WORKOUTS_GID;
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
    let rawSexo = req.query?.sexo;
    if (rawSexo === undefined && req.url) {
      try {
        rawSexo = new URL(req.url, 'http://localhost').searchParams.get('sexo');
      } catch {
        rawSexo = 'M';
      }
    }
    const csvText = await fetchWorkoutsCSV(rawSexo);
    // Cache de 1 hora na CDN + 24 horas stale-while-revalidate (no máx. 2 hits/hora na planilha mesmo com 1.000+ usuários)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csvText);
  } catch (err) {
    console.error("Erro ao carregar treinos:", err);
    return res.status(502).json({ ok: false, error: "Não foi possível carregar a planilha de treinos." });
  }
}
