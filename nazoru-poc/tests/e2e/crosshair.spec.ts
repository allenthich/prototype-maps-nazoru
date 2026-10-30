import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, markerTotal, resultsCount, waitForMap } from './helpers';

const widget = (page: Page) => page.locator('nazoru-map');
const btn = (page: Page, name: string) => widget(page).getByRole('button', { name, exact: true });
const mapRegion = (page: Page) => widget(page).locator('[role="region"][aria-roledescription]');

async function hold(page: Page, key: string, ms: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(300);
}

test.describe('crosshair mode @map', () => {
  test('keyboard only: arrow keys pan, Enter adds vertices, 完了 searches the polygon', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    const toggle = btn(page, '十字で範囲指定');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(mapRegion(page)).toBeFocused();

    await page.keyboard.press('Enter');
    await hold(page, 'ArrowRight', 700);
    await page.keyboard.press('Enter');
    await hold(page, 'ArrowDown', 700);
    await page.keyboard.press('Enter');
    await hold(page, 'ArrowLeft', 700);
    await page.keyboard.press('Enter');
    await expect(widget(page).getByText('頂点：4点')).toBeVisible();

    await btn(page, '完了').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/area=polygon&src=crosshair&p=/);
    await expect(page.getByText(/検索範囲：十字で指定した範囲（頂点4点・約/)).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toBeFocused();
    await expect(page.getByRole('status')).toContainText(/十字で指定した範囲.*の物件は[\d,]+件です。|に該当する物件はありません。/);
  });

  test('pointer only: visible buttons pan and add vertices (no dragging)', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    await btn(page, '頂点を追加').click();
    await btn(page, '右へ移動').click();
    await btn(page, '頂点を追加').click();
    await btn(page, '下へ移動').click();
    await btn(page, '頂点を追加').click();
    await btn(page, '左へ移動').click();
    await btn(page, '頂点を追加').click();
    await btn(page, '完了').click();
    await expect(page).toHaveURL(/area=polygon&src=crosshair/);
    await expect.poll(() => markerTotal(page), { timeout: 10_000 }).toBe(await resultsCount(page));
  });

  test('too few vertices shows an alert and stays in the mode; undo and Escape work', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    const toggle = btn(page, '十字で範囲指定');
    await toggle.click();
    await btn(page, '頂点を追加').click();
    await btn(page, '完了').click();
    await expect(widget(page).getByRole('alert')).toHaveText('頂点が足りません。3点以上で範囲を囲んでください。');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await btn(page, '元に戻す').click();
    await expect(widget(page).getByText('頂点：0点')).toBeVisible();

    await mapRegion(page).focus();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toBeFocused();
    await expect(page).toHaveURL(/area=stations&station=sakae$/);
  });

  test('crosshair mode passes axe', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    await btn(page, '頂点を追加').click();
    await expectNoSeriousA11yViolations(page);
  });

  test('on an indexable page, finishing navigates to the noindex search page', async ({ page }) => {
    await page.goto('/nagoya/station/ozone/');
    await waitForMap(page);
    await btn(page, '十字で範囲指定').click();
    for (const move of ['右へ移動', '下へ移動', '左へ移動']) {
      await btn(page, '頂点を追加').click();
      await btn(page, move).click();
    }
    await btn(page, '頂点を追加').click();
    await btn(page, '完了').click();
    await expect(page).toHaveURL(/\/nagoya\/search\/\?area=polygon&src=crosshair/);
  });
});
