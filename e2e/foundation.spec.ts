import { test, expect } from '@playwright/test'
test('shell navigation, theme, responsive layout', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '制作のつづきへ' })).toBeVisible()
  await page.getByRole('button', { name: 'ライトテーマ' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('link', { name: '設定', exact: true }).click()
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/foundation-' + testInfo.project.name + '.png', fullPage: true })
})
