import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, markerTotal, resultsCount, waitForMap } from './helpers';

test.describe('map widget @map', () => {
  test('Maps JS is not requested until the widget scrolls into view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 320 });
    const mapsRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('maps.googleapis.com')) mapsRequests.push(r.url());
    });
    await page.goto('/nagoya/ward/naka/');
    await page.waitForTimeout(1500);
    expect(mapsRequests).toEqual([]);
    await page.locator('nazoru-map').scrollIntoViewIfNeeded();
    await expect.poll(() => mapsRequests.length, { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test('cluster counts on the map add up to the list count', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await expect.poll(() => markerTotal(page), { timeout: 10_000 }).toBe(await resultsCount(page));
  });

  test('clusters are named buttons; Enter zooms in, keeps focus predictable and announces', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await waitForMap(page);
    const cluster = page.locator('nazoru-map').getByRole('button', { name: /^\d+件の物件。選択すると拡大します$/ }).first();
    await expect(cluster).toBeVisible();
    const zoomBefore = Number(await page.locator('nazoru-map').getAttribute('data-zoom'));
    await cluster.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => Number(await page.locator('nazoru-map').getAttribute('data-zoom'))).toBeGreaterThan(zoomBefore);
    await expect(page.getByRole('status')).toContainText('拡大しました');
    await expect(page.locator('nazoru-map [role="region"][aria-roledescription]')).toBeFocused();
  });

  test('「このエリアで検索」 searches the visible bounds in place', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await page.getByRole('button', { name: 'このエリアで検索' }).click();
    await expect(page).toHaveURL(/area=bounds&bbox=/);
    await expect(page.getByText('検索範囲：地図の表示範囲')).toBeVisible();
    await expect.poll(() => markerTotal(page), { timeout: 10_000 }).toBe(await resultsCount(page));
  });

  test('on an indexable ward page, 「このエリアで検索」 navigates to the search page', async ({ page }) => {
    await page.goto('/nagoya/ward/kita/');
    await waitForMap(page);
    await page.getByRole('button', { name: 'このエリアで検索' }).click();
    await expect(page).toHaveURL(/\/nagoya\/search\/\?area=bounds&bbox=/);
  });

  test('the map does not offer drag-only Street View (pegman)', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await expect(page.getByRole('button', { name: /ペグマン/ })).toHaveCount(0);
  });

  test('search page with the map loaded passes axe', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae');
    await waitForMap(page);
    await expectNoSeriousA11yViolations(page);
  });
});

test('points endpoint agrees with the results partial', async ({ request }) => {
  const q = 'area=radius&origin=ozone&r=1000';
  const pts = await (await request.get(`/nagoya/search/points.json?${q}`)).json();
  const html = await (await request.get(`/nagoya/search/results/?${q}`)).text();
  expect(pts.total).toBe(Number(html.match(/data-total="(\d+)"/)![1]));
  expect(pts.points).toHaveLength(pts.total);
  expect(pts.outline).toHaveLength(64);
});
