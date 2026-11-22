import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  USERS_GID,
  SOURCE_REFS_GID,
  sheetCsvUrl,
  getMaleCredentials,
  getFemaleCredentials,
  decodeJwtPayload,
  loginViaUI,
  selectMonth,
} from './helpers/auth.js';
import {
  EXPECTED_HEADERS_13,
  MONTHS_ORDER,
  parseCsvRows,
  validateWorkoutsCsv,
} from './helpers/csvAssertions.js';

const REPO_ROOT = process.cwd();
const repoModule = (rel) => pathToFileURL(path.join(REPO_ROOT, ...rel.split('/'))).href;

test.describe('Tier 1 — Auth, Sheets & Data Routing (F1–F5)', () => {
  // =========================================================================
  // F1: Aba Usuarios coluna sexo (5 cases)
  // =========================================================================
  test('T1-F1-01 @m1-sheet Live Usuarios CSV has sexo header in col G', async () => {
    const res = await fetch(sheetCsvUrl(USERS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const { headers } = parseCsvRows(await res.text());
    expect(headers.length).toBeGreaterThanOrEqual(7);
    expect(headers[6].toLowerCase()).toBe('sexo');
  });

  test('T1-F1-02 @m1-sheet dan row in Usuarios has ativo=SIM, perfil=admin, sexo=M', async () => {
    const res = await fetch(sheetCsvUrl(USERS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const { rows } = parseCsvRows(await res.text());
    const danRow = rows.find((r) => (r.usuario || '').trim().toLowerCase() === 'dan');
    expect(danRow).toBeTruthy();
    expect(danRow.ativo.trim().toUpperCase()).toBe('SIM');
    expect(danRow.perfil.trim().toLowerCase()).toBe('admin');
    expect((danRow.sexo || '').trim().toUpperCase()).toBe('M');
  });

  test('T1-F1-03 @m1-sheet convidado row in Usuarios preserved active with sexo=M', async () => {
    const res = await fetch(sheetCsvUrl(USERS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const { rows } = parseCsvRows(await res.text());
    const guestRow = rows.find((r) => (r.usuario || '').trim().toLowerCase() === 'convidado');
    expect(guestRow).toBeTruthy();
    expect(guestRow.ativo.trim().toUpperCase()).toBe('SIM');
    expect(guestRow.perfil.trim().toLowerCase()).toBe('user');
    expect((guestRow.sexo || '').trim().toUpperCase()).toBe('M');
  });

  test('T1-F1-04 @m1-sheet convidada female test account exists and is active with sexo=F', async () => {
    const res = await fetch(sheetCsvUrl(USERS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const { rows } = parseCsvRows(await res.text());
    const femaleRow = rows.find((r) => (r.usuario || '').trim().toLowerCase() === 'convidada');
    expect(femaleRow).toBeTruthy();
    expect(femaleRow.ativo.trim().toUpperCase()).toBe('SIM');
    expect(femaleRow.perfil.trim().toLowerCase()).toBe('user');
    expect((femaleRow.sexo || '').trim().toUpperCase()).toBe('F');
  });

  test('T1-F1-05 @male-baseline Baseline active guest account authenticates cleanly via POST /api/auth', async ({
    request,
  }) => {
    const creds = await getMaleCredentials();
    const res = await request.post('/api/auth', {
      data: { username: creds.username, password: creds.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.username).toBe(creds.username.toLowerCase());
    expect(body.user.role).toBe('user');
    expect(typeof body.token).toBe('string');
    const payload = decodeJwtPayload(body.token);
    expect(payload.username).toBe(creds.username.toLowerCase());
    expect(payload.exp).toBeGreaterThan(Date.now());
  });

  // =========================================================================
  // F2: Aba Table_Feminino + Source References (5 cases)
  // =========================================================================
  test('T1-F2-01 @m1-sheet Table_Feminino CSV returns valid 13-col header and 12 months', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const csv = await res.text();
    const { headers, rows } = parseCsvRows(csv);
    expect(headers).toEqual(EXPECTED_HEADERS_13);
    expect(rows.length).toBeGreaterThanOrEqual(240);
    const months = new Set(rows.map((r) => r['Mês']));
    for (const m of MONTHS_ORDER) {
      expect(months.has(m)).toBe(true);
    }
  });

  test('T1-F2-02 @m1-sheet Table_Feminino has zero embedded newlines and valid Treino values', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const csv = await res.text();
    const report = validateWorkoutsCsv(csv, { expectFemale: true });
    expect(report.errors).toEqual([]);
  });

  test('T1-F2-03 @m1-sheet Table_Feminino emphasizes Glúteos and Chun-Li lower-body dominance while Table 1 has 0 Glúteos', async ({
    request,
  }) => {
    const [resF, resM] = await Promise.all([
      request.get('/api/workouts?sexo=F'),
      request.get('/api/workouts?sexo=M'),
    ]);
    expect(resF.status()).toBe(200);
    expect(resM.status()).toBe(200);

    const reportF = validateWorkoutsCsv(await resF.text(), { expectFemale: true });
    const reportM = validateWorkoutsCsv(await resM.text(), { expectFemale: false });

    expect(reportF.glutesCount).toBeGreaterThan(0);
    expect(reportF.lowerBodyRatio).toBeGreaterThanOrEqual(0.55);
    expect(reportM.glutesCount).toBe(0);
  });

  test('T1-F2-04 @m1-sheet Table_Feminino has Ordem=99 Vacuum across all 12 months and complete PAR-N pairs', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const report = validateWorkoutsCsv(await res.text(), { expectFemale: true });
    expect(report.ok).toBe(true);
    expect(report.vacuumMonthsCount).toBe(12);
    expect(report.pairCount).toBeGreaterThan(0);
  });

  test('T1-F2-05 @m1-sheet Source References preserves male refs and adds female NotebookLM references', async () => {
    const res = await fetch(sheetCsvUrl(SOURCE_REFS_GID), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(8000),
    });
    expect(res.ok).toBe(true);
    const text = await res.text();
    expect(text).toMatch(/Guia de Hipertrofia|Encyclopedia of Modern Bodybuilding/i);
    expect(text).toMatch(/Haluch/i);
    expect(text).toMatch(/Delavier|Gironda|Zane|Mentzer|McCallum/i);
  });

  // =========================================================================
  // F3: fallbackWorkoutsFemale.js (5 cases)
  // =========================================================================
  test('T1-F3-01 @m1-contract fallbackWorkoutsFemale.js exports FEMALE_CSV_DATA with exact 13-col header', async () => {
    const mod = await import(repoModule('src/data/fallbackWorkoutsFemale.js'));
    expect(typeof mod.FEMALE_CSV_DATA).toBe('string');
    const firstLine = mod.FEMALE_CSV_DATA.trim().split(/\r?\n/)[0];
    expect(firstLine).toBe(EXPECTED_HEADERS_13.join(','));
  });

  test('T1-F3-02 @m1-contract FEMALE_CSV_DATA validates all 12 months, Glúteos, Vacuum=99, and PAR-N pairs', async () => {
    const mod = await import(repoModule('src/data/fallbackWorkoutsFemale.js'));
    const report = validateWorkoutsCsv(mod.FEMALE_CSV_DATA, { expectFemale: true });
    expect(report.errors).toEqual([]);
    expect(report.rows.length).toBeGreaterThanOrEqual(240);
    expect(report.vacuumMonthsCount).toBe(12);
    expect(report.glutesCount).toBeGreaterThan(0);
  });

  test('T1-F3-03 @m1-contract fallbackWorkoutsFemale.js has 100% tuple parity with live GET /api/workouts?sexo=F', async ({
    request,
  }) => {
    const mod = await import(repoModule('src/data/fallbackWorkoutsFemale.js'));
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);

    const localRows = parseCsvRows(mod.FEMALE_CSV_DATA).rows.map((r) => [
      r['Mês'],
      r['Treino'],
      r['Exercício'],
      r['Ordem'],
      r['Conexão'],
    ]);
    const liveRows = parseCsvRows(await res.text()).rows.map((r) => [
      r['Mês'],
      r['Treino'],
      r['Exercício'],
      r['Ordem'],
      r['Conexão'],
    ]);
    expect(localRows.length).toBe(liveRows.length);
    expect(localRows).toEqual(liveRows);
  });

  test('T1-F3-04 @m2-contract Offline female login loads fallbackWorkoutsFemale.js cleanly', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.route('**/api/workouts*', (route) => route.abort());
    await page.goto('/');
    await loginViaUI(page, creds);

    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Supino Reto \(Barra\)/i })).toHaveCount(0);
  });

  test('T1-F3-05 @male-baseline Male fallbackWorkouts.js remains untouched (254 rows, 0 Glúteos) on offline login', async ({
    page,
  }) => {
    const mod = await import(repoModule('src/data/fallbackWorkouts.js'));
    const report = validateWorkoutsCsv(mod.INITIAL_CSV_DATA, { expectFemale: false });
    expect(report.rows.length).toBe(254);
    expect(report.glutesCount).toBe(0);

    const creds = await getMaleCredentials();
    await page.route('**/api/workouts*', (route) => route.abort());
    await page.goto('/');
    await loginViaUI(page, creds);

    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await selectMonth(page, 'Fevereiro');
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toHaveCount(0);
  });

  // =========================================================================
  // F4: Normalização e propagação sexo no Auth (5 cases)
  // =========================================================================
  test('T1-F4-01 @m2-contract POST /api/auth returns user.sexo === F and JWT sexo=F for convidada', async ({
    request,
  }) => {
    const creds = getFemaleCredentials();
    const res = await request.post('/api/auth', {
      data: { username: creds.username, password: creds.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.sexo).toBe('F');
    const payload = decodeJwtPayload(body.token);
    expect(payload.sexo).toBe('F');
  });

  test('T1-F4-02 @m2-contract POST /api/auth returns user.sexo === M and JWT sexo=M for male guest', async ({
    request,
  }) => {
    const creds = await getMaleCredentials();
    const res = await request.post('/api/auth', {
      data: { username: creds.username, password: creds.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.sexo).toBe('M');
    const payload = decodeJwtPayload(body.token);
    expect(payload.sexo).toBe('M');
  });

  test('T1-F4-03 @m2-contract normalizeSexo maps all documented female variants to F', async () => {
    const authMod = await import(repoModule('api/auth.js'));
    expect(typeof authMod.normalizeSexo).toBe('function');
    const femaleInputs = ['F', 'f', 'fem', 'Feminino', 'FEMININA', 'female', 'mulher', '  Fem  '];
    for (const val of femaleInputs) {
      expect(authMod.normalizeSexo(val)).toBe('F');
    }
  });

  test('T1-F4-04 @m2-contract normalizeSexo maps male, empty, null, and undefined to M', async () => {
    const authMod = await import(repoModule('api/auth.js'));
    expect(typeof authMod.normalizeSexo).toBe('function');
    const maleInputs = ['M', 'm', 'masc', 'Masculino', 'masculina', 'male', 'homem', '', null, undefined];
    for (const val of maleInputs) {
      expect(authMod.normalizeSexo(val)).toBe('M');
    }
  });

  test('T1-F4-05 @m2-contract rememberMe=true vs rememberMe=false persists sexo=F in correct Web Storage', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: true });

    const lsSession = await page.evaluate(() => localStorage.getItem('irontracker_auth_session'));
    const ssSession = await page.evaluate(() => sessionStorage.getItem('irontracker_auth_session'));
    expect(JSON.parse(lsSession).user.sexo).toBe('F');
    expect(ssSession).toBeNull();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await page.getByRole('button', { name: 'Sair da Conta' }).click();

    await loginViaUI(page, { ...creds, rememberMe: false });
    const lsAfter = await page.evaluate(() => localStorage.getItem('irontracker_auth_session'));
    const ssAfter = await page.evaluate(() => sessionStorage.getItem('irontracker_auth_session'));
    expect(lsAfter).toBeNull();
    expect(JSON.parse(ssAfter).user.sexo).toBe('F');
  });

  // =========================================================================
  // F5: Roteamento de treinos por sexo (5 cases)
  // =========================================================================
  test('T1-F5-01 @m2-contract GET /api/workouts?sexo=F returns Table_Feminino CSV', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain('Glúteos');
    const maleCsv = await (await request.get('/api/workouts?sexo=M')).text();
    expect(csv).not.toBe(maleCsv);
  });

  test('T1-F5-02 @male-baseline GET /api/workouts and ?sexo=M return male Table 1 CSV (254 rows, 0 Glúteos)', async ({
    request,
  }) => {
    const resDefault = await request.get('/api/workouts');
    expect(resDefault.status()).toBe(200);
    expect(resDefault.headers()['content-type']).toContain('text/csv');
    const csvDefault = await resDefault.text();
    const reportDefault = validateWorkoutsCsv(csvDefault, { expectFemale: false });
    expect(reportDefault.rows.length).toBe(254);
    expect(reportDefault.glutesCount).toBe(0);
    expect(csvDefault).toContain('Supino Reto (Barra)');

    const resMale = await request.get('/api/workouts?sexo=M');
    expect(resMale.status()).toBe(200);
    expect(await resMale.text()).toBe(csvDefault);
  });

  test('T1-F5-03 @m2-contract Vite middleware forwards ?sexo=F query param via api/workouts.js contract', async ({
    request,
  }) => {
    const resF = await request.get('/api/workouts?sexo=F');
    const resM = await request.get('/api/workouts?sexo=M');
    expect(resF.status()).toBe(200);
    expect(resM.status()).toBe(200);
    const textF = await resF.text();
    const textM = await resM.text();
    expect(textF).not.toBe(textM);
    const parsedF = parseCsvRows(textF);
    expect(parsedF.rows.some((r) => r['Grupo muscular'] === 'Glúteos')).toBe(true);
    expect(readFileSync(path.join(REPO_ROOT, 'api', 'workouts.js'), 'utf8')).toMatch(/sexo/);
  });

  test('T1-F5-04 @m2-contract Authenticated female workspace requests /api/workouts?sexo=F and renders Glúteos UI', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    const workoutRequests = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/workouts')) {
        workoutRequests.push(req.url());
      }
    });

    await page.goto('/');
    await loginViaUI(page, creds);

    expect(workoutRequests.some((u) => /sexo=F/i.test(u))).toBe(true);
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
  });

  test('T1-F5-05 @male-baseline Authenticated male workspace loads male Table 1 muscle chips and 0 Glúteos', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    await expect(page.getByRole('button', { name: /^Peitoral \(\d+\)$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toBeVisible();
  });
});
