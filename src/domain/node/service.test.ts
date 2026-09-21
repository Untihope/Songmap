import { expect, it, afterEach, beforeEach } from 'vitest'
import { SongMapDatabase } from '../../data/local/database'
import { LocalRepository } from '../../data/repositories/localRepository'
import { createProject } from '../project/service'
import { addNode, connect, matchesNode, relatedIds, setNodeTags } from './service'
const db=new SongMapDatabase('nodes-tests');const repo=new LocalRepository(db)
beforeEach(()=>db.open());afterEach(()=>db.delete())
it('adds children atomically and rejects cross-project/self links',async()=>{
 const a=await createProject('a','Blank',repo),b=await createProject('b','Blank',repo)
 const parent=(await db.records('nodes').where('projectId').equals(a.id).first())!
 const n=await addNode(a.id,'夜',{x:30,y:40},parent.id,repo)
 expect(await db.records('edges').count()).toBe(1)
 expect(relatedIds(parent.id,await db.records('edges').toArray()).has(n.id)).toBe(true)
 await expect(connect(b.id,parent.id,n.id,repo)).rejects.toThrow()
 await expect(connect(a.id,n.id,n.id,repo)).rejects.toThrow()
})
it('deduplicates tags and combines filter selectors',async()=>{
 const p=await createProject('a','Blank',repo),n=await addNode(p.id,'夜の街',undefined,undefined,repo)
 const tagged=await setNodeTags(n,'夜, 夜, 情景',repo)
 expect(tagged.tagIds).toHaveLength(2)
 expect(matchesNode(tagged,'街','free','raw',tagged.tagIds)).toBe(true)
 expect(matchesNode(tagged,'海','','',[])).toBe(false)
})
