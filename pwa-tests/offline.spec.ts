import {test,expect} from '@playwright/test'
test('installed service worker supports offline shell and editing after reload',async({page,context})=>{
 await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready})
 await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 await context.setOffline(true);await page.goto('/songs/new')
 await page.getByLabel('タイトル',{exact:true}).fill('オフラインの曲');await page.getByRole('button',{name:'作成する'}).click()
 await expect(page.getByLabel('曲のタイトル')).toHaveValue('オフラインの曲')
 await page.getByRole('button',{name:'＋ 言葉を追加'}).click();await page.getByLabel('新しいノード').fill('電波のない夜');await page.getByRole('button',{name:'追加',exact:true}).click()
 await expect(page.locator('.map-node').filter({hasText:'電波のない夜'})).toBeVisible()
 await page.reload();await expect(page.locator('.map-node').filter({hasText:'電波のない夜'})).toBeVisible()
 await expect(page.locator('.save-status')).toContainText('オフライン')
})
