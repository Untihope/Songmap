import {SyncEngine} from '../../data/sync/engine'
import {useSync} from '../../state/sync'
let current:SyncEngine|null=null
export const setSyncEngine=(engine:SyncEngine|null)=>{current=engine}
export const syncNow=async()=>{
 if(!current||!navigator.onLine)return
 const perform=async()=>{const engine=current;if(!engine)return;useSync.setState({state:'syncing',message:''});try{await engine.sync();if(current===engine)useSync.setState({state:'idle'})}catch(e){if(current===engine)useSync.setState({state:'error',message:e instanceof Error?e.message:'同期できませんでした'})}}
 if(navigator.locks)await navigator.locks.request('songmap-sync',perform);else await perform()
}
export const resolveConflict=async(id:string,choice:'local'|'cloud'|'both')=>{if(!current)throw new Error('ログインしてください');await current.resolve(id,choice);await syncNow()}

