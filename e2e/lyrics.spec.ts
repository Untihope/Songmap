import {test,expect} from '@playwright/test'
test('send node without leaving map, edit lyric and return to source',async({page})=>{
 await page.goto('/songs/new');await page.getByLabel('タイトル',{exact:true}).fill('Source test');await page.getByRole('button',{name:'作成する'}).click()
 await page.getByRole('button',{name:'＋ 言葉を追加'}).click();await page.getByLabel('新しいノード').fill('世界の歯車から外れた夜');await page.getByRole('button',{name:'追加',exact:true}).click()
 await page.getByRole('button',{name:'→歌詞',exact:true}).click();await page.getByRole('button',{name:'追加する',exact:true}).click()
 await expect(page.getByLabel('Mind Map',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'LYRICS',exact:true}).click()
 await expect(page.getByLabel('歌詞',{exact:true})).toHaveValue('世界の歯車から外れた夜')
 await page.getByLabel('歌詞',{exact:true}).fill('世界の歯車から外れた朝')
 await page.getByLabel('Sourceを表示').click()
 await page.getByRole('button',{name:'↗ 世界の歯車から外れた夜',exact:true}).click()
 await expect(page.getByLabel('Mind Map',{exact:true})).toBeVisible()
})
