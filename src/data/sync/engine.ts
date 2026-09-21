import type { SongMapDatabase } from '../local/database'
import { LocalRepository } from '../repositories/localRepository'
import { domainTables, newMeta, type DomainTable, type DomainRecord } from '../../domain/models'
export interface CloudRow { table:DomainTable; record:DomainRecord; version:number; mutationId:string }
export interface CloudAdapter { push(table:DomainTable,record:DomainRecord,expected:number,mutationId:string):Promise<{ok:boolean;row:CloudRow}>; pull():Promise<CloudRow[]> }
export interface SyncMeta { id:string; version:number }
export interface Conflict { id:string; table:DomainTable; recordId:string; local:DomainRecord; cloud:CloudRow }
const key=(table:DomainTable,id:string)=>table+':'+id
export class SyncEngine {
 private running=false
 constructor(readonly db:SongMapDatabase,readonly cloud:CloudAdapter,readonly userId:string){}
 async bind(){
  await this.db.transaction('rw',this.db.table('preferences'),async()=>{
   const bound=await this.db.table('preferences').get('account')
   if(bound&&bound.value!==this.userId)throw new Error('この端末は別のアカウントに紐づいています。別のブラウザプロファイルを使用してください。')
   await this.db.table('preferences').put({id:'account',value:this.userId})
  })
 }
 async sync(){
  if(this.running)return;this.running=true
  try{
   await this.bind()
   const entries=await this.db.syncQueue.toArray()
   const grouped=new Map<string,typeof entries>()
   for(const e of entries){const k=key(e.table,e.recordId);grouped.set(k,[...(grouped.get(k)??[]),e])}
   for(const [id,queue]of grouped){
    if(await this.db.table('conflicts').get(id))continue
    queue.sort((a,b)=>a.record.revision-b.record.revision)
    const last=queue.at(-1)!
    const meta=await this.db.table<SyncMeta>('syncMeta').get(id)
    const response=await this.cloud.push(last.table,last.record,meta?.version??0,last.id)
    await this.db.transaction('rw',[last.table,'syncQueue','syncMeta','conflicts'],async()=>{
     if(response.ok){await this.db.table('syncMeta').put({id,version:response.row.version});await this.db.syncQueue.bulkDelete(queue.map(e=>e.id))}
     else {const local=await this.db.records(last.table).get(last.recordId);if(local)await this.db.table<Conflict>('conflicts').put({id,table:last.table,recordId:last.recordId,local,cloud:response.row})}
    })
   }
   const remote=await this.cloud.pull()
   await this.db.transaction('rw',[...domainTables,'syncQueue','syncMeta','conflicts','trash'],async()=>{
    for(const row of remote){
     const id=key(row.table,row.record.id);const meta=await this.db.table<SyncMeta>('syncMeta').get(id)
     if(meta&&meta.version>=row.version)continue
     const pending=(await this.db.syncQueue.where('recordId').equals(row.record.id).toArray()).filter(e=>e.table===row.table)
     if(pending.length){
      const local=await this.db.records(row.table).get(row.record.id)
      if(local)await this.db.table<Conflict>('conflicts').put({id,table:row.table,recordId:row.record.id,local,cloud:row})
      continue
     }
     await this.db.records(row.table).put(row.record)
     await this.db.table('syncMeta').put({id,version:row.version})
     if(row.record.deletedAt)await this.db.trash.put({id,table:row.table,recordId:row.record.id,deletedAt:row.record.deletedAt})
     else await this.db.trash.delete(id)
    }
   })
  }finally{this.running=false}
 }
 async resolve(id:string,choice:'cloud'|'local'|'both'){
  const repo=new LocalRepository(this.db)
  await this.db.transaction('rw',[...domainTables,'syncQueue','syncMeta','conflicts','trash','snapshots'],async()=>{
   const c=await this.db.table<Conflict>('conflicts').get(id);if(!c)return
   const local=await this.db.records(c.table).get(c.recordId);if(!local)return
   const queue=(await this.db.syncQueue.where('recordId').equals(c.recordId).toArray()).filter(e=>e.table===c.table)
   await this.db.syncQueue.bulkDelete(queue.map(e=>e.id))
   await this.db.table('syncMeta').put({id,version:c.cloud.version})
   if(choice==='local')await repo.put(c.table,local)
   else {
    await this.db.records(c.table).put(c.cloud.record)
    if(c.cloud.record.deletedAt)await this.db.trash.put({id,table:c.table,recordId:c.recordId,deletedAt:c.cloud.record.deletedAt});else await this.db.trash.delete(id)
    if(choice==='both'){
     if(!['nodes','fragments','lyricsLines'].includes(c.table))throw new Error('このデータは両方保持に対応していません')
     const copy={...local,...newMeta()}
     if('position'in copy)copy.position={x:copy.position.x+40,y:copy.position.y+60}
     if('sectionId'in copy&&'order'in copy){
      const lines=(await this.db.records('lyricsLines').where('sectionId').equals(copy.sectionId).toArray()).filter(l=>!l.deletedAt).sort((a,b)=>a.order-b.order)
      const i=lines.findIndex(l=>l.id===c.recordId);const base=lines[i]?.order??copy.order;copy.order=(base+(lines[i+1]?.order??base+2))/2
     }
     await repo.put(c.table,copy)
    }
   }
   await this.db.table('conflicts').delete(id)
  })
 }
}
