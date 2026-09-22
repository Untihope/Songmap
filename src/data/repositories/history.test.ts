import { afterEach, expect, it, vi } from 'vitest'
import { SongMapDatabase } from '../local/database'
import { LocalRepository, type Snapshot } from './localRepository'
import { newMeta, type Project } from '../../domain/models'

const databases: SongMapDatabase[] = []
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(databases.splice(0).map(db => db.delete())) })
const setup = () => { const db = new SongMapDatabase(crypto.randomUUID()); databases.push(db); return new LocalRepository(db) }
const project = (): Project => ({ ...newMeta(), title: '最初', moods: [], pinned: false, archived: false, status: 'idea' })

it('records one before state for repeated changes in an atomic command and rolls back failures', async () => {
  const repo = setup(), p = await repo.put('projects', project())
  await repo.atomic(async () => { await repo.patch('projects', p.id, { title: '途中' }); await repo.patch('projects', p.id, { title: '最後' }) })
  await expect(repo.atomic(async () => { await repo.patch('projects', p.id, { title: '失敗' }); throw new Error('failed') })).rejects.toThrow('failed')
  await repo.undo()
  expect((await repo.database.records('projects').get(p.id))?.title).toBe('最初')
  await repo.redo()
  expect((await repo.database.records('projects').get(p.id))?.title).toBe('最後')
})

it('does not scan all records for routine typing; retains five recoverable checkpoints', async () => {
  const repo = setup(), p = await repo.put('projects', project())
  const scan = vi.spyOn(repo.database.records('nodes'), 'toArray')
  await repo.patch('projects', p.id, { title: '入力中' })
  expect(scan).not.toHaveBeenCalled()
  let time = Date.now()
  vi.spyOn(Date, 'now').mockImplementation(() => time)
  for (let i = 0; i < 6; i++) { time += 31_000; await repo.patch('projects', p.id, { title: 'checkpoint-' + i }) }
  const snapshots = await repo.database.table<Snapshot>('snapshots').orderBy('createdAt').toArray()
  expect(snapshots).toHaveLength(5)
  await repo.recover(snapshots.at(-1)!.id)
  expect((await repo.database.records('projects').get(p.id))?.title).toBe('checkpoint-4')
  await repo.undo()
  expect((await repo.database.records('projects').get(p.id))?.title).toBe('checkpoint-5')
})
