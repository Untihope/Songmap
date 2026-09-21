import { useSync } from '../state/sync'
import { useEffect,useState } from 'react'
import { useSave } from '../state/save'
export function SaveStatus(){
 const {pending,writes,error}=useSave();const sync=useSync();const [online,setOnline]=useState(navigator.onLine)
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 return <span className={'save-status '+(error?'error':'')} role="status">{error?'保存エラー · 再試行してください':pending.length||writes?'保存中…':online?sync.state==='error'?'同期エラー · 端末には保存済み':sync.state==='syncing'?'同期中…':sync.userId?'保存済み ✓':'保存済み ✓ · この端末':'オフライン · この端末に保存済み'}</span>
}
