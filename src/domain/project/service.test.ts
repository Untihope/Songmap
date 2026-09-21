import { afterEach, beforeEach, expect, it } from 'vitest'
import { SongMapDatabase } from '../../data/local/database'
import { LocalRepository } from '../../data/repositories/localRepository'
import { createProject, duplicateProject } from './service'
const db = new SongMapDatabase('project-tests'); const repo = new LocalRepository(db)
beforeEach(() => db.open())
afterEach(() => db.delete())
it('creates a minimal untitled project and template without mandatory metadata', async () => {
  const p = await createProject('', 'Emotional', repo)
  expect(p.title).toMatch(/^Untitled /)
  expect(await db.records('nodes').count()).toBe(6)
  expect(await db.records('edges').count()).toBe(5)
  expect(await db.records('lyricsSections').count()).toBe(7)
})
it('duplicates graph with new IDs and remapped ownership/endpoints', async () => {
  const p = await createProject('夜', 'Storytelling', repo)
  const copy = await duplicateProject(p.id, repo)
  const original = await db.records('nodes').where('projectId').equals(p.id).toArray()
  const nodes = await db.records('nodes').where('projectId').equals(copy.id).toArray()
  const edges = await db.records('edges').where('projectId').equals(copy.id).toArray()
  expect(nodes).toHaveLength(original.length)
  expect(nodes.every(n => !original.some(o => o.id === n.id))).toBe(true)
  expect(edges.every(e => nodes.some(n => n.id === e.sourceNodeId) && nodes.some(n => n.id === e.targetNodeId))).toBe(true)
})
