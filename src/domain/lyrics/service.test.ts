import { expect,it,beforeEach,afterEach } from 'vitest'
import { SongMapDatabase } from '../../data/local/database'
import { LocalRepository } from '../../data/repositories/localRepository'
import { createProject } from '../project/service'
import { sendToLyrics,splitLine,mergeLine,moveSection } from './service'
const db=new SongMapDatabase('lyrics-tests');const repo=new LocalRepository(db)
beforeEach(()=>db.open());afterEach(()=>db.delete())
it('preserves sources and stable IDs through edit/split/merge',async()=>{
 const p=await createProject('夜','Blank',repo);const n=(await db.records('nodes').where('projectId').equals(p.id).first())!;const s=(await db.records('lyricsSections').where('projectId').equals(p.id).first())!
 const l=await sendToLyrics('nodes',n.id,s.id,undefined,repo)
 expect(l.sourceNodeIds).toEqual([n.id])
 await repo.patch('lyricsLines',l.id,{text:'夜明けの街'});const next=await splitLine(l,'夜明けの街',3,3,repo)
 expect((await db.records('lyricsLines').get(l.id))?.text).toBe('夜明け');expect(next.sourceNodeIds).toEqual([n.id])
 const merged=await mergeLine(next,'の街',repo);expect(merged?.id).toBe(l.id)
 expect((await db.records('lyricsLines').get(l.id))?.text).toBe('夜明けの街')
})
it('reorders sections with distinct stable orders',async()=>{
 const p=await createProject('夜','Blank',repo);const s=(await db.records('lyricsSections').where('projectId').equals(p.id).toArray()).sort((a,b)=>a.order-b.order)
 await moveSection(p.id,s[2]!.id,s[0]!.id,repo)
 expect((await db.records('lyricsSections').get(s[2]!.id))?.order).toBe(0)
})
