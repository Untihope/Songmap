import {useEffect} from 'react'
import {supabase,SupabaseAdapter} from '../../data/cloud/supabase'
import {SyncEngine} from '../../data/sync/engine'
import {db} from '../../data/local/database'
import {repository} from '../../data/repositories/localRepository'
import {useSync} from '../../state/sync'
import {setSyncEngine,syncNow} from './runtime'
export function SyncProvider(){
 useEffect(()=>{
  if(!supabase)return
  const client=supabase;let disposed=false;let timer:ReturnType<typeof setTimeout>|undefined
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!disposed)void syncNow()},1000)}
  const apply=(user:{id:string;email?:string}|undefined)=>{
   if(disposed)return
   setSyncEngine(user?new SyncEngine(db,new SupabaseAdapter(client),user.id):null)
   useSync.setState({userId:user?.id??'',email:user?.email??'',state:user?'idle':'guest'})
   schedule()
  }
  void client.auth.getSession().then(({data})=>apply(data.session?.user))
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>apply(session?.user),0)})
  const unsubscribe=repository.subscribe(schedule)
  const interval=setInterval(schedule,15000)
  window.addEventListener('online',schedule);window.addEventListener('focus',schedule)
  return()=>{disposed=true;clearTimeout(timer);clearInterval(interval);subscription.unsubscribe();unsubscribe();window.removeEventListener('online',schedule);window.removeEventListener('focus',schedule);setSyncEngine(null)}
 },[])
 return null
}
