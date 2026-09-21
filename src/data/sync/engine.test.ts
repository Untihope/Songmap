import {it,expect,afterEach} from 'vitest'
import {SongMapDatabase} from '../local/database'
import {LocalRepository} from '../repositories/localRepository'
import {createProject} from '../../domain/project/service'
import {addNode} from '../../domain/node/service'
import {SyncEngine,type CloudAdapter,type CloudRow} from './engine'
import type {DomainTable,DomainRecord} from '../../domain/models'
class MemoryCloud implements CloudAdapter{
 rows=new Map<string,CloudRow>();offline=false;loseAck=false
 async push(table:DomainTable,record:DomainRecord,expected:number,mutationId:string){
  if(this.offline)throw new Error('offline')
  const key=table+':'+record.id;const previous=this.rows.get(key)
  if(previous?.mutationId===mutationId)return {ok:true,row:previous}
  if(previous&&previous.version!==expected)return {ok:false,row:structuredClone(previous)}
  const row={table,record:structuredClone(record),version:(previous?.version??0)+1,mutationId};this.rows.set(key,row)
  if(this.loseAck){this.loseAck=false;throw new Error('lost ack')}
  return {ok:true,row}
 }
 async pull(){if(this.offline)throw new Error('offline');return structuredClone([...this.rows.values()])}
}
const databases:SongMapDatabase[]=[]
const device=(cloud:MemoryCloud,user='user')=>{const db=new SongMapDatabase(crypto.randomUUID());databases.push(db);return {db,repo:new LocalRepository(db),sync:new SyncEngine(db,cloud,user)}}
afterEach(async()=>{await Promise.all(databases.splice(0).map(d=>d.delete()))})
it('offline edit → reconnect → mobile fetch preserves queued records',async()=>{
 const c=new MemoryCloud(),desktop=device(c),mobile=device(c);const p=await createProject('夜','Blank',desktop.repo)
 c.offline=true;await expect(desktop.sync.sync()).rejects.toThrow();expect(await desktop.db.syncQueue.count()).toBeGreaterThan(0)
 c.offline=false;await desktop.sync.sync();await mobile.sync.sync()
 expect((await mobile.db.records('projects').get(p.id))?.title).toBe('夜');expect(await desktop.db.syncQueue.count()).toBe(0)
 const n=await addNode(p.id,'スマホから',{x:4,y:5},undefined,mobile.repo);await mobile.sync.sync();await desktop.sync.sync()
 expect((await desktop.db.records('nodes').get(n.id))?.text).toBe('スマホから')
})
it('detects same-record conflicts and preserves both versions',async()=>{
 const c=new MemoryCloud(),a=device(c),b=device(c);const p=await createProject('夜','Blank',a.repo);await a.sync.sync();await b.sync.sync()
 const n=(await a.db.records('nodes').where('projectId').equals(p.id).first())!
 await a.repo.patch('nodes',n.id,{text:'朝'});await b.repo.patch('nodes',n.id,{text:'夕'});await a.sync.sync();await b.sync.sync()
 expect(await b.db.table('conflicts').count()).toBe(1)
 await b.sync.resolve('nodes:'+n.id,'both');await b.sync.sync();await a.sync.sync()
 const nodes=await a.db.records('nodes').where('projectId').equals(p.id).toArray();expect(nodes.map(n=>n.text)).toEqual(expect.arrayContaining(['朝','夕']))
})
it('retries lost acknowledgements idempotently and forbids account mixing',async()=>{
 const c=new MemoryCloud(),a=device(c);const p=await createProject('夜','Blank',a.repo)
 c.loseAck=true;await expect(a.sync.sync()).rejects.toThrow('lost ack');await a.sync.sync()
 expect(c.rows.get('projects:'+p.id)?.version).toBe(1)
 await expect(new SyncEngine(a.db,c,'another-user').sync()).rejects.toThrow('別のアカウント')
})


it('keeps edits made during an in-flight push in the durable outbox',async()=>{
 const c=new MemoryCloud(),a=device(c);const p=await createProject('夜','Blank',a.repo);await a.sync.sync()
 const n=(await a.db.records('nodes').where('projectId').equals(p.id).first())!
 await a.repo.patch('nodes',n.id,{text:'送信中'})
 const push=c.push.bind(c);let edited=false
 c.push=async(...args)=>{const result=await push(...args);if(!edited){edited=true;await a.repo.patch('nodes',n.id,{text:'その後の編集'})}return result}
 await a.sync.sync()
 expect(await a.db.syncQueue.count()).toBe(1);expect((await a.db.records('nodes').get(n.id))?.text).toBe('その後の編集')
 await a.sync.sync();expect(c.rows.get('nodes:'+n.id)?.record).toMatchObject({text:'その後の編集'})
})
it('merges edits to different records without a conflict',async()=>{
 const c=new MemoryCloud(),a=device(c),b=device(c);const p=await createProject('夜','Emotional',a.repo);await a.sync.sync();await b.sync.sync()
 const nodes=await a.db.records('nodes').where('projectId').equals(p.id).toArray()
 await a.repo.patch('nodes',nodes[0]!.id,{text:'PC'});await b.repo.patch('nodes',nodes[1]!.id,{text:'Phone'})
 await a.sync.sync();await b.sync.sync();await a.sync.sync()
 expect(await a.db.table('conflicts').count()).toBe(0);expect(await b.db.table('conflicts').count()).toBe(0)
 expect((await a.db.records('nodes').get(nodes[1]!.id))?.text).toBe('Phone')
})
