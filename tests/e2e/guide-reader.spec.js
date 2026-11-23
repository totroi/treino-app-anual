import { test, expect } from '@playwright/test';
import {
  getMaleCredentials,
  getFemaleCredentials,
  loginViaUI,
  selectMonth
} from './helpers/auth.js';
import { auditNoBlueLeaks } from './helpers/colorAudit.js';

test.describe('In-App Dark OLED Markdown Guide Reader', () => {
  test('GR-01 Male reader opens offline, switches months, persists font size, and Escape closes reader first', async ({
    page
  }) => {
    const creds = await getMaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    await page.getByRole('button', { name: /^Guia/i }).click();
    const principlesModal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês'
    });
    await expect(principlesModal).toBeVisible();

    await principlesModal
      .getByRole('button', { name: /Ler Guia Completo de Fevereiro/i })
      .click();

    const reader = page.getByRole('dialog', {
      name: /^Leitor do Guia Mensal de /i
    });
    await expect(reader).toHaveAttribute('aria-label', 'Leitor do Guia Mensal de Fevereiro');
    await expect(reader).toBeVisible();
    await expect(reader.getByText('100% Offline')).toBeVisible();
    await expect(reader).toContainText(/O Alicerce da Grandeza/i);
    await expect(reader).toContainText(/Supino Reto/i);
    await expect(reader).toContainText(/Stomach Vacuum/i);

    // Font size control A+ persists to localStorage
    await reader.getByRole('button', { name: 'Aumentar fonte' }).click();
    const savedFont = await page.evaluate(() =>
      localStorage.getItem('irontracker_reader_font_size')
    );
    expect(savedFont).toBe('lg');

    // Switch month directly inside reader (Fevereiro -> Julho)
    await reader
      .getByLabel('Selecionar mês no leitor de guia')
      .selectOption('Julho');
    await expect(
      page.getByRole('dialog', { name: /Leitor do Guia Mensal de Julho/i })
    ).toBeVisible();
    await expect(reader).toContainText(/Força Pura e Pré-Exaustão Extrema/i);

    // Table of contents jump works
    const tocNav = reader.getByRole('navigation', {
      name: 'Sumário do guia mensal'
    });
    await expect(tocNav.getByRole('button', { name: 'Nutrição' })).toBeVisible();
    await tocNav.getByRole('button', { name: 'Nutrição' }).click();

    // Pressing Escape closes only the reader, keeping PrinciplesModal open
    await page.keyboard.press('Escape');
    await expect(reader).toHaveCount(0);
    await expect(principlesModal).toBeVisible();
  });

  test('GR-02 Female reader renders Chun-Li guide with zero blue leaks and works 100% offline across months', async ({
    page,
    context
  }) => {
    const creds = getFemaleCredentials();
    await page.goto('/');
    await loginViaUI(page, creds);
    await selectMonth(page, 'Fevereiro');

    // Open reader once to ensure the lazy female guides chunk is loaded in memory/SW
    await page.getByRole('button', { name: /^Guia/i }).click();
    const principlesModal = page.getByRole('dialog', {
      name: 'Princípios Básicos da Hipertrofia e Guia do Mês'
    });
    await principlesModal
      .getByRole('button', { name: /Ler Guia Completo de Fevereiro/i })
      .click();

    const reader = page.getByRole('dialog', {
      name: /^Leitor do Guia Mensal de /i
    });
    await expect(reader).toHaveAttribute('aria-label', 'Leitor do Guia Mensal de Fevereiro');
    await expect(reader).toBeVisible();
    await expect(reader).toContainText(/Alicerce Chun-Li/i);
    await expect(reader).toContainText(/Mesa Flexora/i);
    await expect(reader).toContainText(/flexão plantar/i);

    // Zero blue leaks audit in female theme inside the reader
    const blueLeaks = await auditNoBlueLeaks(page, '[role="dialog"][aria-label^="Leitor do Guia"]');
    expect(blueLeaks).toEqual([]);

    // Go completely offline (Airplane Mode) and switch across months without network
    await context.setOffline(true);
    await reader
      .getByLabel('Selecionar mês no leitor de guia')
      .selectOption('Julho');
    await expect(reader).toHaveAttribute('aria-label', 'Leitor do Guia Mensal de Julho');
    await expect(reader).toContainText(/Dureza Muscular e Pré-Exaustão Extrema/i);

    await reader
      .getByLabel('Selecionar mês no leitor de guia')
      .selectOption('Janeiro');
    await expect(reader).toHaveAttribute('aria-label', 'Leitor do Guia Mensal de Janeiro');
    await expect(reader).toContainText(/Apogeu Chun-Li/i);

    await context.setOffline(false);
  });
});
