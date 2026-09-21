import {useRegisterSW} from 'virtual:pwa-register/react'
import {useSave} from '../../state/save'
export function UpdateNotice(){
 const {needRefresh:[needed,setNeeded],updateServiceWorker}=useRegisterSW()
 const {pending,writes,error}=useSave()
 if(!needed)return null
 return <div className="update-notice" role="status"><span>新しいバージョンを使えます</span><button disabled={!!pending.length||!!writes||error} onClick={()=>void updateServiceWorker(true)}>保存して更新</button><button onClick={()=>setNeeded(false)}>あとで</button></div>
}
