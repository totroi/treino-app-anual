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

test.describe('Tier 4 — Real-World End-to-End Scenarios (8 Journeys)', () => {
  test('T4-01 @male-baseline Male Athlete Full Baseline Session (convidado)', async ({ page }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'IronTracker' })).toBeVisible();

    await loginViaUI(page, creds);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');

    const activeChip = page.getByRole('button', { name: /^Todos \(\d+\)$/ });
    expect((await inspectElementColor(activeChip, 'backgroundColor')).isBlue).toBe(true);

    await selectMonth(page, 'Fevereiro');
    await page.getByRole('button', { name: /^Guia/i }).click();
    const principles = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(principles.locator('a[href*="docs.google.com/document"]')).toHaveCount(1);
    await principles.getByRole('button', { name: 'Fechar Princípios' }).click();

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await card.getByLabel('Carga (kg)', { exact: true }).fill('75');
    await card.getByLabel('Reps', { exact: true }).fill('8');
    await card.getByRole('button', { name: /Salvar Série/i }).click();

    await card.getByLabel('Carga (kg)', { exact: true }).fill('77,5');
    await card.getByLabel('Reps', { exact: true }).fill('7');
    await card.getByRole('button', { name: /Salvar Série/i }).click();
    await expect(card.getByText('2 séries')).toBeVisible();

    await card.getByRole('button', { name: /Iniciar \d+s/i }).click();
    await expect(page.getByRole('region', { name: 'Cronômetro de Descanso' })).toBeVisible();
    await page.getByRole('button', { name: 'Minimizar cronômetro' }).click();

    await card.getByRole('button', { name: 'Concluir exercício' }).click();
    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toBeVisible();

    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const results = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(results.getByText(/77,5\s*kg/i)).toBeVisible();
    await results.getByRole('button', { name: 'Fechar resultados' }).click();

    await logoutViaUI(page);
  });

  test('T4-02 @m1-sheet @m2-contract @m3-contract Female Athlete First Login & Complete Visual/Methodology Audit', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('favicon-pink.svg');
    expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toContain(
      'apple-touch-icon-pink.png'
    );

    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();

    await page.getByRole('button', { name: 'Princípios' }).click();
    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await expect(modal.locator('a[href*="docs.google.com/document"]')).toHaveCount(1);
    await expect(modal).toContainText(/Chun-Li|Feminino/i);
    await modal.getByRole('button', { name: 'Fechar Princípios' }).click();

    await selectMonth(page, 'Fevereiro');
    for (const tab of ['A', 'B', 'C']) {
      await selectWorkoutTab(page, tab);
      await expect(
        page.locator('article').filter({ has: page.getByRole('heading', { name: /Vacuum|Vácuo/i }) })
      ).toBeVisible();
    }
  });

  test('T4-03 @m2-contract @m3-contract Female Gym Workout Execution: Pair 1/2 -> 2/2 + Glute Focus + Auto-Timer', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Julho');

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await drawer.getByRole('button', { name: /Auto-iniciar descanso ao salvar série/i }).click();
    await drawer.getByRole('button', { name: 'Fechar menu do perfil' }).click();

    const pairSection = page.locator('section[aria-label^="Par conectado "]').first();
    await pairSection.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();

    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await expect(dialog).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);

    await dialog.locator('#focus-weight').fill('35');
    await dialog.locator('#focus-reps').fill('12');
    await dialog.getByRole('button', { name: /Salvar & Ir p\/ 2\/2/i }).click();

    await expect(dialog.getByText(/2\/2/)).toBeVisible();
    await dialog.locator('#focus-weight').fill('80');
    await dialog.locator('#focus-reps').fill('10');
    await dialog.getByRole('button', { name: /Salvar.*Descansar/i }).click();

    await expect(dialog.getByRole('button', { name: /Pausar/i })).toBeVisible();
    await dialog.getByRole('button', { name: /Concluir exercício e sair do modo foco/i }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('T4-04 @m2-contract Pre-Update Legacy Upgrade Compatibility (Existing Male User)', async ({
    page,
  }) => {
    const legacySession = buildLegacyPreM2Session({ username: 'dan', name: 'Dan Castro', role: 'admin' });
    const legacyLogs = buildLegacyMaleLogs();
    const legacyV3 = buildLegacySessionV3({ month: 'Novembro', workout: 'A' });
    const legacyCsv = buildLegacyCsvCache();

    await page.addInitScript(
      ({ s, l, v3, csv }) => {
        localStorage.setItem('irontracker_auth_session', JSON.stringify(s));
        localStorage.setItem('irontracker_logs_dan', JSON.stringify(l));
        localStorage.setItem('irontracker_session_v3_dan', JSON.stringify(v3));
        localStorage.setItem('irontracker_cached_csv_v1', JSON.stringify(csv));
        localStorage.setItem('irontracker_ui_scale', 'large');
      },
      { s: legacySession, l: legacyLogs, v3: legacyV3, csv: legacyCsv }
    );

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Abrir menu do perfil' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).not.toBe('female');
    expect(await page.evaluate(() => document.documentElement.style.fontSize)).toBe('18px');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');

    await selectMonth(page, 'Novembro');
    await expect(
      page.getByRole('button', { name: /Reabrir Supino (?:Reto \(Barra\)|com Barra)/i })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' }).getByText(/82,5\s*kg/i)
    ).toBeVisible();
  });

  test('T4-05 @m2-contract @m3-contract Shared Device Account Switching (convidado <-> convidada)', async ({
    page,
  }) => {
    const mCreds = await getMaleCredentials();
    const fCreds = getFemaleCredentials();

    await page.goto('/');
    await loginViaUI(page, mCreds);
    await selectMonth(page, 'Fevereiro');
    const mCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await mCard.getByLabel('Carga (kg)').fill('70');
    await mCard.getByRole('button', { name: /Salvar Série/i }).click();
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');

    await logoutViaUI(page);
    await loginViaUI(page, fCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('favicon-pink.svg');
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();

    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    await expect(
      page
        .getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' })
        .getByText(/Nenhum treino registrado ainda/i)
    ).toBeVisible();
    await page.getByRole('button', { name: 'Fechar resultados' }).click();

    await logoutViaUI(page);
    await loginViaUI(page, mCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('male');
    await selectMonth(page, 'Fevereiro');
    await expect(
      page
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) })
        .getByText('1 série')
    ).toBeVisible();
  });

  test('T4-06 @m2-contract @m3-contract Gym Basement Zero-Signal Offline Recovery (Female + Male Trap Seed)', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const maleCsv = buildLegacyCsvCache();

    await page.addInitScript((c) => {
      localStorage.setItem('irontracker_cached_csv_v1', JSON.stringify(c));
      localStorage.setItem('irontracker_cached_csv_v1_M', JSON.stringify(c));
    }, maleCsv);

    let offline = true;
    await page.route('**/api/workouts*', (route) => {
      if (offline) return route.abort();
      return route.continue();
    });

    await page.goto('/');
    await loginViaUI(page, fCreds);
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Glúteos \(\d+\)$/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Supino Reto (Barra)' })).toHaveCount(0);

    await page.locator('article').first().getByLabel('Carga (kg)').fill('40');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    offline = false;
    await page.getByRole('button', { name: 'Sincronizar Planilha' }).click();
    await expect(page.getByText('Offline', { exact: true })).toHaveCount(0);
    const cacheF = await page.evaluate(() => localStorage.getItem('irontracker_cached_csv_v1_F'));
    expect(JSON.parse(cacheF).csv).toContain('Glúteos');
  });

  test('T4-07 @m2-contract @m3-contract Backup Export, Granular History Cleanup & JSON Restore (Female)', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);
    await selectMonth(page, 'Fevereiro');

    await page.locator('article').first().getByLabel('Carga (kg)').fill('50');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    await selectWorkoutTab(page, 'C');
    await page.locator('article').first().getByLabel('Carga (kg)').fill('25');
    await page.locator('article').first().getByRole('button', { name: /Salvar Série/i }).click();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    const downloadPromise = page.waitForEvent('download');
    await drawer.getByRole('button', { name: /Exportar Histórico \(JSON\)/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await drawer.getByRole('button', { name: /Apagar Histórico \/ Resetar/i }).click();
    const resetModal = page.getByRole('dialog', { name: 'Reiniciar status ou apagar histórico' });
    await resetModal.getByRole('button', { name: 'Semana' }).click();
    await resetModal.getByRole('button', { name: 'Treino A' }).click();
    await resetModal.getByRole('button', { name: /^Apagar \d+/i }).click();
    await resetModal.getByRole('button', { name: /Confirmar exclusão/i }).click();

    // Restore from backup (auto-closes drawer)
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await drawer.locator('input[type="file"]').setInputFiles(downloadPath);
    await expect(page.getByText(/Backup importado com sucesso/i)).toBeVisible();

    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const results = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(results.getByText(/50\s*kg/i)).toBeVisible();
    await expect(results.getByText(/25\s*kg/i)).toBeVisible();
  });

  test('T4-08 @m3-contract Mobile Viewport (390x844) Ergonomics & Ultra Eco OLED Cycle', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const fCreds = getFemaleCredentials();

    await page.clock.install();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
    expect(await auditNoBlueLeaks(page)).toEqual([]);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toBeVisible();

    await page.clock.runFor(13_000);
    const eco = page.getByRole('dialog', {
      name: 'Modo Foco Ultra Eco OLED — toque para acordar controles',
    });
    await expect(eco).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);

    await eco.click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair do Modo Foco', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toHaveCount(0);
  });
});
