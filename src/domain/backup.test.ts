import {expect,it,beforeEach,afterEach} from 'vitest'
import {SongMapDatabase} from '../data/local/database'
import {LocalRepository} from '../data/repositories/localRepository'
import {createProject} from './project/service'
import {exportProject,importProject,markdown} from './backup'
const db=new SongMapDatabase('backup-tests');const repo=new LocalRepository(db)
beforeEach(()=>db.open());afterEach(()=>db.delete())
it('roundtrips project and graph with fresh IDs even on collision',async()=>{
 const p=await createProject('夜','Emotional',repo),b=await exportProject(p.id,repo),id=await importProject(b,repo),copy=await exportProject(id,repo)
 expect(copy.nodes).toHaveLength(6);expect(id).not.toBe(p.id)
 expect(copy.edges.every(e=>copy.nodes.some(n=>n.id===e.sourceNodeId)&&copy.nodes.some(n=>n.id===e.targetNodeId))).toBe(true)
 expect(markdown(b)).toContain('## Lyrics');expect(markdown(b)).toContain('# 夜')
})
it('rejects corrupt source links without partial import',async()=>{
 const p=await createProject('夜','Emotional',repo),b=await exportProject(p.id,repo);b.edges[0]!.sourceNodeId='missing'
 const before=await db.records('projects').count();await expect(importProject(b,repo)).rejects.toThrow('壊れています');expect(await db.records('projects').count()).toBe(before)
})
it('undo/redo create and edit preserve revisions and source references',async()=>{
 const p=await createProject('夜','Blank',repo);await repo.patch('projects',p.id,{title:'朝'})
 await repo.undo();expect((await db.records('projects').get(p.id))?.title).toBe('夜')
 await repo.redo();expect((await db.records('projects').get(p.id))?.title).toBe('朝')
 const latest=(await db.records('projects').get(p.id))!.revision;expect(latest).toBeGreaterThan(2)
 expect(await db.table('snapshots').count()).toBeGreaterThan(0)
})

