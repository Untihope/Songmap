import { afterEach, describe, expect, it } from 'vitest'
import { SongMapDatabase } from '../local/database'
import { LocalRepository } from './localRepository'
import { newMeta, type Project } from '../../domain/models'
const databases: SongMapDatabase[] = []
const setup = () => { const db = new SongMapDatabase(crypto.randomUUID()); databases.push(db); return new LocalRepository(db) }
const project = (): Project => ({ ...newMeta(), title:'夜', moods:[], status:'idea', pinned:false, archived:false })
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())) })
describe('local-first repository', () => {
  it('persists records and outbox atomically; increments revisions', async () => {
    const repo = setup(); const first = await repo.put('projects', project())
    const second = await repo.patch('projects', first.id, { title: '夜明け' })
    expect(second.revision).toBe(2)
    expect((await repo.database.records('projects').get(first.id))?.title).toBe('夜明け')
    expect(await repo.database.syncQueue.count()).toBe(2)
  })
  it('rolls back domain and outbox on failure', async () => {
    const repo = setup()
    await expect(repo.atomic(async () => { await repo.put('projects', project()); throw new Error('fail') })).rejects.toThrow('fail')
    expect(await repo.database.records('projects').count()).toBe(0)
    expect(await repo.database.syncQueue.count()).toBe(0)
  })
  it('keeps data through close/reopen and restores soft deletion', async () => {
    const repo = setup(); const p = await repo.put('projects', project())
    await repo.remove('projects', p.id); expect((await repo.database.records('projects').get(p.id))?.deletedAt).toBeTruthy()
    await repo.restore('projects', p.id); repo.database.close(); await repo.database.open()
    expect((await repo.database.records('projects').get(p.id))?.deletedAt).toBeUndefined()
    expect(await repo.database.trash.count()).toBe(0)
  })
})
