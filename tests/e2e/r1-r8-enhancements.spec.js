import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import {
  getMaleCredentials,
  getFemaleCredentials,
  loginViaUI,
  selectMonth,
  selectWorkoutTab
} from './helpers/auth.js';
import { auditNoBlueLeaks } from './helpers/colorAudit.js';
import { INITIAL_CSV_DATA } from '../../src/data/fallbackWorkouts.js';
import { FEMALE_CSV_DATA } from '../../src/data/fallbackWorkoutsFemale.js';
import { parseCSV, parseRestSeconds } from '../../src/utils/exerciseNormalizer.js';
import { detectArchetype } from '../../src/utils/exerciseSilhouetteMap.js';
import { findGlossaryEntriesForTechnique } from '../../src/utils/glossaryData.js';

function createSignedAdminSession(sexo = 'M') {
  const secret = process.env.AUTH_SECRET || 'irontracker-secret-key-2026';
  const payload = Buffer.from(
    JSON.stringify({
      username: 'admin_e2e',
      name: 'Admin E2E',
      role: 'admin',
      sexo,
      exp: Date.now() + 3600_000
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return {
    user: {
      username: 'admin_e2e',
      name: 'Admin E2E',
      role: 'admin',
      sexo
    },
    token: `${payload}.${sig}`,
    loggedInAt: new Date().toISOString()
  };
}

test.describe('R1–R8 Enhancements & Methodological Coherence', () => {
  test('R1 PWA update dot in HeaderBar and Atualizar App Agora button in ProfileDrawer dispatch SKIP_WAITING', async ({
    page
  }) => {
    const creds = await getMaleCredentials();
    await page.addInitScript(() => {
      window.__skipWaitingCalled = false;
      const fakeWaiting = {
        state: 'installed',
        postMessage(msg) {
          if (msg && msg.type === 'SKIP_WAITING') {
            window.__skipWaitingCalled = true;
          }
        }
      };
      const fakeReg = {
        waiting: fakeWaiting,
        installing: null,
        active: { state: 'activated' },
        update: async () => {},
        addEventListener: () => {},
        removeEventListener: () => {}
      };
      window.__irontrackerSwRegistration = fakeReg;
    });

    await page.goto('/');
    await loginViaUI(page, creds);

    // Header dot should appear because fakeReg.waiting exists
    await expect(page.getByTestId('pwa-update-dot')).toBeVisible();

    // Open profile drawer and verify Update CTA
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await expect(drawer).toBeVisible();

    const updateBtn = drawer.getByRole('button', { name: /Atualizar App Agora/i });
    await expect(updateBtn).toBeVisible();
    await updateBtn.click();

    const skipCalled = await page.evaluate(() => window.__skipWaitingCalled);
    expect(skipCalled).toBe(true);
  });

  test('R2 Durable IndexedDB storage recovers PRs automatically after localStorage wipe', async ({
    page
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');
    await selectWorkoutTab(page, 'A');

    // Register a PR set in first exercise (Supino Reto)
    const firstCard = page.locator('article').first();
    await firstCard.getByRole('button', { name: /Cargas|Registrar/i }).click();
    await firstCard.locator('input[placeholder*="kg" i], input[aria-label*="carga" i]').first().fill('97.5');
    await firstCard.locator('input[placeholder*="rep" i], input[aria-label*="rep" i]').first().fill('8');
    await firstCard.getByRole('button', { name: /Salvar|Adicionar/i }).first().click();

    // Allow async IndexedDB mirror to settle
    await page.waitForTimeout(350);

    // Simulate OS/PWA cache eviction wiping workout logs from localStorage (keep auth session)
    await page.evaluate((username) => {
      localStorage.removeItem(`irontracker_logs_${username}`);
      localStorage.removeItem(`irontracker_logs_bak_${username}`);
    }, creds.username);

    await page.reload();
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).waitFor({ state: 'visible', timeout: 15_000 });
    await selectMonth(page, 'Fevereiro');
    await selectWorkoutTab(page, 'A');

    // Wait for boot IDB reconciliation to restore 97.5kg
    await expect(page.locator('article').first()).toContainText(/97[.,]5/, { timeout: 10_000 });
  });

  test('R3 Timer 3-level volume selector persists and has zero blue leaks in Female theme', async ({
    page
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);

    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu do Perfil e Preferências' });
    await expect(drawer).toBeVisible();

    const lowBtn = drawer.getByRole('button', { name: 'Baixo', exact: true });
    await expect(lowBtn).toBeVisible();
    await lowBtn.click();

    const savedVol = await page.evaluate(() => localStorage.getItem('irontracker_timer_volume'));
    expect(savedVol).toBe('low');

    // Audit zero blue leaks in ProfileDrawer on Female Chun-Li Pink OLED theme
    const blueLeaks = await auditNoBlueLeaks(page, {
      rootSelector: '[role="dialog"][aria-label="Menu do Perfil e Preferências"]'
    });
    expect(blueLeaks).toEqual([]);
  });

  test('R4 Methodological audit invariants hold across all 227 Male + 252 Female rows', async () => {
    const maleRows = parseCSV(INITIAL_CSV_DATA);
    const femaleRows = parseCSV(FEMALE_CSV_DATA);

    expect(maleRows.length).toBe(227);
    expect(femaleRows.length).toBe(252);

    const forbiddenCadences = new Set(['4-0-4-0', '4-0-4-2', '8-0-2-0', '5-0-2-0', '1-0-1-1']);
    for (const rows of [maleRows, femaleRows]) {
      for (const r of rows) {
        expect(forbiddenCadences.has((r['Cadência'] || '').trim())).toBe(false);
        // No Panturrilha under Pernas
        if (r['Grupo muscular'] === 'Pernas') {
          expect(/gêmeos|calf|toe press/i.test(r['Exercício'] || '')).toBe(false);
        }
        // Every non-empty technique matches at least one glossary entry
        const tech = (r['Técnica Avançada'] || '').trim();
        if (tech && !/^isometria de transverso|^alta frequência/i.test(tech)) {
          const matches = findGlossaryEntriesForTechnique(tech);
          expect(matches.length, `Glossary match missing for: ${tech}`).toBeGreaterThan(0);
        }
      }
    }

    // Specific critical bug fixes verified
    const r69 = maleRows[67]; // SheetRow 69 => index 67
    expect(r69['Mês']).toBe('Maio');
    expect(r69['Exercício']).toBe('Leg Press');

    const r105 = maleRows[103]; // SheetRow 105 => index 103
    expect(r105['Mês']).toBe('Junho');
    expect(r105['Séries/Reps']).toBe('4 x 20-30 seg.');

    const r139 = maleRows[137]; // SheetRow 139 => index 137
    expect(r139['Mês']).toBe('Setembro');
    expect(r139['Descanso']).toContain('60s');
  });

  test('R5 Admin Tracking API enforces 401/403 RBAC and AdminTrackingModal renders cleanly with zero blue leaks in Pink theme', async ({
    page,
    request
  }) => {
    // 1. Unauthenticated -> 401
    const unauthRes = await request.get('/api/tracking');
    expect(unauthRes.status()).toBe(401);

    // 2. Non-admin user -> 403
    const femaleCreds = getFemaleCredentials();
    const authRes = await request.post('/api/auth', {
      data: { username: femaleCreds.username, password: femaleCreds.password }
    });
    const authJson = await authRes.json();
    expect(authJson.ok).toBe(true);

    const userTrackingRes = await request.get('/api/tracking', {
      headers: { Authorization: `Bearer ${authJson.token}` }
    });
    expect(userTrackingRes.status()).toBe(403);

    // 3. Non-admin does NOT see Admin Tracking button in ProfileDrawer
    await page.goto('/');
    await loginViaUI(page, femaleCreds);
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();
    await expect(
      page.getByRole('button', { name: /Painel Admin/i })
    ).toHaveCount(0);

    // 4. Admin user sees Admin Tracking button, opens modal, and has 0 blue leaks in Female theme
    const adminSession = createSignedAdminSession('F');
    await page.route('**/api/tracking', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            configured: true,
            generatedAt: new Date().toISOString(),
            todayKey: '2026-11-26',
            summary: {
              todayAccesses: 18,
              todayUniqueSessions: 12,
              simultaneousNow: 3,
              todayPeakSimultaneous: 5,
              todayCompletedExercises: 64,
              todaySetsLogged: 192,
              todayAvgExPerUser: 5.3,
              periodAccesses: 410,
              periodUniqueSessions: 290,
              periodAvgExPerUser: 5.1,
              periodPeakSimultaneous: 9
            },
            regions: [
              { region: 'BR-SP/Sao Paulo', count: 140 },
              { region: 'BR-RJ/Rio de Janeiro', count: 55 }
            ],
            genderBreakdown: { M: 170, F: 120 },
            topWorkouts: [
              { workout: 'Maio|A', count: 44 },
              { workout: 'Abril|B', count: 31 }
            ],
            history: [
              {
                data: '2026-11-26',
                acessosDia: 18,
                sessoesUnicas: 12,
                picoSimultaneo: 5,
                mediaExPorUsuario: 5.3,
                seriesRegistradas: 192
              }
            ]
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, skipped: false })
        });
      }
    });

    await page.evaluate((sess) => {
      localStorage.setItem('irontracker_auth_session', JSON.stringify(sess));
    }, adminSession);
    await page.reload();
    await page.getByRole('button', { name: 'Abrir menu do perfil' }).click();

    const adminBtn = page.getByRole('button', { name: /Painel Admin/i });
    await expect(adminBtn).toBeVisible();
    await adminBtn.click();

    const modal = page.getByTestId('admin-tracking-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('BR-SP/Sao Paulo');
    await expect(modal).toContainText('5.3');

    const blueLeaks = await auditNoBlueLeaks(page, {
      rootSelector: '[data-testid="admin-tracking-modal"]'
    });
    expect(blueLeaks).toEqual([]);
  });

  test('R6 All exercises map to accurate archetypes without visual collapses', async () => {
    expect(detectArchetype('Crucifixo Reto (Halteres)', 'Peitoral')).toBe('chest_fly');
    expect(detectArchetype('Supino Reto (Barra)', 'Peitoral')).toBe('bench_flat');
    expect(detectArchetype('Supino Inclinado (Halter)', 'Peitoral')).toBe('bench_incline');
    expect(detectArchetype('Pec Deck (Voador)', 'Peitoral')).toBe('pec_deck');
    expect(detectArchetype('Crossover Clavicular (Polia)', 'Peitoral')).toBe('crossover');
    expect(detectArchetype('Gêmeos no Leg Press (Pés Alternados)', 'Panturrilhas')).toBe('calf_legpress');
    expect(detectArchetype('Leg Press', 'Pernas')).toBe('legpress');
    expect(detectArchetype('Mesa Flexora', 'Pernas')).toBe('leg_curl');
    expect(detectArchetype('Cadeira Extensora', 'Pernas')).toBe('leg_extension');
    expect(detectArchetype('Cadeira Adutora', 'Pernas')).toBe('adduction');
    expect(detectArchetype('Tríceps Testa (Skull Crushers)', 'Braços')).toBe('triceps_skullcrusher');
    expect(detectArchetype('Triceps Kickback (Coice)', 'Braços')).toBe('triceps_kickback');
    expect(detectArchetype('Tríceps Pulley Unilateral', 'Tríceps')).toBe('triceps_pushdown');
    expect(detectArchetype('Flexão e Extensão de Pescoço (Anilha Acolchoada / Manual)', 'Pescoço')).toBe('neck_bench');

    // Sweep every single row across Male + Female ensuring no unexpected bench_flat collapse
    const allRows = [...parseCSV(INITIAL_CSV_DATA), ...parseCSV(FEMALE_CSV_DATA)];
    const uniquePairs = new Map();
    for (const r of allRows) {
      uniquePairs.set(`${r['Exercício']}||${r['Grupo muscular']}`, r);
    }
    for (const r of uniquePairs.values()) {
      const arch = detectArchetype(r['Exercício'], r['Grupo muscular']);
      expect(typeof arch).toBe('string');
      expect(arch.length).toBeGreaterThan(2);
      if (arch === 'bench_flat') {
        expect(/supino|bench/i.test(r['Exercício'])).toBe(true);
      }
    }
  });

  test('R7 & R8 FocusScreensaver shows Ultra Eco Cadência, Stage 1 Execução & Nota, 0:00 on pair step 1/2, and parseRestSeconds D1/D4', async ({
    page
  }) => {
    // Unit checks for R8 parseRestSeconds D1/D4
    expect(parseRestSeconds('Rest-Pause de 10s • 75s entre séries', 'Rest-Pause', 'Costas')).toBe(75);
    expect(parseRestSeconds('75s entre séries (10s no Rest-Pause)', 'Rest-Pause', 'Peitoral')).toBe(75);
    expect(parseRestSeconds('0s no par (ir direto ao Leg Press)', 'Bi-Set', 'Pernas', 1)).toBe(0);
    expect(parseRestSeconds('0s no par • 75s após par', 'Bi-Set', 'Pernas', 1)).toBe(0);

    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');
    await selectWorkoutTab(page, 'A');

    // Open Focus Mode on Cadeira Extensora (PAR-1 1/2 -> 0s transition)
    const firstCard = page.locator('article').first();
    await firstCard.getByRole('button', { name: /Modo Foco/i }).click();

    const dialog = page.getByRole('dialog', { name: /Modo Foco OLED/i });
    await expect(dialog).toBeVisible();

    // Stage 1: verify 0:00 displayed on pair 1/2, Cadência, Descanso, and Execução & Nota accordion
    await expect(dialog).toContainText('0:00');
    await expect(dialog).toContainText(/Cad\.\s*2-0-2-1/i);
    await expect(dialog).toContainText(/Par 0s/i);

    const accordionBtn = dialog.getByTestId('focus-exec-notes-toggle');
    await expect(accordionBtn).toBeVisible();
    await accordionBtn.click();
    await expect(dialog).toContainText(/Modo de execução/i);

    // Switch to Stage 2 Ultra Eco and verify mandatory Cadência telemetry
    await dialog.getByRole('button', { name: /Escurecer|Ultra Eco/i }).click();
    const ultraCadence = dialog.getByTestId('ultra-eco-cadence');
    await expect(ultraCadence).toBeVisible();
    await expect(ultraCadence).toContainText('2-0-2-1');
  });
});
