import { expect, test, type Page } from '@playwright/test';
import { expectNoSeriousA11yViolations, markerTotal, resultsCount, waitForMap } from './helpers';

const widget = (page: Page) => page.locator('nazoru-map');
const btn = (page: Page, name: string) => widget(page).getByRole('button', { name, exact: true });

async function overlayBox(page: Page) {
  const box = await widget(page).locator('[data-trace-overlay]').boundingBox();
  if (!box) throw new Error('trace overlay not visible');
  return box;
}

/** A loop around the map centre whose end sweeps across its start, like a real finger overshooting. */
function loop(cx: number, cy: number, r: number, steps = 48, overshoot = true) {
  const ring = Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  });
  const tail = Array.from({ length: 6 }, (_, k) => {
    const t = 0.05 + k * 0.08;
    const rr = r * (1.12 - k * 0.06);
    return { x: cx + rr * Math.cos(t), y: cy + rr * Math.sin(t) };
  });
  return overshoot ? [...ring, ...tail] : ring;
}

/** Figure-8 (lemniscate): crosses itself in the middle. */
function figureEight(cx: number, cy: number, r: number, steps = 64) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return { x: cx + r * Math.sin(t), y: cy + (r / 2) * Math.sin(2 * t) };
  });
}

async function mouseStroke(page: Page, points: { x: number; y: number }[], { release = true } = {}) {
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y);
  if (release) await page.mouse.up();
}

async function startTrace(page: Page, url = '/nagoya/search/?area=stations&station=sakae') {
  await page.goto(url);
  await waitForMap(page);
  await btn(page, 'なぞる').click();
  await expect(btn(page, 'なぞる')).toHaveAttribute('aria-pressed', 'true');
  await expect(widget(page)).toHaveAttribute('data-gesture-handling', 'none');
  const box = await overlayBox(page);
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2, r: Math.min(box.width, box.height) * 0.3 };
}

test.describe('trace mode (なぞる) @map', () => {
  test('tracing a loop searches inside it, then restores map gestures', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page);
    await mouseStroke(page, loop(cx, cy, r));
    await expect(page).toHaveURL(/area=polygon&src=trace&p=/);
    await expect(page.getByText(/検索範囲：なぞって描いた範囲（約/)).toBeVisible();
    await expect(btn(page, 'なぞる')).toHaveAttribute('aria-pressed', 'false');
    await expect(widget(page)).not.toHaveAttribute('data-gesture-handling', 'none');
    await expect.poll(() => markerTotal(page), { timeout: 10_000 }).toBe(await resultsCount(page));
  });

  test('a figure-8 is rejected with an alert and the previous area is kept', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page);
    await mouseStroke(page, figureEight(cx, cy, r));
    await expect(widget(page).getByRole('alert')).toHaveText('線が交差しています。線が交わらないように囲み直してください。');
    await expect(page).toHaveURL(/area=stations&station=sakae$/);
    await expect(btn(page, 'なぞる')).toHaveAttribute('aria-pressed', 'true');
  });

  test('Escape mid-stroke aborts it; a second Escape leaves the mode', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page);
    await mouseStroke(page, loop(cx, cy, r).slice(0, 30), { release: false });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.getByRole('status')).toHaveText('なぞりを中断しました。');
    await expect(page).toHaveURL(/area=stations&station=sakae$/);
    await page.keyboard.press('Escape');
    await expect(btn(page, 'なぞる')).toHaveAttribute('aria-pressed', 'false');
    await expect(btn(page, 'なぞる')).toBeFocused();
    await expect(widget(page)).not.toHaveAttribute('data-gesture-handling', 'none');
  });

  test('releasing outside the map cancels the stroke (pointer cancellation)', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page);
    const box = await overlayBox(page);
    await mouseStroke(page, [...loop(cx, cy, r, 48, false).slice(0, 40), { x: box.x + box.width + 40, y: cy }]);
    await expect(widget(page).getByRole('alert')).toHaveText('地図の外で指を離したため、範囲を取り消しました。');
    await expect(page).toHaveURL(/area=stations&station=sakae$/);
  });

  test('trace mode passes axe', async ({ page }) => {
    await startTrace(page);
    await expectNoSeriousA11yViolations(page);
  });

  test('on an indexable page, a traced area navigates to the search page', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page, '/nagoya/ward/higashi/');
    await mouseStroke(page, loop(cx, cy, r));
    await expect(page).toHaveURL(/\/nagoya\/search\/\?area=polygon&src=trace/);
  });
});

test.describe('trace mode with a touchscreen @map', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('a one-finger loop traces instead of panning the map or scrolling the page', async ({ page }) => {
    const { cx, cy, r } = await startTrace(page);
    const scrollBefore = await page.evaluate(() => scrollY);
    const cdp = await page.context().newCDPSession(page);
    const pts = loop(cx, cy, r);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0].x, y: pts[0].y }] });
    for (const p of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page).toHaveURL(/area=polygon&src=trace/);
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  });
});
