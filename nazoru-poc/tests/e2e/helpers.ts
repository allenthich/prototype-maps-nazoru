import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const SITE = 'http://localhost:4321';

/** Fails on serious/critical axe violations. Google's keyless-mode dialog is excluded (dev-only). */
export async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('.dismissButton').analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export async function jsonLd(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b));
}

const KEYLESS = !process.env.E2E_GOOGLE_MAPS_API_KEY;

/**
 * Keyless dev mode always shows a "can't load Google Maps correctly" dialog, sometimes seconds
 * after the map is ready, and it takes focus. Wait for it and dismiss it before interacting.
 */
export async function dismissKeylessDialog(page: Page) {
  if (!KEYLESS) return;
  const ok = page.locator('nazoru-map').getByRole('button', { name: 'OK', exact: true });
  await ok.click({ timeout: 15_000 });
  await expect(ok).toBeHidden();
}

export async function waitForMap(page: Page) {
  await page.locator('nazoru-map').scrollIntoViewIfNeeded();
  await expect(page.locator('nazoru-map')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  await dismissKeylessDialog(page);
}

export const resultsCount = async (page: Page) =>
  Number(
    (await page.getByRole('heading', { level: 2, name: /物件一覧（[\d,]+件）/ }).textContent())!
      .match(/（([\d,]+)件）/)![1]
      .replace(/,/g, ''),
  );

/** Sum of listings represented by the rendered cluster and single-listing markers. */
export const markerTotal = (page: Page) =>
  page.locator('nazoru-map gmp-advanced-marker').evaluateAll((els) =>
    els.reduce((sum, el) => {
      const m = (el.getAttribute('title') ?? '').match(/^(\d+)件の物件/);
      return sum + (m ? Number(m[1]) : 1);
    }, 0),
  );
