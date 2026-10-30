import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, waitForMap } from './helpers';

const widget = (page: Page) => page.locator('nazoru-map');
const btn = (page: Page, name: string) => widget(page).getByRole('button', { name, exact: true });

test.describe('reflow and targets @map', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('search page reflows at 320 CSS px with crosshair controls open, and passes axe', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await expectNoSeriousA11yViolations(page);
  });

  test('every widget control is at least 44×44 CSS px', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    const small = await widget(page)
      .locator('section > * button:visible')
      .evaluateAll((els) => els.map((el) => [el.textContent?.trim(), el.getBoundingClientRect()] as const).filter(([, r]) => r.width < 44 || r.height < 44).map(([t]) => t));
    expect(small).toEqual([]);
  });
});

test('a skip link bypasses the map and lands on the results heading', async ({ page }) => {
  await page.goto('/nagoya/search/?area=wards&ward=naka');
  const skip = page.getByRole('link', { name: '地図をスキップして物件一覧へ' });
  await skip.focus();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#results-heading')).toBeFocused();
});

test.describe('forced colors @map', () => {
  test('crosshair and trace stroke stay visible in Windows High Contrast', async ({ page }, testInfo) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    const bar = await widget(page).locator('[data-crosshair]').evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
    expect(bar).not.toBe('rgba(0, 0, 0, 0)');
    await testInfo.attach('forced-colors-crosshair', { body: await widget(page).screenshot(), contentType: 'image/png' });

    await btn(page, 'なぞる').click();
    const ink = await widget(page).locator('[data-trace-overlay] .ink').evaluate((el) => getComputedStyle(el).stroke);
    expect(ink).not.toBe('none');
  });
});
