import { expect, test } from '@playwright/test';

// axe needs page scripts, so the accessibility scan of these pages lives in seo.spec.ts (JS project).

const resultsHeading = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 2, name: /物件一覧（[\d,]+件）/ });
const count = async (page: import('@playwright/test').Page) =>
  Number((await resultsHeading(page).textContent())!.match(/（([\d,]+)件）/)![1].replace(/,/g, ''));

test.describe('search without JavaScript', () => {
  test('station checkboxes submit a GET search with a server-rendered list', async ({ page }) => {
    await page.goto('/nagoya/');
    const form = page.getByRole('form', { name: '駅を選んで探す' });
    await form.getByText('駅を選んで探す').click(); // open <details>
    await form.getByRole('checkbox', { name: /^栄駅/ }).check();
    await form.getByRole('checkbox', { name: /^伏見駅/ }).check();
    await form.getByRole('button', { name: 'この駅で検索' }).click();

    await expect(page).toHaveURL(/\/nagoya\/search\/\?area=stations&station=fushimi&station=sakae$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.getByText('検索範囲：伏見駅・栄駅')).toBeVisible();
    expect(await count(page)).toBeGreaterThan(0);
  });

  test('ward search count matches the indexable ward page', async ({ page }) => {
    await page.goto('/nagoya/ward/kita/');
    const wardCount = await count(page);
    await page.goto('/nagoya/');
    const form = page.getByRole('form', { name: '区を選んで探す' });
    await form.getByText('区を選んで探す').click();
    await form.getByRole('checkbox', { name: /^北区/ }).check();
    await form.getByRole('button', { name: 'この区で検索' }).click();
    await expect(page.getByText('検索範囲：北区')).toBeVisible();
    expect(await count(page)).toBe(wardCount);
  });

  test('radius preset from a station', async ({ page }) => {
    await page.goto('/nagoya/');
    const form = page.getByRole('form', { name: '駅からの距離で探す' });
    await form.getByText('駅からの距離で探す').click();
    await form.getByLabel('中心にする駅').selectOption('ozone');
    await form.getByRole('radio', { name: '1km' }).check();
    await form.getByRole('button', { name: 'この範囲で検索' }).click();
    await expect(page).toHaveURL(/area=radius&origin=ozone&r=1000/);
    await expect(page.getByText('検索範囲：大曽根駅から半径1km')).toBeVisible();
  });

  test('pagination keeps the area', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await page.getByRole('navigation', { name: 'ページ送り' }).getByRole('link', { name: '次のページ' }).click();
    await expect(page).toHaveURL(/area=wards&ward=naka&page=2$/);
    await expect(page.getByText('検索範囲：中区')).toBeVisible();
  });

  test('empty selection shows a text error and the forms again', async ({ page }) => {
    const res = await page.goto('/nagoya/search/?area=stations');
    expect(res!.status()).toBe(400);
    await expect(page.getByText('駅を1つ以上選んでください。')).toBeVisible();
    await expect(page.getByRole('form', { name: '駅を選んで探す' })).toBeVisible();
  });

  test('a drawn-polygon URL works without JavaScript too', async ({ page }) => {
    // square around Nagoya Castle, encoded polyline
    await page.goto('/nagoya/search/?area=polygon&src=trace&p=_bvuE_hqbY%3F_jAo%7D%40%3F%3F~iA');
    await expect(page.getByText(/検索範囲：なぞって描いた範囲（約/)).toBeVisible();
  });
});
