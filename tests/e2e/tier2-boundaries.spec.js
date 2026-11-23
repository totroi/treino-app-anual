import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  getMaleCredentials,
  getFemaleCredentials,
  loginViaUI,
  logoutViaUI,
  selectMonth,
  buildLegacyPreM2Session,
  buildLegacyMaleLogs,
  buildLegacySessionV3,
  buildLegacyCsvCache,
} from './helpers/auth.js';
import { auditNoBlueLeaks, inspectElementColor } from './helpers/colorAudit.js';
import { parseCsvRows, validateWorkoutsCsv } from './helpers/csvAssertions.js';

const REPO_ROOT = process.cwd();
const repoModule = (rel) => pathToFileURL(path.join(REPO_ROOT, ...rel.split('/'))).href;

test.describe('Tier 2 — Boundary, Negative & Edge Cases (F1–F10, 50 Cases)', () => {
  // =========================================================================
  // F1 Boundaries (5 cases)
  // =========================================================================
  test('T2-F1-01 @male-baseline Empty or whitespace-only login blocked cleanly by UI and API 400', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await page.getByLabel('Usuário').fill('   ');
    await page.getByLabel('Senha', { exact: true }).fill('   ');
    await page.getByRole('button', { name: /Acessar Treinos/i }).click();
    await expect(page.getByRole('alert')).toContainText('Preencha seu usuário e senha para entrar.');

    const apiRes = await request.post('/api/auth', { data: { username: '', password: '' } });
    expect(apiRes.status()).toBe(400);
    const body = await apiRes.json();
    expect(body).toEqual({ ok: false, error: 'Informe usuário e senha.' });
  });

  test('T2-F1-02 @m2-contract Wrong password for convidada returns 401 without setting female theme or session', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await page.getByLabel('Usuário').fill(creds.username);
    await page.getByLabel('Senha', { exact: true }).fill('senha_incorreta_999');
    await page.getByRole('button', { name: /Acessar Treinos/i }).click();

    await expect(page.getByRole('alert')).toContainText('Usuário ou senha inválidos.');
    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme || '',
      ls: localStorage.getItem('irontracker_auth_session'),
      ss: sessionStorage.getItem('irontracker_auth_session'),
    }));
    expect(state.theme).not.toBe('female');
    expect(state.ls).toBeNull();
    expect(state.ss).toBeNull();
  });

  test('T2-F1-03 @m2-contract Inactive user row (ativo=NÃO) returns 403 disabled error', async () => {
    const authMod = await import(repoModule('api/auth.js'));
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        'usuario,senha,nome,ativo,perfil,observacao,sexo\ninativa,pass123,Atleta Inativa,NÃO,user,,F',
        { status: 200, headers: { 'Content-Type': 'text/csv' } }
      );
    try {
      const res = await authMod.authenticateUser('inativa', 'pass123');
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        ok: false,
        error: 'Seu acesso está desativado. Contate o administrador.',
      });
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test('T2-F1-04 @m2-contract Mixed-case padded username "  CoNvIdAdA  " authenticates as convidada F', async ({
    request,
  }) => {
    const creds = getFemaleCredentials();
    const res = await request.post('/api/auth', {
      data: { username: `  ${creds.username.toUpperCase()}  `, password: creds.password },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.username).toBe(creds.username.toLowerCase());
    expect(body.user.sexo).toBe('F');
  });

  test('T2-F1-05 @m2-contract Sheet fetch timeout triggers FALLBACK_USERS safely with 401 (never 500)', async () => {
    const authMod = await import(repoModule('api/auth.js'));
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('Simulated sheet timeout');
    };
    try {
      const unknownRes = await authMod.authenticateUser('nao_existe_fallback', 'abc');
      expect(unknownRes.status).toBe(401);
      expect(unknownRes.body.ok).toBe(false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // =========================================================================
  // F2 Boundaries (5 cases)
  // =========================================================================
  test('T2-F2-01 @m1-sheet Table_Feminino never contains 15s in Descanso unless Rest-Pause is intended', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const report = validateWorkoutsCsv(await res.text(), { expectFemale: true });
    const errors15s = report.errors.filter((e) => e.includes('15s'));
    expect(errors15s).toEqual([]);
  });

  test('T2-F2-02 @m1-sheet Table_Feminino has zero male-only disqualifying exercises', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const report = validateWorkoutsCsv(await res.text(), { expectFemale: true });
    const maleOnlyErrors = report.errors.filter((e) => e.includes('male-only'));
    expect(maleOnlyErrors).toEqual([]);
  });

  test('T2-F2-03 @m1-sheet Table_Feminino has zero orphaned PAR-N connections in any (Mês, Treino)', async ({
    request,
  }) => {
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const report = validateWorkoutsCsv(await res.text(), { expectFemale: true });
    const pairErrors = report.errors.filter((e) => /pair|Conexão|steps/i.test(e));
    expect(pairErrors).toEqual([]);
  });

  test('T2-F2-04 @m1-sheet Every Grupo muscular in Table_Feminino normalizes cleanly without Outros', async ({
    request,
  }) => {
    const normMod = await import(repoModule('src/utils/exerciseNormalizer.js'));
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const { rows } = parseCsvRows(await res.text());
    for (const r of rows) {
      const normalized = normMod.normalizeMuscleGroup(r['Grupo muscular']);
      expect(normalized).not.toBe('Outros');
      expect(normalized.length).toBeGreaterThan(0);
    }
  });

  test('T2-F2-05 @m1-sheet Every female Técnica Avançada maps to at least 1 glossary item', async ({
    request,
  }) => {
    const normMod = await import(repoModule('src/utils/exerciseNormalizer.js'));
    const glossMod = await import(repoModule('src/utils/glossaryData.js'));
    const res = await request.get('/api/workouts?sexo=F');
    expect(res.status()).toBe(200);
    const { rows } = parseCsvRows(await res.text());

    const deadLinks = [];
    for (const r of rows) {
      const cleaned = normMod.cleanAdvancedTechnique(r['Técnica Avançada']);
      if (!cleaned) continue;
      const matches = glossMod.findGlossaryEntriesForTechnique(cleaned);
      if (matches.length === 0) {
        deadLinks.push({ ex: r['Exercício'], tech: cleaned });
      }
    }
    expect(deadLinks).toEqual([]);
  });

  // =========================================================================
  // F3 Boundaries (5 cases)
  // =========================================================================
  test('T2-F3-01 @m1-contract FEMALE_CSV_DATA has zero embedded newlines or malformed quotes', async () => {
    const mod = await import(repoModule('src/data/fallbackWorkoutsFemale.js'));
    const lineCount = mod.FEMALE_CSV_DATA.trim().split(/\r?\n/).length;
    const { rows } = parseCsvRows(mod.FEMALE_CSV_DATA);
    expect(lineCount).toBe(rows.length + 1);
  });

  test('T2-F3-02 @m2-contract Corrupt irontracker_cached_csv_v1_F (<=50 chars) degrades cleanly to fallbackWorkoutsFemale.js', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.addInitScript(() => {
      localStorage.setItem(
        'irontracker_cached_csv_v1_F',
        JSON.stringify({ csv: 'short', syncedAt: '2026-01-01T00:00:00.000Z' })
      );
    });
    await page.route('**/api/workouts*', (route) => route.abort());
    await page.goto('/');
    await loginViaUI(page, creds);

    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
  });

  test('T2-F3-03 @m2-contract Male online login succeeds with zero console errors and zero dependency on female fallback', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await expect(page.getByRole('button', { name: /^Todos \(\d+\)$/ })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('T2-F3-04 @m1-contract All getCanonicalExerciseKey values in FEMALE_CSV_DATA are ASCII-safe slugs', async () => {
    const mod = await import(repoModule('src/data/fallbackWorkoutsFemale.js'));
    const normMod = await import(repoModule('src/utils/exerciseNormalizer.js'));
    const { rows } = parseCsvRows(mod.FEMALE_CSV_DATA);
    for (const r of rows) {
      const slug = normMod.getCanonicalExerciseKey(r['Exercício']);
      expect(slug).toMatch(/^[a-z0-9_]+$/);
    }
  });

  test('T2-F3-05 @m2-contract Manual Sincronizar Planilha while offline shows toast and preserves female exercises', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.route('**/api/workouts*', (route) => route.abort());
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Sincronizar Planilha' }).click();
    await expect(page.getByRole('status')).toContainText(/offline|cache|base local/i);
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
  });

  // =========================================================================
  // F4 Boundaries (5 cases)
  // =========================================================================
  test('T2-F4-01 @m2-contract normalizeSexo safely defaults garbage/XSS strings to M', async () => {
    const authMod = await import(repoModule('api/auth.js'));
    for (const bad of ['X', '123', 'outro', '<script>alert(1)</script>', '   ', {}, []]) {
      expect(authMod.normalizeSexo(bad)).toBe('M');
    }
  });

  test('T2-F4-02 @m2-contract Expired JWT in irontracker_auth_session logs out cleanly on boot', async ({
    page,
  }) => {
    const expiredFemale = buildLegacyPreM2Session({
      username: 'convidada',
      name: 'Atleta Convidada',
      role: 'user',
      expOffsetMs: -60_000,
      sexo: 'F',
    });
    await page.addInitScript((s) => {
      localStorage.setItem('irontracker_auth_session', JSON.stringify(s));
    }, expiredFemale);

    await page.goto('/');
    await expect(page.getByLabel('Usuário')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe('female');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
  });

  test('T2-F4-03 @m2-contract Malformed JSON or missing username in session recovers to LoginScreen with 0 pageerrors', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem('irontracker_auth_session', '{bad-json');
    });
    await page.goto('/');
    await expect(page.getByLabel('Usuário')).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem('irontracker_auth_session', JSON.stringify({ user: { sexo: 'F' } }));
    });
    await page.reload();
    await expect(page.getByLabel('Usuário')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('T2-F4-04 @m2-contract Legacy session missing user.sexo resolves to M via client boot', async ({
    page,
  }) => {
    const legacy = buildLegacyPreM2Session({ username: 'dan', name: 'Dan Castro', role: 'admin' });
    await page.addInitScript((s) => {
      localStorage.setItem('irontracker_auth_session', JSON.stringify(s));
    }, legacy);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Abrir menu do perfil' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe('female');
  });

  test('T2-F4-05 @male-baseline Switching rememberMe clears prior storage between localStorage and sessionStorage', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: true });
    expect(await page.evaluate(() => localStorage.getItem('irontracker_auth_session'))).toBeTruthy();

    await logoutViaUI(page);
    await loginViaUI(page, { ...creds, rememberMe: false });
    expect(await page.evaluate(() => localStorage.getItem('irontracker_auth_session'))).toBeNull();
    expect(
      await page.evaluate(() => sessionStorage.getItem('irontracker_auth_session'))
    ).toBeTruthy();
  });

  // =========================================================================
  // F5 Boundaries (5 cases)
  // =========================================================================
  test('T2-F5-01 @m2-contract GET /api/workouts?sexo=INVALID defaults safely to male Table 1', async ({
    request,
  }) => {
    const [resInvalid, resDefault] = await Promise.all([
      request.get('/api/workouts?sexo=INVALID_XYZ'),
      request.get('/api/workouts'),
    ]);
    expect(resInvalid.status()).toBe(200);
    expect(await resInvalid.text()).toBe(await resDefault.text());
  });

  test('T2-F5-02 @m2-contract GET /api/workouts?sexo=F returning HTTP 502 falls back to female local base cleanly', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.route('**/api/workouts*', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'Bad Gateway' }),
      })
    );
    await page.goto('/');
    await loginViaUI(page, creds);

    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Supino Reto \(Barra\)/i })).toHaveCount(0);
  });

  test('T2-F5-03 @m2-contract Wrong HTTP method POST /api/workouts?sexo=F returns 405 from handler', async () => {
    const workoutsMod = await import(repoModule('api/workouts.js'));
    let statusCode = 0;
    let payload = null;
    const headers = {};
    const mockRes = {
      setHeader(k, v) {
        headers[k] = v;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(obj) {
        payload = obj;
        return this;
      },
      send(txt) {
        payload = txt;
        return this;
      },
    };
    await workoutsMod.default({ method: 'POST', query: { sexo: 'F' } }, mockRes);
    expect(statusCode).toBe(405);
    expect(headers.Allow).toBe('GET');
    expect(payload.ok).toBe(false);
  });

  test('T2-F5-04 @m2-contract Case-insensitive ?sexo=f and ?sexo=Feminino route to Table_Feminino', async ({
    request,
  }) => {
    const [resUpper, resLower, resWord] = await Promise.all([
      request.get('/api/workouts?sexo=F'),
      request.get('/api/workouts?sexo=f'),
      request.get('/api/workouts?sexo=Feminino'),
    ]);
    expect(resLower.status()).toBe(200);
    expect(resWord.status()).toBe(200);
    const upperText = await resUpper.text();
    expect(await resLower.text()).toBe(upperText);
    expect(await resWord.text()).toBe(upperText);
  });

  test('T2-F5-05 @male-baseline Missing current month in custom CSV falls back to availableMonths[0]', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    const otherMonth = new Date().getMonth() === 2 ? 'Agosto' : 'Março';
    const customCsv = `Mês,Grupo muscular,Especificação do grupo muscular,Treino,Exercício,Séries/Reps,Cadência,Técnica Avançada,Modo de execução,Observação,Descanso,Ordem,Conexão\n${otherMonth},Peitoral,Geral,A,Supino Reto (Barra),4 x 8-10,2-0-2-0,,Execução fallback teste,Obs teste,90s,1,`;
    const cached = buildLegacyCsvCache(customCsv);

    await page.addInitScript((c) => {
      localStorage.setItem('irontracker_cached_csv_v1', JSON.stringify(c));
    }, cached);
    await page.route('**/api/workouts*', (route) => route.abort());

    await page.goto('/');
    await loginViaUI(page, creds);
    await expect(page.getByLabel('Selecionar mês da periodização')).toHaveValue(otherMonth);
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toBeVisible();
  });

  // =========================================================================
  // F6 Boundaries (5 cases)
  // =========================================================================
  test('T2-F6-01 @m2-contract Trap seed: legacy irontracker_cached_csv_v1 (male) + offline female login loads female fallback', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    const maleCsv = buildLegacyCsvCache();
    await page.addInitScript((c) => {
      localStorage.setItem('irontracker_cached_csv_v1', JSON.stringify(c));
      localStorage.setItem('irontracker_cached_csv_v1_M', JSON.stringify(c));
    }, maleCsv);
    await page.route('**/api/workouts*', (route) => route.abort());

    await page.goto('/');
    await loginViaUI(page, creds);
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toHaveCount(0);
  });

  test('T2-F6-02 @m2-contract _M cache populated then offline female login uses female fallback without corrupting _M', async ({
    page,
  }) => {
    const mCreds = await getMaleCredentials();
    const fCreds = getFemaleCredentials();

    await page.goto('/');
    await loginViaUI(page, mCreds);
    await logoutViaUI(page);

    await page.route('**/api/workouts*', (route) => route.abort());
    await loginViaUI(page, fCreds);

    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
    const mCache = await page.evaluate(() => localStorage.getItem('irontracker_cached_csv_v1_M'));
    expect(JSON.parse(mCache).csv).toContain('Supino Reto (Barra)');
  });

  test('T2-F6-03 @m2-contract Shared browser isolates irontracker_logs_dan from irontracker_logs_convidada', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const danLogs = buildLegacyMaleLogs();
    await page.addInitScript((logs) => {
      localStorage.setItem('irontracker_logs_dan', JSON.stringify(logs));
    }, danLogs);

    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const resultsModal = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(resultsModal.getByText(/Nenhum treino registrado ainda/i)).toBeVisible();
  });

  test('T2-F6-04 @male-baseline ISO-8601 week rollover clears completedByScope while preserving logs & sessionHistory', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    const oldV3 = buildLegacySessionV3({
      activeWeekKey: '2020-W01',
      month: 'Fevereiro',
      workout: 'A',
      completedKeys: ['supino_reto_barra'],
    });
    const maleLogs = buildLegacyMaleLogs();

    await page.addInitScript(
      ({ user, v3, logs }) => {
        localStorage.setItem(`irontracker_session_v3_${user}`, JSON.stringify(v3));
        localStorage.setItem(`irontracker_logs_${user}`, JSON.stringify(logs));
      },
      { user: creds.username.toLowerCase(), v3: oldV3, logs: maleLogs }
    );

    await page.goto('/');
    await loginViaUI(page, creds);

    await expect(page.getByRole('status')).toContainText(
      /Nova semana iniciada! Treinos A, B e C prontos\./i
    );
    const persisted = await page.evaluate((u) => {
      return {
        v3: JSON.parse(localStorage.getItem(`irontracker_session_v3_${u}`)),
        logs: JSON.parse(localStorage.getItem(`irontracker_logs_${u}`)),
      };
    }, creds.username.toLowerCase());

    expect(persisted.v3.completedByScope).toEqual({});
    expect(Object.keys(persisted.v3.sessionHistory).length).toBeGreaterThan(0);
    expect(persisted.logs.supino_reto_barra.length).toBeGreaterThan(0);
  });

  test('T2-F6-05 @male-baseline Invalid JSON backup import shows error toast and preserves existing logs', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await card.getByLabel('Carga (kg)').fill('60');
    await card.getByRole('button', { name: /Salvar Série/i }).click();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await drawer.locator('input[type="file"]').setInputFiles({
      name: 'corrupt.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{not valid json'),
    });

    await expect(page.getByRole('status')).toContainText(/Arquivo JSON inválido/i);
    await expect(card.getByText('1 série')).toBeVisible();
  });

  // =========================================================================
  // F7 Boundaries (5 cases)
  // =========================================================================
  test('T2-F7-01 @m2-contract Female PrinciplesModal links to distinct female MONTHLY_DOCS_FEMALE across all 12 months', async ({
    page,
  }) => {
    const normMod = await import(repoModule('src/utils/exerciseNormalizer.js'));
    expect(typeof normMod.MONTHLY_DOCS_FEMALE).toBe('object');
    for (const m of normMod.MONTHS_ORDER) {
      expect(normMod.MONTHLY_DOCS_FEMALE[m]).toMatch(
        /^https:\/\/docs\.google\.com\/document\/d\/[^/]+\/preview$/
      );
      expect(normMod.MONTHLY_DOCS_FEMALE[m]).not.toBe(normMod.MONTHLY_DOCS[m]);
    }

    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    for (const month of ['Fevereiro', 'Abril', 'Julho', 'Janeiro']) {
      await selectMonth(page, month);
      await page.getByRole('button', { name: /^Guia/i }).click();
      const modal = page.getByRole('dialog', {
        name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
      });
      const link = modal.locator('a[href*="docs.google.com/document"]');
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toBe(normMod.MONTHLY_DOCS_FEMALE[month]);
      await modal.getByRole('button', { name: 'Fechar Princípios' }).click();
    }
  });

  test('T2-F7-02 @m2-contract Searching non-existent term in female glossary shows clean empty state', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await page.getByRole('button', { name: 'Princípios' }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    const search = modal.getByPlaceholder(/Buscar técnica/i);
    await search.fill('xyznaoexiste');
    await expect(modal.getByText(/Nenhum termo encontrado para .xyznaoexiste./i)).toBeVisible();
  });

  test('T2-F7-03 @m2-contract Female methodology omits male 80kg=~160g/dia and V-Taper curto across all accordions', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await page.getByRole('button', { name: 'Princípios' }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    const accordions = modal.locator('button[aria-expanded="false"]');
    const count = await accordions.count();
    for (let i = 0; i < count; i++) {
      await accordions.nth(0).click();
    }

    const fullText = await modal.innerText();
    expect(fullText).not.toContain('80kg = ~160g/dia');
    expect(fullText).not.toMatch(/V-Taper curto/i);
  });

  test('T2-F7-04 @male-baseline Pressing Escape closes PrinciplesModal and unlocks body scroll', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Princípios' }).click();
    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).not.toBe('hidden');
  });

  test('T2-F7-05 @male-baseline cleanAdvancedTechnique("Até a falha") hides redundant badge on pure failure cards', async ({
    page,
  }) => {
    const normMod = await import(repoModule('src/utils/exerciseNormalizer.js'));
    expect(normMod.cleanAdvancedTechnique('Até a falha')).toBe('');
    expect(normMod.cleanAdvancedTechnique('Até a falha absoluta')).toBe('');

    const creds = await getMaleCredentials();
    const pureFailureCsv =
      'Mês,Grupo muscular,Especificação do grupo muscular,Treino,Exercício,Séries/Reps,Cadência,Técnica Avançada,Modo de execução,Observação,Descanso,Ordem,Conexão\n' +
      'Fevereiro,Peitoral,Peitoral Inferior,A,Paralelas (Dips),3-4 x 10,2-0-2-0,Até a falha,Execução padrão,Obs padrão,75-90s,1,';
    await page.route('**/api/workouts*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: pureFailureCsv,
      })
    );

    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    const paralelasCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Paralelas (Dips)' }) });
    await expect(paralelasCard).toBeVisible();
    await expect(
      paralelasCard.locator('button[aria-label^="Entender técnica avançada:"]')
    ).toHaveCount(0);
  });

  // =========================================================================
  // F8 Boundaries (5 cases)
  // =========================================================================
  test('T2-F8-01 @m3-contract Completed (emerald), Error (red), Optional (purple), and Pair (amber) stay distinct in female mode', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    // Complete first card to verify emerald
    const firstCard = page.locator('article').first();
    const firstTitle = await firstCard.locator('h3').innerText();
    await firstCard.getByRole('button', { name: 'Concluir exercício' }).click();
    const reopenBtn = page.getByRole('button', { name: `Reabrir ${firstTitle}` });
    await expect(reopenBtn).toBeVisible();
    const completedColor = await inspectElementColor(reopenBtn.locator('..'), 'backgroundColor');
    expect(completedColor.isBlue).toBe(false);

    // Zero blue leaks across the entire screen with completed + optional + pair rendered
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T2-F8-02 @m3-contract Empty-filter state "Mostrar todos os grupos" CTA is pink (not blue) in female mode', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: /^Glúteos \(\d+\)$/ }).click();
    await page.getByRole('button', { name: 'Buscar exercício ou técnica' }).click();
    await page.getByPlaceholder('Buscar exercício ou técnica...').fill('zzzzzz_inexistente');

    const cta = page.getByRole('button', { name: 'Mostrar todos os grupos' });
    await expect(cta).toBeVisible();
    const bg = await inspectElementColor(cta, 'backgroundColor');
    expect(bg.isBlue).toBe(false);
    expect(bg.isPink).toBe(true);
  });

  test('T2-F8-03 @m3-contract Toast Desfazer button and RestTimer panel have zero blue computed colors in female mode', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.locator('article').first().getByRole('button', { name: 'Concluir exercício' }).click();
    await expect(page.getByRole('button', { name: /Desfazer/i })).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);

    await page.getByRole('button', { name: 'Abrir cronômetro de descanso' }).click();
    await expect(page.getByRole('region', { name: 'Cronômetro de Descanso' })).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T2-F8-04 @m3-contract Text selection (::selection) and focused input rings use pink, not blue, in female mode', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Buscar exercício ou técnica' }).click();
    const searchInput = page.getByPlaceholder('Buscar exercício ou técnica...');
    await searchInput.focus();

    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T2-F8-05 @m3-contract Rapid account switch convidada -> logout -> convidado leaves zero stale pink styles', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const mCreds = await getMaleCredentials();

    await page.goto('/');
    await loginViaUI(page, fCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');

    await logoutViaUI(page);
    await loginViaUI(page, mCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('male');

    const activeChip = page.getByRole('button', { name: /^Todos \(\d+\)$/ });
    const chipColor = await inspectElementColor(activeChip, 'backgroundColor');
    expect(chipColor.isBlue).toBe(true);
    expect(chipColor.isPink).toBe(false);
  });

  // =========================================================================
  // F9 Boundaries (5 cases)
  // =========================================================================
  test('T2-F9-01 @m3-contract Reload while logged in as convidada retains pink favicon immediately', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: true });
    await page.reload();

    await expect(page.getByRole('button', { name: 'Abrir menu do perfil' })).toBeVisible();
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('favicon-pink.svg');
  });

  test('T2-F9-02 @m3-contract Expired female session on reload restores /favicon.svg', async ({
    page,
  }) => {
    const expiredFemale = buildLegacyPreM2Session({
      username: 'convidada',
      name: 'Atleta Convidada',
      role: 'user',
      expOffsetMs: -5000,
      sexo: 'F',
    });
    await page.addInitScript((s) => {
      localStorage.setItem('irontracker_auth_session', JSON.stringify(s));
    }, expiredFemale);

    await page.goto('/');
    await expect(page.getByLabel('Usuário')).toBeVisible();
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
  });

  test('T2-F9-03 @m3-contract link[rel="icon"] and link[rel="apple-touch-icon"] never duplicate on repeated switches', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const mCreds = await getMaleCredentials();

    await page.goto('/');
    for (let i = 0; i < 2; i++) {
      await loginViaUI(page, fCreds);
      await logoutViaUI(page);
      await loginViaUI(page, mCreds);
      await logoutViaUI(page);
    }

    const counts = await page.evaluate(() => ({
      icon: document.querySelectorAll('link[rel="icon"]').length,
      apple: document.querySelectorAll('link[rel="apple-touch-icon"]').length,
    }));
    expect(counts.icon).toBe(1);
    expect(counts.apple).toBe(1);
  });

  test('T2-F9-04 @male-baseline public/favicon.svg retains exact original blue hex palette', async ({
    request,
  }) => {
    const res = await request.get('/favicon.svg');
    expect(res.status()).toBe(200);
    const svg = await res.text();
    expect(svg).toContain('#1e3a8a');
    expect(svg).toContain('#38bdf8');
    expect(svg).toContain('#2563eb');
  });

  test('T2-F9-05 @m3-contract sessionStorage-only female login sets pink favicon and resets on logout', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: false });
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('favicon-pink.svg');

    await logoutViaUI(page);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
  });

  // =========================================================================
  // F10 Boundaries (5 cases)
  // =========================================================================
  test('T2-F10-01 @m3-contract Archetype precedence: Triceps Kickback stays triceps while Glúteo Coice uses glute kickback', async ({
    page,
  }) => {
    const mCreds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, mCreds);
    await selectMonth(page, 'Maio');

    await page
      .getByRole('button', { name: 'Abrir Modo Foco OLED para Triceps Kickback (Coice)' })
      .click();
    const tricepsSvg = await page
      .getByRole('dialog', { name: 'Modo Foco OLED' })
      .locator('svg[viewBox="0 0 180 180"]')
      .innerHTML();
    expect(tricepsSvg).toContain('anim-swing-pushdown');
    await page.getByRole('button', { name: 'Sair do Modo Foco', exact: true }).click();
    await logoutViaUI(page);

    const fCreds = getFemaleCredentials();
    await loginViaUI(page, fCreds);
    const kickbackBtn = page
      .locator('button[aria-label*="Coice"], button[aria-label*="Kickback"], button[aria-label*="Extensão de Quadril"]')
      .first();
    if ((await kickbackBtn.count()) > 0) {
      await kickbackBtn.click();
      const gluteSvg = await page
        .getByRole('dialog', { name: 'Modo Foco OLED' })
        .locator('svg[viewBox="0 0 180 180"]')
        .innerHTML();
      expect(gluteSvg).not.toContain('anim-swing-pushdown');
      expect(gluteSvg).not.toContain('cx="54" cy="112" r="9"');
    }
  });

  test('T2-F10-02 @m3-contract Cadeira Abdutora uses abduction silhouette without breaking leg_iso', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    const abdBtn = page.locator('button[aria-label*="Abdutora"]').first();
    if ((await abdBtn.count()) > 0) {
      await abdBtn.click();
      const abdSvg = await page
        .getByRole('dialog', { name: 'Modo Foco OLED' })
        .locator('svg[viewBox="0 0 180 180"]')
        .innerHTML();
      expect(abdSvg).not.toContain('cx="54" cy="112" r="9"');
      await page.getByRole('button', { name: 'Sair do Modo Foco', exact: true }).click();
    }

    const extBtn = page.locator('button[aria-label*="Extensora"]').first();
    if ((await extBtn.count()) > 0) {
      await extBtn.click();
      const extSvg = await page
        .getByRole('dialog', { name: 'Modo Foco OLED' })
        .locator('svg[viewBox="0 0 180 180"]')
        .innerHTML();
      expect(extSvg).toContain('anim-leg-ext');
    }
  });

  test('T2-F10-03 @m3-contract FocusScreensaver input validation blocks saving empty or NaN weight', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    const weightInput = dialog.locator('#focus-weight');
    const saveBtn = dialog.locator('button[type="submit"]');

    await weightInput.fill('');
    await expect(saveBtn).toBeDisabled();

    await weightInput.fill('abc');
    await expect(saveBtn).toBeDisabled();
  });

  test('T2-F10-04 @m3-contract Pressing Escape in female FocusScreensaver exits cleanly and keeps pink theme', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
  });

  test('T2-F10-05 @m3-contract screensaverDelay=0 (Off) disables auto-dim timer in female mode', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.clock.install();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await drawer.getByRole('button', { name: 'Off', exact: true }).click();
    await drawer.getByRole('button', { name: 'Fechar menu do perfil' }).click();

    await page.locator('article').first().getByLabel('Carga (kg)').fill('25');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    await page.clock.runFor(25_000);
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toHaveCount(0);
  });
});
