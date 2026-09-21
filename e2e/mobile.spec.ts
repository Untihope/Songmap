import {test,expect} from '@playwright/test'
test('dedicated views, bottom sheet, source context, landscape and no overflow',async({page},info)=>{
 await page.goto('/songs/new');await page.getByLabel('タイトル',{exact:true}).fill('夜のスケッチ');await page.getByRole('button',{name:'作成する'}).click()
 await page.getByRole('button',{name:'＋ 言葉を追加'}).click();await page.getByLabel('新しいノード').fill('午前二時、窓辺の光');await page.getByRole('button',{name:'追加',exact:true}).click()
 await page.getByRole('button',{name:'LIST',exact:true}).click()
 await page.getByLabel('Listの検索').fill('窓辺')
 await page.locator('.node-list-items button').click()
 await expect(page.getByLabel('Mind Map',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'編集',exact:true}).click()
 await expect(page.getByLabel('ノード編集')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/workspace-'+info.project.name+'.png',fullPage:true})
 await page.getByLabel('編集を閉じる').click()
 if(info.project.name==='mobile'){
  await page.setViewportSize({width:844,height:390})
  await page.getByRole('button',{name:'LYRICS',exact:true}).click()
  await expect(page.getByLabel('Mind Map',{exact:true})).toBeVisible()
  await expect(page.locator('.lyrics-panel')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})
