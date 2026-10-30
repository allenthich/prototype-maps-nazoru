import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, jsonLd, SITE } from './helpers';

test.describe('indexable pages', () => {
  test('ward page has complete SEO metadata and structured data', async ({ page }) => {
    await page.goto('/nagoya/ward/naka/');
    await expect(page).toHaveTitle(/名古屋市中区の賃貸物件/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /中区/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/nagoya/ward/naka/`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${SITE}/nagoya/ward/naka/`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: /物件一覧（[\d,]+件）/ })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'パンくずリスト' }).getByRole('link', { name: '名古屋市' })).toHaveAttribute('href', '/nagoya/');

    const types = (await jsonLd(page)).map((o) => o['@type']);
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'ItemList']));
    await expectNoSeriousA11yViolations(page);
  });

  test('station page lists only that station’s listings', async ({ page }) => {
    await page.goto('/nagoya/station/sakae/');
    await expect(page.locator('h1')).toHaveText('栄駅の賃貸物件');
    const walks = await page.locator('[data-testid="listing-station"]').allTextContents();
    expect(walks.length).toBeGreaterThan(0);
    for (const w of walks) expect(w).toMatch(/^栄駅 徒歩\d+分$/);
  });

  test('pagination is crawlable and self-canonical', async ({ page }) => {
    await page.goto('/nagoya/ward/naka/');
    await page.getByRole('navigation', { name: 'ページ送り' }).getByRole('link', { name: '次のページ' }).click();
    await expect(page).toHaveURL(/\/nagoya\/ward\/naka\/\?page=2$/);
    await expect(page).toHaveTitle(/2ページ目/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/nagoya/ward/naka/?page=2`);
    await expect(page.getByRole('link', { name: '2ページ目' })).toHaveAttribute('aria-current', 'page');
  });

  test('listing page has RealEstateListing JSON-LD and ships no client JS', async ({ page }) => {
    await page.goto('/listings/nz-0001/');
    await expect(page.locator('h1')).toHaveText('コート黒川ハイツ');
    const listing = (await jsonLd(page)).find((o) => o['@type'] === 'RealEstateListing');
    expect(listing).toMatchObject({ offers: { priceCurrency: 'JPY', price: 59000 } });
    await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
    await expectNoSeriousA11yViolations(page);
  });

  test('landing page links every ward and station', async ({ page }) => {
    await page.goto('/nagoya/');
    await expect(page.getByRole('navigation', { name: '区から探す' }).getByRole('link')).toHaveCount(5);
    await expect(page.getByRole('navigation', { name: '駅から探す' }).getByRole('link')).toHaveCount(20);
    await expectNoSeriousA11yViolations(page);
  });

  test('custom-area search page is noindex and accessible', async ({ page }) => {
    await page.goto('/nagoya/search/?area=stations&station=sakae&station=fushimi');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await expectNoSeriousA11yViolations(page);
  });

  test('unknown ward returns 404', async ({ request }) => {
    expect((await request.get('/nagoya/ward/atlantis/')).status()).toBe(404);
  });
});

test.describe('crawl plumbing', () => {
  test('sitemap lists landing, ward, station and listing URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.headers()['content-type']).toContain('application/xml');
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toHaveLength(1 + 5 + 20 + 1500);
    expect(locs).toContain(`${SITE}/nagoya/station/sakae/`);
    expect(locs).toContain(`${SITE}/listings/nz-1500/`);
  });

  test('robots.txt points to the sitemap', async ({ request }) => {
    expect(await (await request.get('/robots.txt')).text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  test('ward pages are served from the route cache on repeat requests', async ({ request }) => {
    const url = '/nagoya/ward/kita/';
    await request.get(url);
    const second = await request.get(url);
    expect(second.headers()['x-astro-cache']).toBe('HIT');
  });
});
