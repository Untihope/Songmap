import {test,expect} from '@playwright/test'
test('undo redo, backup export, reload and import',async({page})=>{
 await page.goto('/songs/new');await page.getByLabel('タイトル',{exact:true}).fill('Backup song');await page.getByRole('button',{name:'作成する'}).click()
 await page.getByRole('button',{name:'＋ 言葉を追加'}).click();await page.getByLabel('新しいノード').fill('消さない言葉');await page.getByRole('button',{name:'追加',exact:true}).click()
 await page.getByRole('button',{name:'元に戻す',exact:true}).click();await expect(page.locator('.map-node').filter({hasText:'消さない言葉'})).toHaveCount(0)
 await page.getByRole('button',{name:'やり直す',exact:true}).click();await expect(page.locator('.map-node').filter({hasText:'消さない言葉'})).toHaveCount(1)
 await page.locator('.export-menu summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'JSON バックアップ'}).click()
 const file=await download;const path=await file.path();if(!path)throw new Error('download missing')
 await page.goto('/settings');await page.getByLabel('JSONを読み込む').setInputFiles(path)
 await expect(page.getByRole('status')).toContainText('曲を読み込みました')
 await page.goto('/songs');await expect(page.getByRole('heading',{name:'Backup song',exact:true})).toHaveCount(2)
})
