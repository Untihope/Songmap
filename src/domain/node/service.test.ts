import { expect, it, afterEach, beforeEach } from 'vitest'
import { SongMapDatabase } from '../../data/local/database'
import { LocalRepository } from '../../data/repositories/localRepository'
import { createProject } from '../project/service'
import { addNode, addChildNode, connect, matchesNode, relatedIds, setNodeTags } from './service'
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

it('creates distinct branches from one parent without moving or overwriting previous children',async()=>{
 const p=await createProject('branches','Blank',repo)
 const parent=(await db.records('nodes').where('projectId').equals(p.id).first())!
 const first=await addChildNode(p.id,'最初の枝',parent.id,{},repo)
 const second=await addChildNode(p.id,'次の枝',parent.id,{},repo)
 const more=await Promise.all(['三つめ','四つめ'].map(text=>addChildNode(p.id,text,parent.id,{},repo)))
 const children=[first,second,...more]
 expect(new Set(children.map(n=>n.id)).size).toBe(4)
 expect(new Set(children.map(n=>n.position.y)).size).toBe(4)
 expect(children.every(n=>n.position.x>parent.position.x)).toBe(true)
 expect(await db.records('nodes').get(first.id)).toEqual(first)
 const edges=await db.records('edges').toArray()
 expect(edges).toHaveLength(4)
 expect(edges.every(e=>e.sourceNodeId===parent.id)).toBe(true)
 await repo.undo()
 expect((await db.records('nodes').get(first.id))?.deletedAt).toBeUndefined()
 await repo.redo()
 expect((await db.records('nodes').toArray()).filter(n=>!n.deletedAt)).toHaveLength(5)
})
it('avoids measured tall nodes and expands a collapsed parent when adding a branch',async()=>{
 const p=await createProject('branches','Blank',repo)
 const parent=(await db.records('nodes').where('projectId').equals(p.id).first())!
 const existing=await addNode(p.id,'長い言葉',{x:300,y:0},parent.id,repo)
 await repo.patch('nodes',parent.id,{collapsed:true})
 const next=await addChildNode(p.id,'新しい枝',parent.id,{[existing.id]:{width:210,height:500}},repo)
 expect(next.position.y<=-150||next.position.y>=540).toBe(true)
 expect((await db.records('nodes').get(parent.id))?.collapsed).toBe(false)
 await expect(addChildNode(p.id,'不正な親','missing',{},repo)).rejects.toThrow('親ノード')
 expect(await db.records('nodes').count()).toBe(3)
})
it('deduplicates tags and combines filter selectors',async()=>{
 const p=await createProject('a','Blank',repo),n=await addNode(p.id,'夜の街',undefined,undefined,repo)
 const tagged=await setNodeTags(n,'夜, 夜, 情景',repo)
 expect(tagged.tagIds).toHaveLength(2)
 expect(matchesNode(tagged,'街','free','raw',tagged.tagIds)).toBe(true)
 expect(matchesNode(tagged,'海','','',[])).toBe(false)
})
