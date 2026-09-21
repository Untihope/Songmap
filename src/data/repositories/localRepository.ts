import { useSave } from '../../state/save'
import Dexie from 'dexie'
import { db, type SongMapDatabase } from '../local/database'
import { domainTables, type DomainTable, type DomainTables, type DomainRecord } from '../../domain/models'
type Change = { table:DomainTable; before?:DomainRecord; after:DomainRecord }
export type Snapshot = { id:string; createdAt:string; records:{table:DomainTable;record:DomainRecord}[] }
export class LocalRepository {
  private past:Change[][]=[];private future:Change[][]=[];private version=0;private listeners=new Set<()=>void>()
  constructor(readonly database: SongMapDatabase = db) {}
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}
  getHistoryVersion=()=>this.version
  get canUndo(){return this.past.length>0} get canRedo(){return this.future.length>0}
  private emit(){this.version++;this.listeners.forEach(l=>l())}
  async put<K extends DomainTable>(table:K,record:DomainTables[K]):Promise<DomainTables[K]>{
    return this.atomic(async()=>{
      const previous=await this.database.records(table).get(record.id)
      const next={...record,revision:previous?previous.revision+1:1,updatedAt:new Date().toISOString()}
      await this.database.records(table).put(next)
      await this.database.syncQueue.put({id:crypto.randomUUID(),table,recordId:next.id,record:next,baseRevision:previous?.revision??0,createdAt:next.updatedAt})
      return next
    })
  }
  async patch<K extends DomainTable>(table:K,id:string,changes:Partial<DomainTables[K]>){
    return this.atomic(async()=>{
      const record=await this.database.records(table).get(id)
      if(!record)throw new Error('データが見つかりません')
      return this.put(table,{...record,...changes,id})
    })
  }
  private async all(){
    const result:Snapshot['records']=[]
    for(const table of domainTables)for(const record of await this.database.records(table).toArray())result.push({table,record})
    return result
  }
  async atomic<T>(work:()=>Promise<T>,history=true):Promise<T>{
    if(Dexie.currentTransaction?.db===this.database)return work()
    let changes:Change[]=[]
    useSave.setState(s=>({writes:s.writes+1}))
    const result=await this.database.transaction('rw',[...domainTables,'syncQueue','trash','snapshots'],async()=>{
      const before=await this.all()
      const result=await work()
      const after=await this.all()
      const previous=new Map(before.map(r=>[r.table+':'+r.record.id,r.record]))
      changes=after.filter(r=>JSON.stringify(previous.get(r.table+':'+r.record.id))!==JSON.stringify(r.record)).map(r=>({table:r.table,before:previous.get(r.table+':'+r.record.id),after:r.record}))
      if(changes.length){
        await this.database.table<Snapshot>('snapshots').put({id:crypto.randomUUID(),createdAt:new Date().toISOString(),records:before})
        const snapshots=await this.database.table<Snapshot>('snapshots').orderBy('createdAt').toArray()
        if(snapshots.length>5)await this.database.table('snapshots').bulkDelete(snapshots.slice(0,-5).map(s=>s.id))
      }
      return result
    }).catch(error=>{useSave.setState({error:true});throw error}).finally(()=>useSave.setState(s=>({writes:Math.max(0,s.writes-1)})))
    useSave.setState({error:false})
    if(history&&changes.length){this.past.push(changes);if(this.past.length>50)this.past.shift();this.future=[];this.emit()}
    return result
  }
  async remove<K extends DomainTable>(table:K,id:string){
    return this.atomic(async()=>{
      const deletedAt=new Date().toISOString()
      await this.patch(table,id,{deletedAt} as Partial<DomainTables[K]>)
      await this.database.trash.put({id:table+':'+id,table,recordId:id,deletedAt})
    })
  }
  async restore<K extends DomainTable>(table:K,id:string){
    return this.atomic(async()=>{
      await this.patch(table,id,{deletedAt:undefined} as Partial<DomainTables[K]>)
      await this.database.trash.delete(table+':'+id)
    })
  }
  async undo(){
    const changes=this.past.at(-1);if(!changes)return
    await this.atomic(async()=>{for(const c of [...changes].reverse()){
      if(c.before){const next=await this.put(c.table,c.before);if(next.deletedAt)await this.database.trash.put({id:c.table+':'+next.id,table:c.table,recordId:next.id,deletedAt:next.deletedAt});else await this.database.trash.delete(c.table+':'+next.id)}
      else await this.remove(c.table,c.after.id)
    }},false)
    this.past.pop();this.future.push(changes);this.emit()
  }
  async redo(){
    const changes=this.future.at(-1);if(!changes)return
    await this.atomic(async()=>{for(const c of changes){await this.put(c.table,c.after);if(!c.after.deletedAt)await this.database.trash.delete(c.table+':'+c.after.id)}},false)
    this.future.pop();this.past.push(changes);this.emit()
  }
  async recover(id:string){
    const snapshot=await this.database.table<Snapshot>('snapshots').get(id)
    if(!snapshot)throw new Error('復旧データが見つかりません')
    await this.atomic(async()=>{for(const {table,record}of snapshot.records){await this.put(table,record);if(!record.deletedAt)await this.database.trash.delete(table+':'+record.id)}})
  }
}
export const repository=new LocalRepository()

