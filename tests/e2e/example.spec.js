// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('基本機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページが表示される', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });
});
