import { expect, test } from '@playwright/test';

test('root redirects to the Nagoya landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/nagoya\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('名古屋市の賃貸物件');
});
