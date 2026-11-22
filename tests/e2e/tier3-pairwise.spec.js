import { test, expect } from '@playwright/test';
import {
  getMaleCredentials,
  getFemaleCredentials,
  loginViaUI,
  logoutViaUI,
  selectMonth,
  selectWorkoutTab,
  buildLegacyPreM2Session,
  buildLegacyMaleLogs,
  buildLegacySessionV3,
  buildLegacyCsvCache,
} from './helpers/auth.js';
import { auditNoBlueLeaks, inspectElementColor } from './helpers/colorAudit.js';

test.describe('Tier 3 — Pairwise Combinatorial Tests (18 Cases)', () => {
  test('T3-01 @m2-contract @m3-contract sexo=F x rememberMe=true x online x HIT month (Abril/Julho)', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: true });
    await selectMonth(page, 'Julho');

    const state = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
      session: JSON.parse(localStorage.getItem('irontracker_auth_session') || '{}'),
      cacheF: localStorage.getItem('irontracker_cached_csv_v1_F'),
    }));
    expect(state.theme).toBe('female');
    expect(state.icon).toContain('favicon-pink.svg');
    expect(state.session.user.sexo).toBe('F');
    expect(state.cacheF).toBeTruthy();

    await expect(page.locator('section[aria-label^="Par conectado "]').first()).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T3-02 @m2-contract @m3-contract sexo=F x rememberMe=false x offline-fallback x Volume month (Fevereiro)', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.route('**/api/workouts*', (route) => route.abort());
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: false });
    await selectMonth(page, 'Fevereiro');

    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('irontracker_auth_session'))).toBeNull();
    expect(
      await page.evaluate(() => sessionStorage.getItem('irontracker_auth_session'))
    ).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
  });

  test('T3-03 @male-baseline sexo=M x rememberMe=true x online x HIT month (Agosto)', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, { ...creds, rememberMe: true });
    await selectMonth(page, 'Agosto');

    await expect(page.locator('section[aria-label^="Par conectado "]').first()).toBeVisible();
    await expect(page.getByText(/Par 1/)).toBeVisible();
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');

    await page.getByRole('button', { name: /^Guia/i }).click();
    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal.locator('a[href*="docs.google.com/document"]')).toHaveCount(1);
  });

  test('T3-04 @m2-contract legacy-session (no sexo) x legacy-logs x offline-cached (v1) x male', async ({
    page,
  }) => {
    const legacy = buildLegacyPreM2Session({ username: 'dan', name: 'Dan Castro', role: 'admin' });
    const logs = buildLegacyMaleLogs();
    const v3 = buildLegacySessionV3({ month: 'Novembro', workout: 'A' });
    const csv = buildLegacyCsvCache();

    await page.addInitScript(
      ({ s, l, v, c }) => {
        localStorage.setItem('irontracker_auth_session', JSON.stringify(s));
        localStorage.setItem('irontracker_logs_dan', JSON.stringify(l));
        localStorage.setItem('irontracker_session_v3_dan', JSON.stringify(v));
        localStorage.setItem('irontracker_cached_csv_v1', JSON.stringify(c));
      },
      { s: legacy, l: logs, v: v3, c: csv }
    );
    await page.route('**/api/workouts*', (route) => route.abort());

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Abrir menu do perfil' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe('female');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toBeVisible();
  });

  test('T3-05 @m2-contract @m3-contract sexo=F x uiScale=xlarge x optional=hidden x search="glúteo"', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await drawer.getByRole('button', { name: /A\+\+/ }).click();
    await drawer.getByRole('button', { name: 'Fechar menu do perfil' }).click();

    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('19.5px');

    const optBtn = page.getByRole('button', { name: 'Ocultar Opc.' });
    if ((await optBtn.count()) > 0) {
      await optBtn.click();
    }
    await page.getByRole('button', { name: 'Buscar exercício ou técnica' }).click();
    await page.getByPlaceholder('Buscar exercício ou técnica...').fill('glúteo');

    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T3-06 @m3-contract sexo=F x pair 1/2 x FocusScreensaver x autoStartTimer=false', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    const pairSection = page.locator('section[aria-label^="Par conectado "]').first();
    await expect(pairSection).toBeVisible();
    await pairSection.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();

    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await dialog.locator('#focus-weight').fill('30');
    await dialog.locator('#focus-reps').fill('12');
    await dialog.getByRole('button', { name: /Salvar & Ir p\/ 2\/2/i }).click();

    // Immediate switch to 2/2 without starting rest timer
    await expect(dialog.getByText(/2\/2/)).toBeVisible();
    await dialog.locator('#focus-weight').fill('40');
    await dialog.locator('#focus-reps').fill('10');
    await dialog.getByRole('button', { name: /Salvar.*Descansar/i }).click();

    await expect(dialog.getByRole('button', { name: /Pausar/i })).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T3-07 @male-baseline sexo=M x pair 1/2 x main card x autoStartTimer=true', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Agosto');

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await drawer.getByRole('button', { name: /Auto-iniciar descanso ao salvar série/i }).click();
    await drawer.getByRole('button', { name: 'Fechar menu do perfil' }).click();

    const pairSection = page.locator('section[aria-label^="Par conectado "]').first();
    const firstCard = pairSection.locator('article').nth(0);
    const secondCard = pairSection.locator('article').nth(1);

    await firstCard.getByLabel('Carga (kg)', { exact: true }).fill('20');
    await firstCard.getByLabel('Reps', { exact: true }).fill('12');
    await firstCard.getByRole('button', { name: /Salvar Série/i }).click();

    await expect(page.getByRole('status')).toContainText(/Vá direto p\/ 2\/2/i);
    await expect(page.getByRole('region', { name: 'Cronômetro de Descanso' })).toHaveCount(0);

    await secondCard.getByLabel('Carga (kg)', { exact: true }).fill('60');
    await secondCard.getByLabel('Reps', { exact: true }).fill('10');
    await secondCard.getByRole('button', { name: /Salvar Série/i }).click();

    await expect(page.getByRole('region', { name: 'Cronômetro de Descanso' })).toBeVisible();
  });

  test('T3-08 @m2-contract sexo=F x PrinciplesModal x TechniqueHelp deep-link', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    const techBtn = page.locator('button[aria-label^="Entender técnica avançada:"]').first();
    await techBtn.click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Entender:/i)).toBeVisible();
    const footerBtn = modal.getByRole('button', { name: /Entendi • Voltar ao Treino/i });
    const btnColor = await inspectElementColor(footerBtn, 'backgroundColor');
    expect(btnColor.isBlue).toBe(false);
  });

  test('T3-09 @m2-contract @m3-contract sexo=F x Treino A/B/C Vacuum Ordem=99 across all tabs', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    for (const tab of ['A', 'B', 'C']) {
      await selectWorkoutTab(page, tab);
      const vacCard = page
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: /Vacuum|Vácuo/i }) });
      await expect(vacCard).toBeVisible();
      await expect(vacCard.getByText('#99')).toHaveCount(0);
    }
  });

  test('T3-10 @m2-contract @m3-contract Account switch M -> F x same browser x offline reload', async ({
    page,
  }) => {
    const mCreds = await getMaleCredentials();
    const fCreds = getFemaleCredentials();

    await page.goto('/');
    await loginViaUI(page, mCreds);
    await logoutViaUI(page);

    await loginViaUI(page, fCreds);
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();

    await page.route('**/api/workouts*', (route) => route.abort());
    await page.reload();

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
  });

  test('T3-11 @m2-contract @m3-contract Account switch F -> M x same browser x reload', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const mCreds = await getMaleCredentials();

    await page.goto('/');
    await loginViaUI(page, fCreds);
    await logoutViaUI(page);
    await loginViaUI(page, mCreds);
    await page.reload();

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('male');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
    await selectMonth(page, 'Fevereiro');
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toBeVisible();
  });

  test('T3-12 @m2-contract sexo=F x legacy v1 gym_tracker_logs migration on new female user', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.addInitScript(() => {
      localStorage.setItem(
        'gym_tracker_logs',
        JSON.stringify({
          'Agachamento Livre': [
            { date: '2026-09-10T10:00:00.000Z', weight: '60,5', reps: '10' },
          ],
        })
      );
    });

    await page.goto('/');
    await loginViaUI(page, fCreds);

    const migrated = await page.evaluate((u) => {
      return JSON.parse(localStorage.getItem(`irontracker_logs_${u}`) || '{}');
    }, fCreds.username.toLowerCase());
    expect(migrated.agachamento_livre).toBeTruthy();
    expect(migrated.agachamento_livre[0].weight).toBe('60.5');
  });

  test('T3-13 @male-baseline sexo=M x ConfirmResetModal Status tab preserves ResultsModal history', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await card.getByLabel('Carga (kg)', { exact: true }).fill('90');
    await card.getByLabel('Reps', { exact: true }).fill('6');
    await card.getByRole('button', { name: /Salvar Série/i }).click();
    await card.getByRole('button', { name: 'Concluir exercício' }).click();
    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toBeVisible();

    await page.getByRole('button', { name: 'Reiniciar', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Reiniciar status ou apagar histórico' });
    await modal.getByRole('button', { name: /Reiniciar apenas Treino A/i }).click();

    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const results = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(results.getByText(/90\s*kg/i)).toBeVisible();
  });

  test('T3-14 @m3-contract sexo=F x ConfirmResetModal History tab (Semana / Treino C) armed confirm', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    await page.locator('article').first().getByLabel('Carga (kg)').fill('30');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    await selectWorkoutTab(page, 'C');
    await page.locator('article').first().getByLabel('Carga (kg)').fill('15');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await page.getByRole('button', { name: /Apagar Histórico \/ Resetar/i }).click();
    const modal = page.getByRole('dialog', { name: 'Reiniciar status ou apagar histórico' });

    await modal.getByRole('button', { name: 'Semana' }).click();
    await modal.getByRole('button', { name: 'Treino C' }).click();
    await modal.getByRole('button', { name: /^Apagar \d+/i }).click();
    await modal.getByRole('button', { name: /Confirmar exclusão/i }).click();

    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' }).getByText(/30\s*kg/i)
    ).toBeVisible();
  });

  test('T3-15 @m2-contract @m3-contract sexo=F x ISO week rollover preserves logs and pink theme', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    const staleV3 = buildLegacySessionV3({
      activeWeekKey: '2025-W01',
      month: 'Fevereiro',
      workout: 'A',
      completedKeys: ['elevacao_pelvica'],
    });

    await page.addInitScript(
      ({ u, v3 }) => {
        localStorage.setItem(`irontracker_session_v3_${u}`, JSON.stringify(v3));
        localStorage.setItem(
          `irontracker_logs_${u}`,
          JSON.stringify({
            elevacao_pelvica: [
              { date: '2025-01-02T10:00:00.000Z', weight: '60', reps: '12' },
            ],
          })
        );
      },
      { u: creds.username.toLowerCase(), v3: staleV3 }
    );

    await page.goto('/');
    await loginViaUI(page, creds);
    await expect(page.getByRole('status')).toContainText(/Nova semana iniciada/i);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
  });

  test('T3-16 @m3-contract sexo=F x mobile viewport (375x812) x RestTimer open has 0 horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Abrir cronômetro de descanso' }).click();
    await expect(page.getByRole('region', { name: 'Cronômetro de Descanso' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T3-17 @m2-contract @m3-contract sexo=F x pt-BR comma decimals ("22,5") x PR delta in ResultsModal', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const card = page.locator('article').first();
    await card.getByLabel('Carga (kg)', { exact: true }).fill('20');
    await card.getByLabel('Reps', { exact: true }).fill('12');
    await card.getByRole('button', { name: /Salvar Série/i }).click();

    await card.getByLabel('Carga (kg)', { exact: true }).fill('22,5');
    await card.getByLabel('Reps', { exact: true }).fill('10');
    await card.getByRole('button', { name: /Salvar Série/i }).click();

    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const results = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(results.getByText(/22,5\s*kg/i)).toBeVisible();
    await expect(results.getByText(/\+2,5/)).toBeVisible();
  });

  test('T3-18 @m3-contract sexo=F x Completed pair (1/2 and 2/2 done) x statusFilter=PENDENTES', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    const pairSection = page.locator('section[aria-label^="Par conectado "]').first();
    await expect(pairSection).toBeVisible();
    await pairSection.locator('button[aria-label="Concluir exercício"]').first().click();
    await pairSection.locator('button[aria-label="Concluir exercício"]').first().click();

    await page.getByRole('button', { name: 'Buscar exercício ou técnica' }).click();
    await page.getByRole('button', { name: 'Todos Status' }).click();
    await expect(page.getByRole('button', { name: 'Só Pendentes' })).toBeVisible();

    // Completed pair should be hidden under Só Pendentes
    await expect(pairSection.locator('button[aria-label^="Reabrir "]')).toHaveCount(0);
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });
});
