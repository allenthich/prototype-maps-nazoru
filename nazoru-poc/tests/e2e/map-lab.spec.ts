import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openMap(page: Page) {
  const button = page.getByRole('button', { name: '地図を開く', exact: true });
  if (await button.isVisible()) await button.click();
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-map-state', 'ready', { timeout: 25000 });
  const warning = page.getByRole('button', { name: 'OK', exact: true });
  if (!process.env.E2E_GOOGLE_MAPS_API_KEY) await warning.click({ timeout: 15000 });
  await expect(page.locator('[data-lab-pin]').first()).toBeVisible();
}

async function panMap(page: Page) {
  const before = await page.locator('[data-lab]').getAttribute('data-camera');
  const rect = (await page.locator('[data-map-canvas]').boundingBox())!;
  await page.mouse.move(rect.x + rect.width * .55, rect.y + rect.height * .65);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .3, rect.y + rect.height * .65, { steps: 16 });
  await page.mouse.up();
  await expect(page.locator('[data-lab]')).not.toHaveAttribute('data-camera', before!);
}

test('public demo uses neutral store branding and sample amenities', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await expect(page).toHaveTitle('名古屋のお店を探す｜地図検索プロトタイプ');
  await expect(page.getByRole('link', { name: 'Map Lab DEMO', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('名古屋のお店を探す');
  await expect(page.getByLabel('Wi-Fiあり', { exact: true })).toBeVisible();
  await expect(page.getByLabel('テラス席あり', { exact: true })).toBeVisible();
  await expect(page.getByLabel('駐車場あり', { exact: true })).toBeVisible();
  await expect(page.locator('[data-results] .store-card').first()).toContainText('目安予算');
});

test('standard flow keeps results stable while exploring and commits only on the button', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  const list = page.locator('[data-results]');
  const before = await list.innerText();
  await openMap(page);
  const region = page.locator('[data-map-canvas] [role="region"]').first();
  await region.focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-pin-state', 'ready');
  await expect(list).toHaveText(before, { useInnerText: true });
  await page.getByRole('button', { name: 'このエリアの店舗情報を表示', exact: true }).click();
  await expect(page.locator('[data-results-scope]')).toHaveText('地図の表示エリア');
  await expect(list).not.toHaveText(before, { useInnerText: true });
});

test('map close/reopen retains the camera and does not commit exploration', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await openMap(page);
  await panMap(page);
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-pin-state', 'ready');
  const camera = await page.locator('[data-lab]').getAttribute('data-camera');
  await page.getByRole('button', { name: '地図を閉じる', exact: true }).click();
  await expect(page.locator('[data-results-scope]')).toHaveText('錦');
  await page.getByRole('button', { name: '地図を開く', exact: true }).click();
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-camera', camera!);
});

test('pin selection shows only its stores without changing the normal list', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await openMap(page);
  const before = await page.locator('[data-results]').innerText();
  await page.locator('[data-lab-pin]').first().click();
  const dialog = page.getByRole('dialog', { name: /この場所のお店/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.store-card').first()).toBeVisible();
  await expect(page.locator('[data-results]')).toHaveText(before, { useInnerText: true });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-lab-pin][data-state="selected"]')).toHaveCount(0);
});

test('settings round trip through a URL and can be reset', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await page.getByText('プロトタイプ設定', { exact: true }).click();
  await page.getByLabel('ピンタップ').selectOption('none');
  await page.getByLabel('クラスタタップ').selectOption('zoom');
  await page.getByLabel('半径検索を表示').check();
  await expect(page).toHaveURL(/ui_pinAction=none/);
  await page.reload();
  await page.getByText('プロトタイプ設定', { exact: true }).click();
  await expect(page.getByLabel('ピンタップ')).toHaveValue('none');
  await expect(page.getByLabel('クラスタタップ')).toHaveValue('zoom');
  await expect(page.getByLabel('半径検索を表示')).toBeChecked();
  await page.getByRole('button', { name: '設定を初期化' }).click();
  await expect(page.getByLabel('ピンタップ')).toHaveValue('sheet');
  await expect(page.getByLabel('半径検索を表示')).not.toBeChecked();
});

test('a shared camera survives initial loading and a full reload', async ({ page }) => {
  await page.goto('/nagoya/map-lab/?ui_mapOpen=1&camera=35.171111,136.884444,15');
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-map-state', 'ready', { timeout: 25000 });
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-camera', '35.171111,136.884444,15.00');
  await page.reload();
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-map-state', 'ready', { timeout: 25000 });
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-camera', '35.171111,136.884444,15.00');
});

test('category changes keep the camera; area changes move it', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await openMap(page);
  const before = await page.locator('[data-lab]').getAttribute('data-camera');
  await page.getByLabel('カテゴリ', { exact: true }).selectOption('cafe');
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-list-state', 'ready');
  await expect(page.locator('[data-lab]')).toHaveAttribute('data-camera', before!);
  await page.getByLabel('名駅', { exact: true }).check();
  await page.getByLabel('錦', { exact: true }).uncheck();
  await expect(page.locator('[data-results-scope]')).toHaveText('名駅');
  await expect(page.locator('[data-lab]')).not.toHaveAttribute('data-camera', before!);
});

test('mobile layout has no horizontal overflow and meets automated accessibility checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/nagoya/map-lab/');
  await page.getByText('プロトタイプ設定', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('API validates inputs and exposes every store in a large selection through pagination', async ({ request }) => {
  const bad = await request.get('/nagoya/map-lab/stores.json?category=unknown');
  expect(bad.status()).toBe(400);
  const pins = await (await request.get('/nagoya/map-lab/stores.json?view=pins&viewport=35.14,136.86,35.19,136.95')).json();
  const building = pins.pins.filter((pin: { buildingId: string }) => pin.buildingId === 'nishiki-0');
  expect(building).toHaveLength(36);
  const ids = building.map((pin: { id: string }) => pin.id).join(',');
  const found: string[] = [];
  for (let page = 1; page <= 3; page++) {
    const selection = await (await request.get(`/nagoya/map-lab/stores.json?view=selection&ids=${ids}&page=${page}`)).json();
    expect(selection.total).toBe(36);
    found.push(...selection.items.map((store: { id: string }) => store.id));
  }
  expect(new Set(found).size).toBe(36);
});

for (const pinRefresh of ['auto', 'search']) for (const listRefresh of ['manual', 'auto']) {
  test(`independent refresh combination: pins ${pinRefresh}, list ${listRefresh}`, async ({ page }) => {
    const pinViewports: string[] = [];
    page.on('request', request => { const url = new URL(request.url()); if (url.pathname.endsWith('stores.json') && url.searchParams.get('view') === 'pins') pinViewports.push(url.searchParams.get('viewport')!); });
    await page.goto(`/nagoya/map-lab/?ui_pinRefresh=${pinRefresh}&ui_listRefresh=${listRefresh}`);
    await openMap(page);
    const initialViewport = pinViewports.at(-1);
    await panMap(page);
    if (listRefresh === 'auto') await expect(page.locator('[data-results-scope]')).toHaveText('地図の表示エリア');
    // Observe a full map-idle debounce before asserting a deliberately absent refresh.
    await page.waitForTimeout(600);
    if (listRefresh === 'manual') await expect(page.locator('[data-results-scope]')).toHaveText('錦');
    if (pinRefresh === 'auto') expect(pinViewports.at(-1)).not.toBe(initialViewport);
    else expect(pinViewports.at(-1)).toBe(initialViewport);
  });
}

for (const pinAction of ['none', 'preview', 'sheet']) {
  test(`single-pin interaction: ${pinAction}`, async ({ page }) => {
    await page.goto(`/nagoya/map-lab/?ui_clustering=building&ui_pinAction=${pinAction}&camera=35.1739,136.9047,18`);
    await openMap(page);
    const pin = page.locator('[data-lab-pin][data-count="1"]').first();
    if (pinAction === 'none') {
      const rect = (await pin.boundingBox())!;
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await expect(page.locator('[data-selection]')).not.toBeVisible();
    } else {
      await pin.click();
      await expect(page.locator('[data-selection]')).toBeVisible();
      await expect(page.locator('[data-selection]')).toHaveAttribute('data-presentation', pinAction);
      await expect(page.locator('[data-selection] .store-card')).toHaveCount(1);
      await expect(pin).toHaveAttribute('data-state', 'selected');
    }
  });
}

test('building cluster exposes all stores through load more and details open in another tab', async ({ page }) => {
  await page.goto('/nagoya/map-lab/?ui_clustering=building');
  await openMap(page);
  await page.locator('[data-lab-pin][data-count="36"]').first().click();
  const dialog = page.locator('[data-selection]');
  await expect(dialog.locator('.store-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'さらに表示', exact: true }).click();
  await expect(dialog.locator('.store-card')).toHaveCount(24);
  await page.getByRole('button', { name: 'さらに表示', exact: true }).click();
  await expect(dialog.locator('.store-card')).toHaveCount(36);
  await expect(page.getByRole('button', { name: 'さらに表示', exact: true })).not.toBeVisible();
  const popup = page.waitForEvent('popup');
  await dialog.locator('.store-card a').first().click();
  const detail = await popup;
  await expect(detail).toHaveURL(/\/map-lab\/stores\/store-/);
  await expect(detail.getByRole('heading', { level: 1 })).toContainText('錦');
    await expect(detail.getByRole('link', { name: 'Map Lab DEMO', exact: true })).toBeVisible();
    await expect(detail.locator('.eyebrow').first()).toHaveText('SAMPLE STORE DETAIL');
  await detail.close();
});

test('cluster zoom changes only the camera', async ({ page }) => {
  await page.goto('/nagoya/map-lab/?ui_clusterAction=zoom');
  await openMap(page);
  const before = await page.locator('[data-lab]').getAttribute('data-camera');
  await page.locator('[data-lab-pin]').first().click();
  await expect(page.locator('[data-lab]')).not.toHaveAttribute('data-camera', before!);
  await expect(page.locator('[data-results-scope]')).toHaveText('錦');
  await expect(page.locator('[data-selection]')).not.toBeVisible();
});

test('radius and keyboard polygon tools produce committed searches', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/nagoya/map-lab/?preset=tools');
  await openMap(page);
  await page.locator('[data-radius-tool] > summary').click();
  await page.locator('[data-radius]').selectOption('500');
  await page.getByRole('button', { name: 'この半径で検索', exact: true }).click();
  await expect(page.locator('[data-results-scope]')).toHaveText('指定地点から半径500m');
  await page.getByRole('button', { name: '十字で範囲指定', exact: true }).click();
  await page.getByRole('button', { name: '頂点を追加', exact: true }).click();
  await page.getByRole('button', { name: '右へ', exact: true }).click();
  await page.getByRole('button', { name: '右へ', exact: true }).click();
  await page.getByRole('button', { name: '頂点を追加', exact: true }).click();
  await page.getByRole('button', { name: '下へ', exact: true }).click();
  await page.getByRole('button', { name: '下へ', exact: true }).click();
  await page.getByRole('button', { name: '頂点を追加', exact: true }).click();
  await page.getByRole('button', { name: '完了', exact: true }).click();
  await expect(page.locator('[data-results-scope]')).toHaveText('指定した範囲');
  await expect(page.locator('[data-map-error]')).toBeEmpty();
});

test('tracing a shape updates the results without a page navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/nagoya/map-lab/?preset=tools');
  await openMap(page);
  await page.getByRole('button', { name: 'なぞる', exact: true }).click();
  const rect = (await page.locator('[data-trace-overlay]').boundingBox())!;
  await page.mouse.move(rect.x + rect.width * .4, rect.y + rect.height * .3);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .65, rect.y + rect.height * .3, { steps: 12 });
  await page.mouse.move(rect.x + rect.width * .65, rect.y + rect.height * .75, { steps: 12 });
  await page.mouse.move(rect.x + rect.width * .4, rect.y + rect.height * .75, { steps: 12 });
  await page.mouse.move(rect.x + rect.width * .4, rect.y + rect.height * .3, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('[data-results-scope]')).toHaveText('指定した範囲');
  expect(errors).toEqual([]);
});

test('failed list requests retain the last successful results and allow retry', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  const before = await page.locator('[data-results]').innerText();
  await page.route('**/map-lab/stores.json?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: '検索できませんでした。再試行してください。' } }) }));
  await page.getByLabel('カテゴリ', { exact: true }).selectOption('cafe');
  await expect(page.locator('[data-error]')).toContainText('検索できませんでした');
  await expect(page.locator('[data-results]')).toHaveText(before, { useInnerText: true });
  await page.unroute('**/map-lab/stores.json?**');
  await page.getByLabel('カテゴリ', { exact: true }).selectOption('restaurant');
  await expect(page.locator('[data-error]')).toBeEmpty();
  await expect(page.locator('[data-results] .store-eyebrow').first()).toContainText('レストラン');
});

test('rapid area and category changes preserve the latest visible filter choices', async ({ page }) => {
  await page.goto('/nagoya/map-lab/');
  await page.route('**/map-lab/stores.json?**', async route => {
    await new Promise(resolve => setTimeout(resolve, 200));
    await route.continue();
  });
  await page.getByLabel('名駅', { exact: true }).check();
  await page.getByLabel('カテゴリ', { exact: true }).selectOption('cafe');
  await expect(page.locator('[data-results-scope]')).toHaveText('錦・名駅');
  await expect(page.getByLabel('名駅', { exact: true })).toBeChecked();
  await expect(page.locator('[data-results] .store-eyebrow').first()).toContainText('カフェ');
});

test('a pending map refresh cannot overwrite a more recent category change', async ({ page }) => {
  await page.goto('/nagoya/map-lab/?ui_listRefresh=auto');
  await openMap(page);
  await page.route('**/map-lab/stores.json?**', async route => {
    if (new URL(route.request().url()).searchParams.get('category') === 'cafe') await new Promise(resolve => setTimeout(resolve, 600));
    await route.continue();
  });
  await panMap(page);
  await page.getByLabel('カテゴリ', { exact: true }).selectOption('cafe');
  await expect.poll(async () => (await page.locator('[data-results] .store-eyebrow').allTextContents()).every(text => text.includes('カフェ'))).toBe(true);
  await expect(page.getByLabel('カテゴリ', { exact: true })).toHaveValue('cafe');
});
