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

async function normalizeSvgSignature(svgLocator) {
  return svgLocator.evaluate((svg) => {
    const clone = svg.cloneNode(true);
    clone.removeAttribute('style');
    const walk = (node) => {
      if (node.nodeType !== 1) return;
      node.removeAttribute('stroke');
      node.removeAttribute('fill');
      node.removeAttribute('style');
      for (const child of node.children) walk(child);
    };
    walk(clone);
    return clone.innerHTML.replace(/\s+/g, ' ').trim();
  });
}

test.describe('Tier 1 — Storage, Methodology, Pink Theme, Favicon & SVG (F6–F10)', () => {
  // =========================================================================
  // F6: Isolamento de cache CSV & preservação localStorage (5 cases)
  // =========================================================================
  test('T1-F6-01 @m2-contract Female login writes irontracker_cached_csv_v1_F without touching _M', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const cacheState = await page.evaluate(() => ({
      f: localStorage.getItem('irontracker_cached_csv_v1_F'),
      m: localStorage.getItem('irontracker_cached_csv_v1_M'),
    }));
    expect(cacheState.f).toBeTruthy();
    expect(JSON.parse(cacheState.f).csv).toContain('Glúteos');
    expect(cacheState.m).toBeNull();
  });

  test('T1-F6-02 @m2-contract Male login writes irontracker_cached_csv_v1_M without touching _F', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const cacheState = await page.evaluate(() => ({
      f: localStorage.getItem('irontracker_cached_csv_v1_F'),
      m: localStorage.getItem('irontracker_cached_csv_v1_M'),
    }));
    expect(cacheState.m).toBeTruthy();
    expect(JSON.parse(cacheState.m).csv).toContain('Supino Reto (Barra)');
    expect(cacheState.f).toBeNull();
  });

  test('T1-F6-03 @male-baseline Saving a set persists in irontracker_logs_<user> and survives reload', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await card.getByLabel('Carga (kg)', { exact: true }).fill('45,5');
    await card.getByLabel('Reps', { exact: true }).fill('12');
    await card.getByRole('button', { name: /Salvar Série/i }).click();

    await expect(card.getByText('1 série')).toBeVisible();
    await page.reload();

    await selectMonth(page, 'Fevereiro');
    const reloadedCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await expect(reloadedCard.getByText('1 série')).toBeVisible();
    await expect(reloadedCard.getByText(/45,5kg×12/)).toBeVisible();
  });

  test('T1-F6-04 @m2-contract Legacy pre-M2 session without sexo + logs + v3 session load intact as M', async ({
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
      },
      { s: legacySession, l: legacyLogs, v3: legacyV3, csv: legacyCsv }
    );

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Abrir menu do perfil' })).toBeVisible();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).not.toBe('female');

    await selectMonth(page, 'Novembro');
    await expect(
      page.getByRole('button', { name: /Reabrir Supino (?:Reto \(Barra\)|com Barra)/i })
    ).toBeVisible();
    await expect(page.getByText(/82,5kg\s*×\s*8/)).toBeVisible();
  });

  test('T1-F6-05 @male-baseline Backup JSON export/import round-trip preserves logs and session v3', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    const card = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Supino Reto (Barra)' }) });
    await card.getByLabel('Carga (kg)', { exact: true }).fill('77,5');
    await card.getByLabel('Reps', { exact: true }).fill('8');
    await card.getByRole('button', { name: /Salvar Série/i }).click();
    await card.getByRole('button', { name: 'Concluir exercício' }).click();
    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toBeVisible();

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    const downloadPromise = page.waitForEvent('download');
    await drawer.getByRole('button', { name: /Exportar Histórico \(JSON\)/i }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();

    // ProfileDrawer closes automatically after export; reopen to reset progress
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await drawer.getByRole('button', { name: /Apagar Histórico \/ Resetar/i }).click();
    const resetModal = page.getByRole('dialog', { name: 'Reiniciar status ou apagar histórico' });
    await resetModal.getByRole('button', { name: 'Tudo' }).click();
    await resetModal.getByRole('button', { name: /Resetar Tudo/i }).click();
    await resetModal.getByRole('button', { name: 'Confirmar Reset Total' }).click();

    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toHaveCount(0);

    // Import exported JSON (auto-closes drawer on file change)
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const fileInput = drawer.locator('input[type="file"]');
    await fileInput.setInputFiles(downloadPath);
    await expect(page.getByText(/Backup importado com sucesso/i)).toBeVisible();

    await expect(page.getByRole('button', { name: 'Reabrir Supino Reto (Barra)' })).toBeVisible();
    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    const resultsModal = page.getByRole('dialog', { name: 'Meus Resultados e Recordes Pessoais' });
    await expect(resultsModal.getByText(/77,5\s*kg/i)).toBeVisible();
  });

  // =========================================================================
  // F7: Metodologia e Glossário Femininos (5 cases)
  // =========================================================================
  test('T1-F7-01 @m2-contract PrinciplesModal shows female Chun-Li methodology and physiological copy', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await page.getByRole('button', { name: 'Princípios' }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal).toBeVisible();
    const text = await modal.innerText();
    expect(text).toMatch(/Feminino|Chun-Li/i);
    expect(text).toMatch(/estradiol|estrog[êe]nio|ciclo menstrual|cintura fina/i);
    expect(text).toMatch(/60\s*kg/i);
  });

  test('T1-F7-02 @m2-contract Female Guia Mês renders MONTHLY_SUMMARIES_FEMALE and links to female Google Docs guide', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');
    await page.getByRole('button', { name: /^Guia/i }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal).toBeVisible();
    const docLink = modal.locator('a[href*="docs.google.com/document"]');
    await expect(docLink).toHaveCount(1);
    const href = await docLink.getAttribute('href');
    expect(href).toContain('16UKitOdLpxmAyMyt8u-dfbyJpjWybkKuYVwwLGFarzw/preview');
    expect(href).not.toContain('1KNjq9QURk1pzOzyA3TQ5dRaEY--NCSVuSrUHFeS0QDE');
    await expect(modal.locator('#guia-mes')).toContainText(/Fevereiro/i);
  });

  test('T1-F7-03 @male-baseline Male PrinciplesModal and MONTHLY_DOCS remain 100% intact', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');
    await page.getByRole('button', { name: 'Princípios' }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal.getByRole('heading', { name: /Método Golden Era • Liga Leve/i })).toBeVisible();
    await expect(modal.locator('a[href*="docs.google.com/document"]')).toHaveCount(1);
    const text = await modal.innerText();
    expect(text).toContain('80kg = ~160g/dia');

    await modal.getByRole('button', { name: 'Costas', exact: true }).click();
    await expect(modal.getByText(/V-Taper curto/i)).toBeVisible();
  });

  test('T1-F7-04 @m2-contract Female Pumpers includes Glúteos and Costas emphasizes postural alignment', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await page.getByRole('button', { name: 'Princípios' }).click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    const gluteBtn = modal.getByRole('button', { name: /^Glúteos$/i });
    await expect(gluteBtn).toBeVisible();
    await gluteBtn.click();
    await expect(modal.getByText(/Pumpers • Glúteos/i)).toBeVisible();

    await modal.getByRole('button', { name: /^Costas$/i }).click();
    const modalText = await modal.innerText();
    expect(modalText).not.toMatch(/V-Taper curto/i);
  });

  test('T1-F7-05 @m2-contract Female glossary includes female terms and deep-links from exercise cards', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    const techBtn = page.locator('button[aria-label^="Entender técnica avançada:"]').first();
    await expect(techBtn).toBeVisible();
    await techBtn.click();

    const modal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês',
    });
    await expect(modal).toBeVisible();
    const text = await modal.innerText();
    expect(text).toMatch(/Ângulo Q|Glúteo Médio|Pré-Exaustão/i);
  });

  // =========================================================================
  // F8: Identidade Visual Rosa Total (5 cases)
  // =========================================================================
  test('T1-F8-01 @m3-contract html[data-theme="female"] set on female login and "male" on male/logout', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const mCreds = await getMaleCredentials();

    await page.goto('/');
    await loginViaUI(page, fCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('female');

    await logoutViaUI(page);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('male');

    await loginViaUI(page, mCreds);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('male');
  });

  test('T1-F8-02 @m3-contract Computed-style zero-blue audit across female main workspace and cards', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Abril');

    const violationsA = await auditNoBlueLeaks(page);
    expect(violationsA).toEqual([]);

    await selectWorkoutTab(page, 'B');
    const violationsB = await auditNoBlueLeaks(page);
    expect(violationsB).toEqual([]);

    await selectWorkoutTab(page, 'C');
    const violationsC = await auditNoBlueLeaks(page);
    expect(violationsC).toEqual([]);
  });

  test('T1-F8-03 @m3-contract Computed-style zero-blue audit across all modals and drawers in female mode', async ({
    page,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    // ProfileDrawer
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await page.getByRole('button', { name: 'Fechar menu do perfil' }).click();

    // ResultsModal
    await page.getByRole('button', { name: 'Meus Resultados e PRs' }).click();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await page.getByRole('button', { name: 'Fechar resultados' }).click();

    // PrinciplesModal
    await page.getByRole('button', { name: 'Princípios' }).click();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
    await page.getByRole('button', { name: 'Fechar Princípios' }).click();

    // ConfirmResetModal
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await page.getByRole('button', { name: /Reiniciar Status \(Treino \/ Semana\)/i }).click();
    expect(await auditNoBlueLeaks(page)).toEqual([]);
  });

  test('T1-F8-04 @male-baseline Male UI retains authentic blue palette on active controls', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const activeChip = page.getByRole('button', { name: /^Todos \(\d+\)$/ });
    const chipColor = await inspectElementColor(activeChip, 'backgroundColor');
    expect(chipColor.isBlue).toBe(true);

    const activeTab = page.getByRole('tab', { name: /Treino A/i });
    const tabBg = await inspectElementColor(activeTab, 'backgroundColor');
    expect(tabBg.isBlue).toBe(true);
  });

  test('T1-F8-05 @m3-contract Pre-auth LoginScreen shows neutral subtitle without hardcoded 254 count', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'IronTracker' })).toBeVisible();
    await expect(page.getByText(/Periodização Anual • Timer OLED • Histórico local/i)).toBeVisible();
    await expect(page.getByText(/254 exercícios/i)).toHaveCount(0);
  });

  // =========================================================================
  // F9: Favicon & Ícones PWA Dinâmicos (5 cases)
  // =========================================================================
  test('T1-F9-01 @m3-contract link[rel="icon"] switches to /favicon-pink.svg on female login', async ({
    page,
    request,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const href = await page.locator('link[rel="icon"]').getAttribute('href');
    expect(href).toContain('favicon-pink.svg');
    const res = await request.get('/favicon-pink.svg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/svg+xml');
  });

  test('T1-F9-02 @m3-contract link[rel="apple-touch-icon"] switches to /apple-touch-icon-pink.png on female login', async ({
    page,
    request,
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(href).toContain('apple-touch-icon-pink.png');
    const res = await request.get('/apple-touch-icon-pink.png');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('T1-F9-03 @m3-contract favicon-pink.svg contains pink palette and zero blue hex codes', async ({
    request,
  }) => {
    const res = await request.get('/favicon-pink.svg');
    expect(res.status()).toBe(200);
    const svgText = await res.text();
    expect(svgText).toMatch(/#831843|#f472b6|#db2777/i);
    expect(svgText).not.toMatch(/#1e3a8a|#38bdf8|#2563eb/i);
  });

  test('T1-F9-04 @m3-contract Pink PNG PWA icon assets exist and load with image/png', async ({
    request,
  }) => {
    for (const asset of [
      '/apple-touch-icon-pink.png',
      '/icon-192-pink.png',
      '/icon-512-pink.png',
    ]) {
      const res = await request.get(asset);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
      const buf = await res.body();
      expect(buf.length).toBeGreaterThan(100);
    }
  });

  test('T1-F9-05 @m3-contract Restores /favicon.svg and /apple-touch-icon.png on logout and male login', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    const mCreds = await getMaleCredentials();

    await page.goto('/');
    await loginViaUI(page, fCreds);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toContain('favicon-pink.svg');

    await logoutViaUI(page);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
    expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')).toBe(
      '/apple-touch-icon.png'
    );

    await loginViaUI(page, mCreds);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.svg');
  });

  // =========================================================================
  // F10: Silhuetas SVG Glúteos & Screensaver Rosa (5 cases)
  // =========================================================================
  test('T1-F10-01 @m3-contract Glute SVG silhouettes differ from bench fallback and render distinct shapes', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    const focusBtns = page.locator('button[aria-label^="Abrir Modo Foco OLED para "]');
    const gluteBtn = page
      .locator('article')
      .filter({ hasText: 'Glúteos' })
      .first()
      .locator('button[aria-label^="Abrir Modo Foco OLED para "]');

    const targetBtn = (await gluteBtn.count()) > 0 ? gluteBtn : focusBtns.first();
    await targetBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await expect(dialog).toBeVisible();
    const svg = dialog.locator('svg[viewBox="0 0 180 180"]');
    await expect(svg).toBeVisible();

    const geom = await normalizeSvgSignature(svg);
    // Bench fallback signature check (circle cx="54" cy="112" r="9" + bench line x1="32" y1="126")
    expect(geom).not.toContain('cx="54" cy="112" r="9"');
    expect(geom.length).toBeGreaterThan(30);
  });

  test('T1-F10-02 @m3-contract FocusScreensaver Stage 1 silhouette and controls use pink accent in female mode', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await expect(dialog).toBeVisible();

    const violations = await auditNoBlueLeaks(page);
    expect(violations).toEqual([]);

    const svgStroke = await dialog
      .locator('svg[viewBox="0 0 180 180"] [stroke]')
      .first()
      .getAttribute('stroke');
    expect(svgStroke).not.toMatch(/#0284c7|#0369a1|#38bdf8/i);
  });

  test('T1-F10-03 @m3-contract FocusScreensaver Ultra Eco Stage 2 (12s idle) uses dimmed pink accent and wakes on tap', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.clock.install();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toBeVisible();

    await page.clock.runFor(13_000);
    const ecoDialog = page.getByRole('dialog', {
      name: 'Modo Foco Ultra Eco OLED — toque para acordar controles',
    });
    await expect(ecoDialog).toBeVisible();
    expect(await auditNoBlueLeaks(page)).toEqual([]);

    await ecoDialog.click();
    await expect(page.getByRole('dialog', { name: 'Modo Foco OLED' })).toBeVisible();
  });

  test('T1-F10-04 @m3-contract Alarm ringing overrides pink accent with #10b981 emerald in female mode', async ({
    page,
  }) => {
    const fCreds = getFemaleCredentials();
    await page.clock.install();
    await page.goto('/');
    await loginViaUI(page, fCreds);

    await page.locator('button[aria-label^="Abrir Modo Foco OLED para "]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await expect(dialog).toBeVisible();

    // Reduce timer to minimum (5s) and start so alarm rings immediately without exceeding 15-cycle auto-stop
    const subBtn = dialog.getByRole('button', { name: 'Subtrair 15 segundos' });
    for (let i = 0; i < 12; i++) {
      await subBtn.click();
    }
    await dialog.getByRole('button', { name: /Iniciar|Play/i }).first().click();
    await page.clock.runFor(6_500);

    await expect(dialog.getByRole('button', { name: 'PARAR ALARME' })).toBeVisible();
    const strokes = await dialog
      .locator('svg[viewBox="0 0 180 180"] [stroke]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('stroke')));
    expect(strokes.some((s) => (s || '').toLowerCase() === '#10b981')).toBe(true);

    await dialog.getByRole('button', { name: 'PARAR ALARME' }).click();
    const strokesAfter = await dialog
      .locator('svg[viewBox="0 0 180 180"] [stroke]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('stroke')));
    expect(strokesAfter.some((s) => (s || '').toLowerCase() === '#10b981')).toBe(false);
  });

  test('T1-F10-05 @male-baseline Existing male silhouettes and blue accent remain unchanged in male mode', async ({
    page,
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    await page
      .getByRole('button', { name: 'Abrir Modo Foco OLED para Supino Reto (Barra)' })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Modo Foco OLED' });
    await expect(dialog).toBeVisible();

    const strokes = await dialog
      .locator('svg[viewBox="0 0 180 180"] [stroke]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('stroke')));
    expect(strokes.some((s) => (s || '').toLowerCase() === '#0284c7')).toBe(true);

    const geom = await normalizeSvgSignature(dialog.locator('svg[viewBox="0 0 180 180"]'));
    expect(geom).toContain('cx="54" cy="112" r="9"');
  });
});
