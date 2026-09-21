import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { db } from '../local/database'
import { parseDomainRecord } from '../../domain/backup'
import type { DomainRecord, DomainTable } from '../../domain/models'
import type { CloudAdapter, CloudRow } from '../sync/engine'
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined
const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined
export const supabase=url&&key?createClient(url,key,{auth:{storage:{
 async getItem(key){return (await db.table('preferences').get('auth:'+key))?.value??null},
 async setItem(key,value){await db.table('preferences').put({id:'auth:'+key,value})},
 async removeItem(key){await db.table('preferences').delete('auth:'+key)},
}}}):null
function parseRow(input:unknown):CloudRow{
 const r=input as {entity_type:DomainTable;payload:unknown;version:number;mutation_id:string}
 if(!r||!Number.isSafeInteger(r.version)||typeof r.mutation_id!=='string')throw new Error('同期データが不正です')
 return {table:r.entity_type,record:parseDomainRecord(r.entity_type,r.payload),version:r.version,mutationId:r.mutation_id}
}
export class SupabaseAdapter implements CloudAdapter{
 constructor(private client:SupabaseClient){}
 async push(table:DomainTable,record:DomainRecord,expected:number,mutationId:string){
  const {data,error}=await this.client.rpc('songmap_push',{p_entity:table,p_id:record.id,p_payload:record,p_expected:expected,p_mutation:mutationId})
  if(error)throw new Error('同期できませんでした。変更はこの端末に保存されています。')
  if(!data||typeof data.ok!=='boolean')throw new Error('同期応答が不正です')
  return {ok:data.ok,row:parseRow(data.row)}
 }
 async pull(){
  const rows:CloudRow[]=[]
  for(let start=0;;start+=500){
   const {data,error}=await this.client.from('songmap_records').select('*').order('entity_type').order('record_id').range(start,start+499)
   if(error)throw new Error('クラウドから取得できませんでした。')
   rows.push(...data.map(parseRow));if(data.length<500)return rows
  }
 }
}
