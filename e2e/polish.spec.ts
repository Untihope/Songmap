import { test, expect, type Page } from '@playwright/test'

function backup(count: number, collapsed = false) {
  const meta = (id: string) => ({ id, createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z', revision: 1 })
  return { schemaVersion: 1,
    project: { ...meta('project'), title: 'Polish ' + count, moods: [], status: 'writing', pinned: false, archived: false },
    nodes: Array.from({ length: count }, (_, i) => ({ ...meta('node-' + i), projectId: 'project', text: '夜の子 ' + i, type: 'free', status: 'raw', favorite: false, collapsed: i === 0 && collapsed, tagIds: ['tag'], position: { x: (i % 10) * 300, y: Math.floor(i / 10) * 150 } })),
    edges: Array.from({ length: count - 1 }, (_, i) => ({ ...meta('edge-' + i), projectId: 'project', sourceNodeId: 'node-0', targetNodeId: 'node-' + (i + 1), relationType: 'related' })),
    tags: [{ ...meta('tag'), projectId: 'project', name: '夜' }],
    fragments: [{ ...meta('fragment'), projectId: 'project', text: '夜の断片', favorite: false, status: 'raw', tagIds: ['tag'], sourceNodeId: 'node-1' }],
    lyricsSections: [{ ...meta('section'), projectId: 'project', name: 'Chorus', order: 0, collapsed: true }, { ...meta('section2'), projectId: 'project', name: 'Verse', order: 1, collapsed: false }],
    lyricsLines: [{ ...meta('line'), sectionId: 'section', text: '夜の歌詞', order: 0, sourceNodeIds: ['node-1'], sourceFragmentIds: ['fragment'] }],
    references: [],
  }
}
async function openFixture(page: Page, count: number, collapsed = false) {
  await page.goto('/settings')
  await page.getByLabel('JSONを読み込む').setInputFiles({ name: 'polish.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup(count, collapsed))) })
  await expect(page.getByRole('status')).toContainText('曲を読み込みました')
  await page.goto('/songs')
  await page.getByRole('heading', { name: 'Polish ' + count, exact: true }).click()
  await expect(page.getByLabel('Mind Map', { exact: true })).toBeVisible()
}
async function search(page: Page, text: string) {
  await page.getByRole('button', { name: '曲の中を検索', exact: true }).click()
  await page.getByLabel('曲内検索').fill(text)
  return page.getByRole('dialog', { name: '曲の中を検索' })
}
async function storedNode(page: Page, text: string) {
  return page.evaluate(text => new Promise<{id: string; position: {x:number;y:number}; text:string}>((resolve, reject) => {
    const request = indexedDB.open('songmap')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { const db = request.result; const rows = db.transaction('nodes').objectStore('nodes').getAll(); rows.onsuccess = () => { resolve(rows.result.find(n => n.text === text)); db.close() }; rows.onerror = () => { db.close(); reject(rows.error) } }
  }), text)
}

test('grouped search, collapsed Source, section reorder and layout persistence', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openFixture(page, 3, true)
  const dialog = await search(page, '夜')
  for (const group of ['Nodes', 'Fragments', 'Lyrics', 'Tags']) await expect(dialog.getByRole('heading', { name: group, exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: '夜の歌詞', exact: true }).click()
  await expect(page.getByLabel('歌詞', { exact: true })).toHaveValue('夜の歌詞')
  await page.getByLabel('Sourceを表示').click()
  await page.getByRole('dialog', { name: 'Source', exact: true }).getByRole('button', { name: '↗ 夜の子 1', exact: true }).click()
  await expect(page.locator('.map-node').filter({ hasText: '夜の子 1' })).toBeVisible()
  const before = await page.locator('.react-flow__viewport').getAttribute('style')
  await page.getByRole('button', { name: '編集', exact: true }).click()
  await page.getByLabel('ノードのテキスト').fill('夜の子 1 を推敲')
  await page.getByLabel('ノードのテキスト').press('Control+s')
  await expect(page.locator('.save-status')).toContainText('保存済み')
  expect(await page.locator('.react-flow__viewport').getAttribute('style')).toBe(before)
  await page.getByLabel('ノードのテキスト').press('Escape')
  await expect(page.getByLabel('ノード編集')).toHaveCount(0)
  await page.getByRole('button', { name: 'LYRICS', exact: true }).click()
  await page.getByLabel('Chorus の操作').click()
  await page.getByRole('button', { name: '下へ', exact: true }).click()
  await expect(page.getByLabel('セクション名').first()).toHaveValue('Verse')
  if (info.project.name === 'desktop') {
    await page.locator('.layout-controls summary').click()
    await page.getByRole('button', { name: 'プロジェクトを閉じる' }).click()
    await page.getByLabel('表示モード').selectOption('zen')
    await page.locator('.layout-controls summary').click()
    await page.reload()
    await expect(page.locator('.workspace')).toHaveClass(/zen-view/)
    await expect(page.locator('.project-sidebar')).toBeHidden()
    await page.locator('.layout-controls summary').click()
    await page.getByLabel('表示モード').selectOption('canvas')
    await page.getByRole('button', { name: 'プロジェクトを開く' }).click()
    await page.locator('.layout-controls summary').click()
    await expect(page.locator('.project-sidebar')).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/polish-' + info.project.name + '.png', fullPage: true })
})

test('keyboard Quick Add, child and sibling, modal focus containment and Escape', async ({ page }) => {
  await page.goto('/songs/new')
  await page.getByLabel('タイトル', { exact: true }).fill('Keyboard')
  await page.getByRole('button', { name: '作成する' }).click()
  await page.getByRole('button', { name: '＋ 言葉を追加' }).click()
  await page.getByLabel('新しいノード').fill('親')
  await page.getByLabel('新しいノード').press('Enter')
  await expect(page.getByRole('dialog',{name:'Quick Add'})).toHaveCount(0)
  const map = page.getByLabel('Mind Map', { exact: true })
  await map.focus(); await map.press('Tab')
  await page.getByLabel('新しいノード').fill('子1')
  await page.getByLabel('新しいノード').press('Enter')
  await expect(page.getByRole('dialog',{name:'Quick Add'})).toHaveCount(0)
  await expect(page.locator('.map-node').filter({ hasText: '子1' })).toBeVisible()
  await map.focus(); await map.press('Shift+Enter')
  await page.getByLabel('新しいノード').fill('子2')
  await page.getByLabel('新しいノード').press('Enter')
  await expect(page.getByRole('dialog',{name:'Quick Add'})).toHaveCount(0)
  await expect(page.locator('.react-flow__edge')).toHaveCount(2)
  await map.focus(); await map.press('Control+f')
  await expect(page.getByLabel('曲内検索')).toBeFocused()
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(map).toBeFocused()
  await map.press('/')
  await expect(page.getByLabel('ノードのテキスト')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(map).toBeFocused()
})

test('200 nodes: drag commits only on release and survives reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Actual mouse drag performance is measured on desktop; mobile flows are covered separately.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  const start = Date.now()
  await openFixture(page, 200)
  await expect(page.locator('.map-node')).toHaveCount(200)
  const readyMs = Date.now() - start
  const dialog = await search(page, '夜の子 1')
  await dialog.getByRole('button', { name: '夜の子 1', exact: true }).click()
  const stored = await storedNode(page, '夜の子 1')
  const node = page.locator('.react-flow__node[data-id="' + stored.id + '"]')
  await expect(node).toBeVisible()
  const box = (await node.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const dragStart = Date.now()
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 70, { steps: 20 })
  expect((await storedNode(page, '夜の子 1')).position).toEqual(stored.position)
  await page.mouse.up()
  await expect.poll(async () => (await storedNode(page, '夜の子 1')).position.x).not.toBe(stored.position.x)
  const dragMs = Date.now() - dragStart
  const moved = await storedNode(page, '夜の子 1')
  const sourceBox=(await node.boundingBox())!
  const targetBox=(await page.locator('.lyrics-section').last().boundingBox())!
  await page.mouse.move(sourceBox.x+sourceBox.width/2,sourceBox.y+sourceBox.height/2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x+targetBox.width/2,targetBox.y+targetBox.height/2,{steps:20})
  await expect(page.locator('.lyrics-section.drop-target')).toHaveCount(1)
  await page.mouse.up()
  await expect(page.getByLabel('歌詞',{exact:true})).toHaveValue('夜の子 1')
  expect((await storedNode(page,'夜の子 1')).position).toEqual(moved.position)
  await page.reload()
  await expect(page.locator('.map-node')).toHaveCount(200)
  expect((await storedNode(page, '夜の子 1')).position).toEqual(moved.position)
  expect(errors).toEqual([])
  await info.attach('200-node-timing', { body: JSON.stringify({ fixtureImportAndReadyMs: readyMs, dragAndCommitMs: dragMs, nodes: 200, edges: 199 }), contentType: 'application/json' })
  console.log('200-node measurement', { readyMs, dragMs })
})
