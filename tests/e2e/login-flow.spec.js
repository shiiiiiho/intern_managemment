// @ts-check
import { test, expect } from '@playwright/test';

test.describe('ログイン〜カレンダー表示', () => {
  test('ログイン画面が表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-view')).toBeVisible();
  });
});
