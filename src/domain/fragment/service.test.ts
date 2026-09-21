import {expect,it,beforeEach,afterEach} from 'vitest'
import { SongMapDatabase } from '../../data/local/database'
import { LocalRepository } from '../../data/repositories/localRepository'
import { createProject } from '../project/service'
import { capture, convertInbox, nodeToFragment, lyricToFragment } from './service'
import { sendToLyrics } from '../lyrics/service'
const db=new SongMapDatabase('fragment-tests');const repo=new LocalRepository(db)
beforeEach(()=>db.open());afterEach(()=>db.delete())
it.each(['node','fragment'] as const)('converts inbox to %s atomically once',async(type)=>{
 const p=await createProject('夜','Blank',repo),i=await capture('ひとこと','home',repo)
 const id=await convertInbox(i.id,type,p.id,repo)
 expect((await db.records('inboxItems').get(i.id))?.convertedToId).toBe(id)
 expect((await db.records(type==='node'?'nodes':'fragments').get(id))?.text).toBe('ひとこと')
 await expect(convertInbox(i.id,type,p.id,repo)).rejects.toThrow('変換済み')
})
it('preserves Node → Fragment → Lyrics sources and recovers a lyric as fragment',async()=>{
 const p=await createProject('夜','Blank',repo),n=(await db.records('nodes').where('projectId').equals(p.id).first())!,s=(await db.records('lyricsSections').where('projectId').equals(p.id).first())!
 const f=await nodeToFragment(n.id,repo),l=await sendToLyrics('fragments',f.id,s.id,undefined,repo)
 expect(l.sourceNodeIds).toEqual([n.id]);expect(l.sourceFragmentIds).toEqual([f.id])
 const restored=await lyricToFragment(l.id,repo);expect(restored.sourceNodeId).toBe(n.id);expect((await db.records('lyricsLines').get(l.id))?.deletedAt).toBeTruthy()
})
it('keeps inbox raw on failed conversion',async()=>{
 const i=await capture('守る','home',repo);await expect(convertInbox(i.id,'node','missing',repo)).rejects.toThrow()
 expect((await db.records('inboxItems').get(i.id))?.status).toBe('raw')
})
