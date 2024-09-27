import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/docs/intro');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Installation/);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 1000);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 1000);
  await page.pause();
});
