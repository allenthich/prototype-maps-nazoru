import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './helpers';

const heading = (page: Page) => page.getByRole('heading', { level: 2, name: /物件一覧（[\d,]+件）/ });
const count = async (page: Page) => Number((await heading(page).textContent())!.match(/（([\d,]+)件）/)![1].replace(/,/g, ''));
const markDocument = (page: Page) => page.evaluate(() => ((window as unknown as { __sameDoc: boolean }).__sameDoc = true));
const sameDocument = (page: Page) => page.evaluate(() => (window as unknown as { __sameDoc?: boolean }).__sameDoc === true);

test.describe('enhanced search (in-place updates)', () => {
  test('form search swaps the list in place, keeps focus, announces once, and Back restores', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    const wardCount = await count(page);
    await markDocument(page);

    const form = page.getByRole('form', { name: '駅を選んで探す' });
    await form.getByText('駅を選んで探す').click();
    await form.getByRole('checkbox', { name: /^栄駅/ }).check();
    const submit = form.getByRole('button', { name: 'この駅で検索' });
    await submit.click();

    await expect(page.getByText('検索範囲：栄駅')).toBeVisible();
    await expect(page).toHaveURL(/\/nagoya\/search\/\?area=stations&station=sakae$/);
    expect(await sameDocument(page)).toBe(true);
    await expect(submit).toBeFocused();
    const sakaeCount = await count(page);
    await expect(page.getByRole('status')).toHaveText(`栄駅の物件は${sakaeCount.toLocaleString('ja-JP')}件です。`);
    await expect(page).toHaveTitle(new RegExp(`^栄駅の賃貸物件（${sakaeCount}件）`));
    await expect(page.getByRole('status')).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(/area=wards&ward=naka$/);
    await expect(page.getByText('検索範囲：中区')).toBeVisible();
    expect(await count(page)).toBe(wardCount);
    expect(await sameDocument(page)).toBe(true);
  });

  test('pagination updates in place and moves focus to the results heading', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await markDocument(page);
    await page.getByRole('navigation', { name: 'ページ送り' }).getByRole('link', { name: '次のページ' }).click();
    await expect(page).toHaveURL(/page=2$/);
    await expect(page.getByText(/21〜40件目/)).toBeVisible();
    await expect(heading(page)).toBeFocused();
    expect(await sameDocument(page)).toBe(true);
  });

  test('invalid submission shows an alert and keeps the previous results', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=kita');
    const before = await count(page);
    const form = page.getByRole('form', { name: '駅を選んで探す' });
    await form.getByText('駅を選んで探す').click();
    await form.getByRole('button', { name: 'この駅で検索' }).click();
    await expect(page.getByRole('alert')).toHaveText('駅を1つ以上選んでください。');
    expect(await count(page)).toBe(before);
    await expect(page).toHaveURL(/area=wards&ward=kita$/);
  });

  test('the results partial is a noindex HTML fragment', async ({ request }) => {
    const res = await request.get('/nagoya/search/results/?area=stations&station=sakae');
    expect(res.headers()['x-robots-tag']).toBe('noindex');
    const html = await res.text();
    expect(html).not.toContain('<html');
    expect(html).toContain('id="results"');
  });

  test('search page with results passes axe after an in-place update', async ({ page }) => {
    await page.goto('/nagoya/search/?area=wards&ward=naka');
    await page.getByRole('navigation', { name: 'ページ送り' }).getByRole('link', { name: '次のページ' }).click();
    await expect(page.getByText(/21〜40件目/)).toBeVisible();
    await expectNoSeriousA11yViolations(page);
  });
});
