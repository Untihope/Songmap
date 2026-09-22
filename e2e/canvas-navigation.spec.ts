import { test, expect, type Page } from '@playwright/test'

async function createSong(page: Page, title: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/songs/new')
  await page.getByLabel('タイトル', { exact: true }).fill(title)
  await page.getByRole('button', { name: '作成する' }).click()
  await expect(page.locator('.map-node')).toHaveCount(1)
  await expect(page.getByRole('slider', { name: 'ズーム倍率' })).toHaveValue('85')
}

async function mapRecords(page: Page) {
  return page.evaluate(() => new Promise<{nodes: {id:string;text:string;position:{x:number;y:number}}[];edges:{sourceNodeId:string;targetNodeId:string}[];zoom?:number}>(resolve => {
    const request = indexedDB.open('songmap')
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction(['nodes', 'edges', 'workspaceStates'])
      const nodes = tx.objectStore('nodes').getAll(), edges = tx.objectStore('edges').getAll(), states = tx.objectStore('workspaceStates').getAll()
      tx.oncomplete = () => { resolve({nodes:nodes.result, edges:edges.result, zoom:states.result.find(s=>s.zoom!==undefined)?.zoom}); db.close() }
    }
  }))
}

test('zoom buttons never open Quick Add; slider, restore and fit remain usable', async ({page}, info) => {
  await createSong(page, 'ズーム確認')
  for (const name of ['拡大', '縮小', '拡大', '縮小']) {
    await page.getByRole('button', {name, exact:true}).dblclick({delay:60})
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  const slider = page.getByRole('slider', {name:'ズーム倍率'})
  await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight')
  await expect(slider).toHaveValue('16')
  await expect(page.getByLabel('現在のズーム倍率')).toHaveText('16%')
  await expect.poll(async () => (await mapRecords(page)).zoom).toBeCloseTo(.16)
  await page.reload()
  await expect(page.getByRole('slider', {name:'ズーム倍率'})).toHaveValue('16')
  await page.getByRole('button', {name:'全体表示',exact:true}).dblclick()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(slider).toHaveValue('85')
  const pane = page.locator('.react-flow__pane')
  const rect = (await pane.boundingBox())!
  await page.mouse.move(rect.x+rect.width/2, rect.y+rect.height-190)
  await page.mouse.down(); await page.mouse.move(rect.x-600,rect.y+rect.height-190,{steps:10}); await page.mouse.up()
  await page.getByRole('button', {name:'全体表示',exact:true}).click()
  const node = (await page.locator('.map-node').boundingBox())!
  expect(node.x).toBeGreaterThanOrEqual(rect.x)
  expect(node.x+node.width).toBeLessThanOrEqual(rect.x+rect.width)
  expect(node.y).toBeGreaterThanOrEqual(rect.y)
  expect(node.y+node.height).toBeLessThanOrEqual(rect.y+rect.height)
  await page.screenshot({path:'test-results/zoom-'+info.project.name+'.png'})
  // Empty-space double click still opens Quick Add, without also changing zoom.
  await pane.dblclick({position:{x:25,y:rect.height/2}})
  await expect(page.getByRole('dialog',{name:'Quick Add'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(slider).toHaveValue('85')
})

test('three children branch from the same parent and remain separate after reload', async ({page}, info) => {
  await createSong(page,'枝分かれの親')
  const parent = page.locator('.map-node').filter({hasText:'枝分かれの親'})
  for (const text of ['最初の枝','二つめの枝','三つめの枝']) {
    await parent.click()
    await page.getByRole('button',{name:'＋子',exact:true}).click()
    await page.getByLabel('新しいノード').fill(text)
    await page.getByRole('button',{name:'追加',exact:true}).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button',{name:'全体表示',exact:true}).click()
  }
  await expect(page.locator('.map-node')).toHaveCount(4)
  await expect(page.locator('.react-flow__edge')).toHaveCount(3)
  await page.getByRole('button',{name:'全体表示',exact:true}).click()
  if(info.project.name==='mobile')await expect.poll(async()=>Number(await page.getByRole('slider',{name:'ズーム倍率'}).inputValue())).toBeLessThan(85)
  const zoom=Number(await page.getByRole('slider',{name:'ズーム倍率'}).inputValue())
  await expect.poll(async()=>Math.round(((await mapRecords(page)).zoom??0)*100)).toBe(zoom)
  const before = await mapRecords(page)
  const root = before.nodes.find(n=>n.text==='枝分かれの親')!
  const children = before.nodes.filter(n=>n.id!==root.id)
  expect(new Set(children.map(n=>n.position.y)).size).toBe(3)
  expect(before.edges.every(e=>e.sourceNodeId===root.id)).toBe(true)
  const boxes=await page.locator('.map-node').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}}))
  if(info.project.name==='mobile'){
    const toolbar=(await page.locator('.node-actions').boundingBox())!
    expect(Math.max(...boxes.map(b=>b.bottom))).toBeLessThan(toolbar.y)
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i]!,b=boxes[j]!
    expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true)
  }
  await page.reload()
  await expect(page.locator('.map-node')).toHaveCount(4)
  expect((await mapRecords(page)).nodes).toEqual(before.nodes)
  await expect(page.getByRole('slider',{name:'ズーム倍率'})).toHaveValue(String(zoom))
  await page.screenshot({path:'test-results/branches-'+info.project.name+'.png'})
})
